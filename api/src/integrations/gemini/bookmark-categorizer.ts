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
  return `You are an intelligent bookmark categorization system.

Your job is to understand what this bookmark is primarily about and organize it
into ONE useful category and 1-5 specific tags.

Bookmarks can belong to ANY domain: technology, programming, travel, food,
cooking, finance, business, education, science, fitness, health,
entertainment, books, movies, shopping, hobbies, lifestyle, news, research,
or any other subject.

EXISTING CATEGORIES:
${input.categories.length > 0 ? input.categories.join(", ") : "None"}

BOOKMARK:
Title: ${input.title ?? ""}
Description: ${input.description ?? ""}
Type: ${input.type ?? ""}
Content:
${input.content?.slice(0, 12_000) ?? ""}

CATEGORY DECISION:

First understand the bookmark's MAIN SUBJECT.

Then decide whether an existing category is genuinely appropriate.

IMPORTANT:
- Do NOT force the bookmark into an existing category.
- Reuse an existing category ONLY when it is a strong semantic match.
- If an existing category is only loosely related, create a new category.
- A category should describe the subject of the bookmark, not its format.
- Categories should be broad enough to contain multiple related bookmarks,
  but specific enough to distinguish meaningfully different subjects.
- Different subjects SHOULD be allowed to have different categories.
- Do not merge unrelated subjects simply because they belong to the same
  broad domain.
- Avoid duplicate categories with essentially the same meaning.
- If two existing categories are similar, choose the one that best matches
  the bookmark.
- If no existing category fits well, CREATE a new category.
- Do not hesitate to create a new category when the subject deserves one.
- Category names should be concise, normally 1-3 words.
- Use lowercase category names.
- Never use "article", "video", "pdf", "image", "website", or "youtube"
  as a category.

EXAMPLES:

Existing:
["travel", "food", "technology"]

Bookmark:
"7-Day Hiking Route Through the Swiss Alps"

→ category: "travel"
→ tags: ["hiking", "switzerland", "alps"]

Existing:
["travel", "food", "technology"]

Bookmark:
"Complete Guide to Sourdough Fermentation"

→ category: "cooking"
→ tags: ["sourdough", "fermentation", "bread"]

Do NOT force this into "food" simply because cooking is related to food.

Existing:
["travel", "food", "technology"]

Bookmark:
"Understanding Personal Finance and Index Funds"

→ category: "finance"
→ tags: ["personal finance", "index funds", "investing"]

Do NOT force this into an unrelated existing category.

TAG RULES:

- Generate 1-5 tags.
- Tags should be more specific than the category.
- Tags should identify important subjects, concepts, entities, or themes.
- Avoid generic tags such as "article", "resource", "information",
  "interesting", or "learning".
- Do not repeat the category as a tag.
- Avoid synonymous or repetitive tags.
- Use lowercase tags.

QUALITY RULE:

Prefer a clean and meaningful category structure over minimizing the number
of categories.

It is better to create a genuinely useful new category than to incorrectly
place a bookmark into an existing category.

Return ONLY valid JSON:

{
  "category": "category name",
  "tags": ["tag1", "tag2"]
}`;
}
