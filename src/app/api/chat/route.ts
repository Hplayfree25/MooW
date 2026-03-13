import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, dbChat } from "@/db";
import { characters, userApiConfigurations } from "@/db/schema";
import { chats } from "@/db/schema.logs";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { chatId, messages, isRegen, testMode, configId } = body;

        if (!chatId || !messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        const userId = session.user.id;
        let character: any = {
            characterName: "Test Character",
            characterBio: "",
            personality: "",
            scenario: "",
            exampleDialogue: ""
        };

        if (!testMode) {
            const chatRecords = await dbChat.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
            if (chatRecords.length === 0) {
                return NextResponse.json({ error: "Chat not found" }, { status: 404 });
            }
            const characterId = chatRecords[0].characterId;

            const charRecords = await db.select().from(characters).where(eq(characters.id, characterId));
            if (charRecords.length === 0) {
                return NextResponse.json({ error: "Character not found" }, { status: 404 });
            }
            character = charRecords[0];
        }

        let apiConfigs = await db.select().from(userApiConfigurations).where(eq(userApiConfigurations.userId, userId));
        if (apiConfigs.length === 0) {
            return NextResponse.json({ error: "No API configuration found" }, { status: 400 });
        }

        let activeConfig = apiConfigs.find(c => c.isDefault) || apiConfigs[0];

        if (testMode && configId) {
            const requestedConfig = apiConfigs.find(c => c.id === configId);
            if (!requestedConfig) {
                return NextResponse.json({ error: "Requested API configuration not found" }, { status: 404 });
            }
            activeConfig = requestedConfig;
        }

        let decryptedKeyStr = activeConfig.apiKey;
        try {
            decryptedKeyStr = decrypt(activeConfig.apiKey);
        } catch (e) {
            console.error("Failed to decrypt API key:", e);
        }

        let systemPrompt = `You are ${character.characterName}.
Description: ${character.characterBio}
Personality: ${character.personality}
Scenario: ${character.scenario}
${character.exampleDialogue ? `Example Dialogue:\n${character.exampleDialogue}` : ''}
Please stay in character and respond appropriately.`;

        if (activeConfig.forbiddenWords) {
            const words = activeConfig.forbiddenWords.split(",").map((w: string) => w.trim()).filter(Boolean);
            if (words.length > 0) {
                systemPrompt += `\n\nIMPORTANT: You must NEVER use these words or phrases in your responses: ${words.join(", ")}.`;
            }
        }

        const formattedMessages = [
            { role: "system", content: systemPrompt },
            ...messages.map((msg: any) => ({
                role: msg.role === 'ai' ? 'assistant' : msg.role,
                content: msg.content
            }))
        ];

        if (activeConfig.usePrefill && activeConfig.responsePrefill) {
            formattedMessages.push({
                role: "assistant",
                content: activeConfig.responsePrefill
            });
        }

        let apiUrl = activeConfig.apiUrl.endsWith('/chat/completions')
            ? activeConfig.apiUrl
            : `${activeConfig.apiUrl.replace(/\/$/, '')}/chat/completions`;

        if (apiUrl.startsWith('/api/v1') || apiUrl.includes('/api/v1')) {
            const baseUrl = req.nextUrl.origin;
            if (apiUrl.startsWith('/')) {
                apiUrl = `${baseUrl}${apiUrl}`;
            }
            if (process.env.urc_client_key) { //pake client urc biar kaga bypass
                decryptedKeyStr = process.env.urc_client_key;
            }
        }

        const payload: any = {
            model: activeConfig.modelName,
            messages: formattedMessages,
            temperature: activeConfig.temperature ?? 0.8,
            max_tokens: activeConfig.maxTokens ?? 2048,
            top_p: activeConfig.topP ?? 1.0,
            presence_penalty: activeConfig.repPenalty ?? 0,
            frequency_penalty: activeConfig.freqPenalty ?? 0,
            stream: true,
        };

        if (activeConfig.topK && activeConfig.topK > 0) {
            payload.top_k = activeConfig.topK;
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${decryptedKeyStr}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Upstream API Error:", response.status, errText);
            return NextResponse.json({ error: "Upstream API error: " + response.statusText }, { status: response.status });
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line.trim() === '') continue;
                            if (line.startsWith('data: ')) {
                                const dataStr = line.slice(6);
                                if (dataStr === '[DONE]') {
                                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                                    continue;
                                }

                                try {
                                    const parsed = JSON.parse(dataStr);
                                    if (parsed.choices && parsed.choices.length > 0) {
                                        const delta = parsed.choices[0].delta;

                                        const reasoningContent = delta.reasoning_content || '';
                                        const content = delta.content || '';

                                        if (reasoningContent) {
                                            const eventData = JSON.stringify({ type: 'reasoning', text: reasoningContent });
                                            controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));
                                        }

                                        if (content) {
                                            const eventData = JSON.stringify({ type: 'content', text: content });
                                            controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));
                                        }
                                    }
                                } catch (e) {
                                    console.warn("Error parsing chunk", line, e);
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error("Stream reading error:", err);
                    controller.error(err);
                } finally {
                    controller.close();
                    reader.releaseLock();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
