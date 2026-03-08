export function parseReasoning(content: string): { reasoning: string | null; mainContent: string } {
    if (!content) {
        return { reasoning: null, mainContent: "" };
    }

    const thinkRegex = /<think>([\s\S]*?)<\/think>/i;
    const match = content.match(thinkRegex);

    if (match) {
        const reasoning = match[1].trim();
        const mainContent = content.replace(thinkRegex, "").trim();
        return { reasoning, mainContent };
    }

    return { reasoning: null, mainContent: content.trim() };
}
