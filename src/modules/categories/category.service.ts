import {
  createCategory,
  deleteCategory,
  findCategoryByName,
  listCategoriesByUser,
  updateCategory,
} from "./category.repository.js";

export async function getOrCreateCategory(userId: string, name: string) {
  const normalizedName = name.trim();
  const existing = await findCategoryByName(userId, normalizedName);

  return existing ?? createCategory(userId, normalizedName);
}

export function getCategories(userId: string) {
  return listCategoriesByUser(userId);
}

export async function createUserCategory(userId: string, name: string) {
  const normalizedName = name.trim();

  return createCategory(userId, normalizedName);
}

export async function updateUserCategory(
  categoryId: string,
  userId: string,
  name: string,
) {
  return updateCategory(categoryId, userId, name.trim());
}


export async function deleteUserCategory(
  categoryId: string,
  userId: string,
) {
  return deleteCategory(categoryId, userId);
}