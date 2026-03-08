export type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

export type PromptProcessingMode = "none" | "merge" | "semi-strict" | "strict" | "single-user";


export function processMessages(messages: ChatMessage[], mode: PromptProcessingMode): ChatMessage[] {
    switch (mode) {
        case "none":
            return messages;
        case "merge":
            return mergeConsecutive(messages);
        case "semi-strict":
            return semiStrict(messages);
        case "strict":
            return strict(messages);
        case "single-user":
            return singleUser(messages);
        default:
            return messages;
    }
}

function mergeConsecutive(messages: ChatMessage[]): ChatMessage[] {
    if (messages.length === 0) return [];

    const result: ChatMessage[] = [{ ...messages[0] }];

    for (let i = 1; i < messages.length; i++) {
        const last = result[result.length - 1];
        if (messages[i].role === last.role) {
            last.content += "\n\n" + messages[i].content;
        } else {
            result.push({ ...messages[i] });
        }
    }

    return result;
}

function semiStrict(messages: ChatMessage[]): ChatMessage[] {
    const merged = mergeConsecutive(messages);

    let hasSystem = false;
    return merged.filter((msg) => {
        if (msg.role === "system") {
            if (hasSystem) return false;
            hasSystem = true;
        }
        return true;
    });
}

function strict(messages: ChatMessage[]): ChatMessage[] {
    const semiResult = semiStrict(messages);

    const systemMsgs = semiResult.filter((m) => m.role === "system");
    const nonSystemMsgs = semiResult.filter((m) => m.role !== "system");

    if (nonSystemMsgs.length > 0 && nonSystemMsgs[0].role !== "user") {
        nonSystemMsgs.unshift({ role: "user", content: "[Start]" });
    }

    return [...systemMsgs, ...nonSystemMsgs];
}

function singleUser(messages: ChatMessage[]): ChatMessage[] {
    const combined = messages
        .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
        .join("\n\n");

    return [{ role: "user", content: combined }];
}
