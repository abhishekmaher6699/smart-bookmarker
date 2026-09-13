import { findSearchResults } from "./search.repository.js";

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