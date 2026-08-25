import { env } from "../../config/env.js";
import { categorizationSchema } from "../../modules/categories/category.schema.js";
import { getGeminiClient } from "./gemini.client.js";

export type BookmarkCategorizationInput = {
  title: string | null;
  description: string | null;
  type: string | null;
  content: string | null;
  categories: string[];
};

export async function categorizeBookmark(input: BookmarkCategorizationInput) {
  const response = await getGeminiClient().models.generateContent({
    model: env.geminiModel,
    contents: buildPrompt(input),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          category: { type: "string" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["category", "tags"],
      },
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

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty categorization response");
  }

  return categorizationSchema.parse(JSON.parse(text));
}

function buildPrompt(input: BookmarkCategorizationInput): string {
  return `Categorize this bookmark.

Existing categories: ${input.categories.join(", ") || "None"}
Title: ${input.title ?? ""}
Description: ${input.description ?? ""}
Type: ${input.type ?? ""}
Content: ${input.content?.slice(0, 12_000) ?? ""}

Rules:
- Reuse an existing category when it is a good fit.
- Create a category only when no existing category fits.
- Keep the category short and meaningful.
- Return 1 to 5 specific, lowercase tags.`;
}
