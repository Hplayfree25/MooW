import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { userApiConfigurations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { getChatSessionAction } from "@/app/(chat)/actions";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { text, chatId } = await req.json();

        if (!text || text.length < 20) {
            return NextResponse.json({ error: "Text must be at least 20 characters" }, { status: 400 });
        }

        const configs = await db.select()
            .from(userApiConfigurations)
            .where(eq(userApiConfigurations.userId, session.user.id));

        if (configs.length === 0) {
            return NextResponse.json({ error: "No API configuration found" }, { status: 400 });
        }

        const activeConfig = configs.find(c => c.isDefault) || configs[0];

        let decryptedKey = activeConfig.apiKey;
        try {
            decryptedKey = decrypt(activeConfig.apiKey);
        } catch (e) {
            console.error("Failed to decrypt API key", e);
        }

        const apiUrl = activeConfig.apiUrl.endsWith('/chat/completions')
            ? activeConfig.apiUrl
            : `${activeConfig.apiUrl.replace(/\/$/, '')}/chat/completions`;

        let chatContext = "";
        let characterName = "";
        let userName = "User";

        if (chatId) {
            const chatRes = await getChatSessionAction(chatId);
            if (chatRes.success && chatRes.data) {
                characterName = chatRes.data.character?.characterName || "";
                userName = chatRes.data.userName || "User";

                const recentMessages = chatRes.data.messages.slice(-10);
                chatContext = recentMessages.map(msg => {
                    const role = msg.role === 'ai' ? characterName : userName;
                    const clean = msg.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                    return `${role}: ${clean}`;
                }).join("\n\n");
            }
        }

        const isRoleplay = !!characterName;

        const systemPrompt = isRoleplay
            ? `You are a creative writing enhancer for roleplay conversations. The user is chatting in-character with "${characterName}".

RULES:
1. REWRITE the user's message to be more expressive, vivid, and immersive
2. Add sensory details, emotions, body language, or internal thoughts where appropriate
3. Keep the same intent and meaning but make it significantly richer
4. Write in the same person/perspective as the original (first person if they used first person)
5. DO NOT include "${userName}:" prefix or any labels
6. DO NOT add quotation marks around the entire response
7. DO NOT use markdown formatting
8. DO NOT repeat the original message verbatim - actually enhance it
9. Output ONLY the enhanced roleplay message`
            : `You are a writing enhancer. Rewrite the user's message to be clearer, more polished, and more engaging.

RULES:
1. Significantly improve the text - don't just echo it back
2. Improve vocabulary, sentence structure, and flow
3. Keep the same core meaning and intent
4. DO NOT add quotation marks or markdown formatting
5. Output ONLY the enhanced text`;

        const userPrompt = chatContext
            ? `Recent conversation for context:\n---\n${chatContext}\n---\n\nThe user (${userName}) wants to send this next message. Rewrite it to be more expressive and fitting:\n${text}`
            : `Rewrite and enhance this message:\n${text}`;

        const payload = {
            model: activeConfig.modelName,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.8,
            max_tokens: Math.min(500, activeConfig.maxTokens || 2048),
            stream: true,
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${decryptedKey}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Enhance API Error:", response.status, errText);
            return NextResponse.json({
                error: "Failed to enhance text: " + response.statusText
            }, { status: response.status });
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
                let enhancedText = '';

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
                                        const content = delta.content || '';

                                        if (content) {
                                            enhancedText += content;
                                            const eventData = JSON.stringify({
                                                type: 'enhance',
                                                text: content,
                                                full: enhancedText
                                            });
                                            controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));
                                        }
                                    }
                                } catch (e) {
                                    console.warn("Parse error in enhance stream", e);
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
        console.error("Error in enhance endpoint:", error);
        return NextResponse.json({
            error: error.message || "Internal server error"
        }, { status: 500 });
    }
}