import { generateEmbedding } from "../../integrations/gemini/embedder.js";

export function buildEmbeddingText(input: {
  title?: string | null;
  description?: string | null;
  tags?: string[] | null;
  content?: string | null;
}) {
  return [
    input.title ? `Title: ${input.title}` : "",
    input.description ? `Description: ${input.description}` : "",
    input.tags?.length ? `Tags: ${input.tags.join(", ")}` : "",
    input.content ? `Content: ${input.content}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function generateQueryEmbedding(query: string) {
  return generateEmbedding(
    `Represent this search query for retrieving relevant documents:\n${query}`,
  );
}