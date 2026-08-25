import { env } from "../../config/env.js";
import { getGeminiClient } from "./gemini.client.js";

export async function summarizeCapture(input: {
    title: string | null;
    content: string | null;
}) {
    const content = input.content?.slice(0, 12000) ?? "";

    if (!content && !input.title) {
        return null;
    }

    const prompt = `
Summarize this bookmark.

Title:
${input.title ?? ""}

Content:
${content}

Rules:
- Give a concise summary.
- Focus on what the resource is about and its useful information.
- Do not add information that is not present.
- Keep it to 2-4 sentences.
`;

    const response = await getGeminiClient().models.generateContent({
        model: env.geminiModel,
        contents: prompt,
        config: {
            httpOptions: {
                timeout: env.geminiTimeoutMs,
                retryOptions: {
                    attempts: 2,
                    initialDelay: 0.5,
                    maxDelay: 1,
                    httpStatusCodes: [429, 500, 502, 503, 504],
                },
            },
        },
    });

    return response.text?.trim() || null;
}
