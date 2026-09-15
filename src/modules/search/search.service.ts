import { generateQueryEmbedding } from "./search-embedding.js";
import { findSearchResults, findSemanticSearchResults } from "./search.repository.js";

export async function searchCaptures(
  userId: string,
  limit: number,
  offset: number,
  categoryIds?: string[],
  search?: string,
  type?: string,
  tag?: string,
  sort: "newest" | "oldest" = "newest",
) {
  return findSearchResults(
    userId,
    limit,
    offset,
    categoryIds,
    search,
    type,
    tag,
    sort,
  );
}


export async function semanticSearchCaptures(
  userId: string,
  query: string,
  limit: number,
  offset: number,
) {
  const queryEmbedding = await generateQueryEmbedding(query);

  return findSemanticSearchResults(
    userId,
    queryEmbedding,
    limit,
    offset,
  );
}