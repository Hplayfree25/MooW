"use server";

import { db, dbChat } from "@/db";
import { characters, userApiConfigurations, users } from "@/db/schema";
import { chats, messages } from "@/db/schema.logs";
import { auth } from "@/auth";
import { eq, desc, asc, and, count } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { revalidatePath } from "next/cache";

export async function createChatSessionAction(characterId: string, customChatId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = session.user.id;
        await dbChat.insert(chats).values({
            id: customChatId,
            userId: userId,
            characterId: characterId,
        });

        const charData = await db.select().from(characters).where(eq(characters.id, characterId));
        if (charData.length > 0) {
            const firstMsgContent = charData[0].firstMessages && charData[0].firstMessages.length > 0
                ? charData[0].firstMessages[0]
                : "Hello! Let's start chatting.";

            await dbChat.insert(messages).values({
                id: crypto.randomUUID(),
                chatId: customChatId,
                role: "ai",
                content: firstMsgContent,
            });
        }

        revalidatePath("/chats");
        return { success: true, chatId: customChatId };
    } catch (e: any) {
        console.error("Error creating chat session:", e);
        return { success: false, error: e.message };
    }
}

export async function addChatMessageAction(chatId: string, role: string, content: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        let parsedReasoning = "";
        let parsedContent = content;
        const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
        if (thinkMatch) {
            parsedReasoning = thinkMatch[1].trim();
            parsedContent = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
        }

        const messageId = crypto.randomUUID();
        await dbChat.insert(messages).values({
            id: messageId,
            chatId: chatId,
            role: role,
            content: parsedContent,
            versions: [{ reasoning: parsedReasoning, content: parsedContent }],
            activeVersionIndex: 0,
        });
        await dbChat.update(chats)
            .set({ updatedAt: new Date() })
            .where(eq(chats.id, chatId));

        return { success: true, messageId: messageId };
    } catch (e: any) {
        console.error("Error adding chat message:", e);
        return { success: false, error: e.message };
    }
}

export async function addMessageVersionAction(messageId: string, versionObj: { reasoning: string; content: string }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const msgRecords = await dbChat.select().from(messages).where(eq(messages.id, messageId));
        if (msgRecords.length === 0) {
            return { success: false, error: "Message not found" };
        }

        const msg = msgRecords[0];
        const existingVersions = msg.versions || [{ reasoning: "", content: msg.content }];
        const newVersions = [...existingVersions, versionObj];

        await dbChat.update(messages)
            .set({
                versions: newVersions,
                activeVersionIndex: newVersions.length - 1,
                content: versionObj.content
            })
            .where(eq(messages.id, messageId));

        return { success: true };
    } catch (e: any) {
        console.error("Error adding message version:", e);
        return { success: false, error: e.message };
    }
}

export async function updateMessageVersionAction(messageId: string, versionIndex: number, versionObj: { reasoning: string; content: string }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const msgRecords = await dbChat.select().from(messages).where(eq(messages.id, messageId));
        if (msgRecords.length === 0) {
            return { success: false, error: "Message not found" };
        }

        const msg = msgRecords[0];
        const versions = [...(msg.versions || [{ reasoning: "", content: msg.content }])];

        if (versionIndex < 0 || versionIndex >= versions.length) {
            return { success: false, error: "Invalid version index" };
        }

        versions[versionIndex] = versionObj;

        await dbChat.update(messages)
            .set({
                versions: versions,
                content: versionIndex === msg.activeVersionIndex ? versionObj.content : msg.content
            })
            .where(eq(messages.id, messageId));

        return { success: true };
    } catch (e: any) {
        console.error("Error updating message version:", e);
        return { success: false, error: e.message };
    }
}

export async function changeActiveVersionAction(messageId: string, index: number) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const msgRecords = await dbChat.select().from(messages).where(eq(messages.id, messageId));
        if (msgRecords.length === 0) {
            return { success: false, error: "Message not found" };
        }

        const msg = msgRecords[0];
        const versions: any[] = msg.versions || [{ reasoning: "", content: msg.content }];

        if (index < 0 || index >= versions.length) {
            return { success: false, error: "Invalid version index" };
        }

        const activeVersion = versions[index];
        const syncContent = typeof activeVersion === 'string' ? activeVersion : activeVersion.content;

        await dbChat.update(messages)
            .set({
                activeVersionIndex: index,
                content: syncContent
            })
            .where(eq(messages.id, messageId));

        return { success: true };
    } catch (e: any) {
        console.error("Error changing active version:", e);
        return { success: false, error: e.message };
    }
}

export async function getChatSessionAction(chatId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = session.user.id;
        const chatRecords = await dbChat.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
        if (chatRecords.length === 0) {
            return { success: false, error: "Chat not found or unauthorized" };
        }
        const chatData = chatRecords[0];
        const charRecords = await db.select().from(characters).where(eq(characters.id, chatData.characterId));
        if (charRecords.length === 0) {
            return { success: false, error: "Character not found" };
        }
        const characterData = charRecords[0];
        const msgList = await dbChat.select().from(messages).where(eq(messages.chatId, chatId)).orderBy(asc(messages.createdAt));

        const userRecords = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        const userName = userRecords[0]?.name || userRecords[0]?.username || session.user?.name || "User";

        return {
            success: true,
            data: {
                chat: chatData,
                character: characterData,
                messages: msgList,
                userName,
            }
        };
    } catch (e: any) {
        console.error("Error getting chat session:", e);
        return { success: false, error: e.message };
    }
}

export async function getUserChatHistoryAction() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = session.user.id;

        const userChats = await dbChat.select().from(chats)
            .where(eq(chats.userId, userId))
            .orderBy(desc(chats.updatedAt));

        if (userChats.length === 0) return { success: true, data: [] };

        const characterIds = [...new Set(userChats.map(c => c.characterId))];

        const charDataList = [];
        for (const cid of characterIds) {
            const res = await db.select().from(characters).where(eq(characters.id, cid)).limit(1);
            if (res[0]) charDataList.push(res[0]);
        }
        const charMap = new Map();
        charDataList.forEach(c => charMap.set(c.id, c));

        const grouped = new Map();
        for (const chat of userChats) {
            const countResult = await dbChat.select({ value: count() }).from(messages).where(eq(messages.chatId, chat.id));
            const msgCount = countResult[0]?.value || 0;
            const charRef = charMap.get(chat.characterId);
            if (!charRef) continue;

            if (!grouped.has(chat.characterId)) {
                grouped.set(chat.characterId, {
                    characterId: chat.characterId,
                    characterName: charRef.characterName,
                    characterImageUrl: charRef.imageUrl,
                    characterDescription: charRef.characterBio,
                    creatorId: charRef.creatorId,
                    totalMessages: 0,
                    latestUpdate: chat.updatedAt,
                    chats: []
                });
            }

            const group = grouped.get(chat.characterId);
            group.totalMessages += msgCount;

            const chatTime = chat.updatedAt ? new Date(chat.updatedAt).getTime() : 0;
            const groupTime = group.latestUpdate ? new Date(group.latestUpdate).getTime() : 0;
            if (chatTime > groupTime) {
                group.latestUpdate = chat.updatedAt;
            }
            group.chats.push({
                id: chat.id,
                summary: chat.summary,
                chatMemory: chat.chatMemory,
                updatedAt: chat.updatedAt,
                messageCount: msgCount
            });
        }

        const result = Array.from(grouped.values()).sort((a: any, b: any) => {
            const timeB = b.latestUpdate ? new Date(b.latestUpdate).getTime() : 0;
            const timeA = a.latestUpdate ? new Date(a.latestUpdate).getTime() : 0;
            return timeB - timeA;
        });
        return { success: true, data: result };
    } catch (e: any) {
        console.error("Error getting user chat history:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteMessagesAction(chatId: string, messageIds: string[]) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const chatRow = await dbChat.select().from(chats).where(eq(chats.id, chatId)).limit(1);
        if (!chatRow.length || chatRow[0].userId !== session.user.id) {
            return { success: false, error: "Chat not found or not authorized." };
        }

        if (!messageIds || messageIds.length === 0) {
            return { success: true };
        }

        const orConditions = messageIds.map(id => eq(messages.id, id));
        let combinedCondition;
        if (orConditions.length === 1) {
            combinedCondition = orConditions[0];
        } else {
            combinedCondition = orConditions[0];
            for (let i = 1; i < orConditions.length; i++) {
                combinedCondition = require('drizzle-orm').or(combinedCondition, orConditions[i]);
            }
        }

        await dbChat.delete(messages).where(
            and(
                eq(messages.chatId, chatId),
                combinedCondition
            )
        );

        return { success: true };
    } catch (e: any) {
        console.error("Error deleting messages:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteChatSessionAction(chatId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const chatRow = await dbChat.select().from(chats).where(eq(chats.id, chatId)).limit(1);
        if (!chatRow.length || chatRow[0].userId !== session.user.id) {
            return { success: false, error: "Chat not found or not authorized." };
        }
        await dbChat.delete(messages).where(eq(messages.chatId, chatId));
        await dbChat.delete(chats).where(eq(chats.id, chatId));

        return { success: true };
    } catch (e: any) {
        console.error("Error deleting chat session:", e);
        return { success: false, error: e.message };
    }
}

export async function getApiConfigsAction() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const configs = await db.select().from(userApiConfigurations).where(eq(userApiConfigurations.userId, session.user.id));
        return { success: true, data: configs };
    } catch (e: any) {
        console.error("Error fetching API configs:", e);
        return { success: false, error: e.message };
    }
}

export async function updateChatMemoryAction(chatId: string, chatMemory: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const chatRow = await dbChat.select().from(chats).where(eq(chats.id, chatId)).limit(1);
        if (!chatRow.length || chatRow[0].userId !== session.user.id) {
            return { success: false, error: "Chat not found or not authorized." };
        }

        await dbChat.update(chats)
            .set({ chatMemory, updatedAt: new Date() })
            .where(eq(chats.id, chatId));

        return { success: true };
    } catch (e: any) {
        console.error("Error updating chat memory", e);
        return { success: false, error: e.message };
    }
}

export async function updateApiParametersAction(configId: string, params: { temperature: number, maxTokens: number, contextSize: number, topP: number, topK: number, repPenalty: number, freqPenalty: number, forbiddenWords: string, responsePrefill: string, usePrefill: boolean }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const configRow = await db.select().from(userApiConfigurations).where(eq(userApiConfigurations.id, configId)).limit(1);
        if (!configRow.length || configRow[0].userId !== session.user.id) {
            return { success: false, error: "Config not found or not authorized." };
        }

        await db.update(userApiConfigurations)
            .set({
                temperature: params.temperature,
                maxTokens: params.maxTokens,
                contextSize: params.contextSize,
                topP: params.topP,
                topK: params.topK,
                repPenalty: params.repPenalty,
                freqPenalty: params.freqPenalty,
                forbiddenWords: params.forbiddenWords,
                responsePrefill: params.responsePrefill,
                usePrefill: params.usePrefill,
                updatedAt: new Date()
            })
            .where(eq(userApiConfigurations.id, configId));

        return { success: true };
    } catch (e: any) {
        console.error("Error updating API parameters", e);
        return { success: false, error: e.message };
    }
}

export async function generateChatMemorySummaryAction(chatId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }
        const userId = session.user.id;

        const chatRow = await dbChat.select().from(chats).where(eq(chats.id, chatId)).limit(1);
        if (!chatRow.length || chatRow[0].userId !== userId) {
            return { success: false, error: "Chat not found or not authorized." };
        }

        const characterId = chatRow[0].characterId;
        const charRow = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
        const characterName = charRow.length > 0 ? charRow[0].characterName : "the AI Character";
        const characterBio = charRow.length > 0 ? charRow[0].characterBio : "";

        const recentMessages = await dbChat.select()
            .from(messages)
            .where(eq(messages.chatId, chatId))
            .orderBy(desc(messages.createdAt))
            .limit(30);

        if (recentMessages.length === 0) {
            return { success: false, error: "No messages to summarize yet." };
        }

        recentMessages.reverse();

        const conversationText = recentMessages.map(msg => {
            const cleanContent = msg.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            return `${msg.role === 'user' ? 'User' : 'AI'}: ${cleanContent}`;
        }).join("\n\n");

        let apiConfigs = await db.select().from(userApiConfigurations).where(eq(userApiConfigurations.userId, userId));
        if (apiConfigs.length === 0) {
            return { success: false, error: "No API configuration found." };
        }
        let activeConfig = apiConfigs.find(c => c.isDefault) || apiConfigs[0];

        let decryptedKeyStr = activeConfig.apiKey;
        try { decryptedKeyStr = decrypt(activeConfig.apiKey); } catch (e) { }

        const apiUrl = activeConfig.apiUrl.endsWith('/chat/completions')
            ? activeConfig.apiUrl
            : `${activeConfig.apiUrl.replace(/\/$/, '')}/chat/completions`;

        const payload = {
            model: activeConfig.modelName,
            messages: [
                { role: "system", content: `You are a helpful assistant. Your task is to summarize the following conversation into a concise format suitable for 'chat memory' or 'long-term context'. Extract the user's details, main preferences, and key events of the current storyline. The conversation is between a User and an AI roleplaying as "${characterName}" (${characterBio}). Keep the summary focused on what ${characterName} needs to remember. Output only the summary text without any surrounding formatting.` },
                { role: "user", content: `Conversation:\n\n${conversationText}` }
            ],
            temperature: 0.3,
            max_tokens: 500,
        };

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
            console.error("Summary API Error:", response.status, errText);
            return { success: false, error: "Failed to generate summary: " + response.statusText };
        }

        const data = await response.json();
        const summaryText = data.choices?.[0]?.message?.content || "";

        if (summaryText) {
            await dbChat.update(chats)
                .set({ chatMemory: summaryText, updatedAt: new Date() })
                .where(eq(chats.id, chatId));

            return { success: true, memoryText: summaryText };
        }

        return { success: false, error: "Empty summary received from AI API." };
    } catch (e: any) {
        console.error("Error generating memory summary", e);
        return { success: false, error: e.message };
    }
}
