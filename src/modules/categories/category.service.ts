import {
  createCategory,
  findCategoryByName,
  listCategoriesByUser,
} from "./category.repository.js";

export async function getOrCreateCategory(userId: string, name: string) {
  const normalizedName = name.trim();
  const existing = await findCategoryByName(userId, normalizedName);

  return existing ?? createCategory(userId, normalizedName);
}

export function getCategories(userId: string) {
  return listCategoriesByUser(userId);
}
