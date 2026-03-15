export async function _z_sum_rz(rawRz: string, apiKey: string, baseUrl: string, isFirstChunk: boolean = false): Promise<string> {
    const basePrompt = process.env.RZ_SUM_PROMPT || "Summarize the following reasoning process into EXACTLY ONE concise paragraph.";
    const prompt = `${basePrompt}

Raw Thoughts:
${rawRz}`;

    try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'glm-4-flash',
                messages: [{ role: 'user', content: prompt }],
                stream: false
            })
        });
        if (!res.ok) return "Thinking deeply about the situation...";
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "Organizing thoughts...";
    } catch (e) {
        return "Thinking deeply...";
    }
}
