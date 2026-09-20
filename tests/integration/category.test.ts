import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "../../src/db/client.js";
import {
  createCategory,
  deleteCategory,
  findCategoryById,
  findCategoryByName,
  listCategoriesByUser,
  updateCategory,
} from "../../src/modules/categories/category.repository.js";
import { createUser } from "../../src/modules/auth/auth.repository.js";

describe("category repository", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM users");
  });

  it("should create a category for a user", async () => {
    const user = await createUser("category@example.com", "hashed-password");

    const category = await createCategory(user.id, "Programming");

    expect(category).toMatchObject({
      user_id: user.id,
      name: "Programming",
    });

    expect(category.id).toEqual(expect.any(String));
  });

  it("should return the existing category on duplicate name for the same user", async () => {
    const user = await createUser("duplicate@example.com", "hashed-password");

    const first = await createCategory(user.id, "Programming");
    const second = await createCategory(user.id, "Programming");

    expect(second.id).toBe(first.id);
    expect(second.name).toBe("Programming");
  });

  it("should find a category by name for a user", async () => {
    const user = await createUser(
      "find-category@example.com",
      "hashed-password",
    );

    const created = await createCategory(user.id, "Design");

    const found = await findCategoryByName(user.id, "Design");

    expect(found).toMatchObject({
      id: created.id,
      user_id: user.id,
      name: "Design",
    });
  });

  it("should list categories sorted by name", async () => {
    const user = await createUser(
      "list-category@example.com",
      "hashed-password",
    );

    await createCategory(user.id, "Zoology");
    await createCategory(user.id, "Backend");
    await createCategory(user.id, "Frontend");

    const categories = await listCategoriesByUser(user.id);

    expect(categories.map((category) => category.name)).toEqual([
      "Backend",
      "Frontend",
      "Zoology",
    ]);
  });

  it("should only find a category for the correct user", async () => {
    const user1 = await createUser(
      "category-user1@example.com",
      "hashed-password",
    );

    const user2 = await createUser(
      "category-user2@example.com",
      "hashed-password",
    );

    const category = await createCategory(user1.id, "Private");

    const found = await findCategoryById(category.id, user1.id);
    const wrongUser = await findCategoryById(category.id, user2.id);

    expect(found).toMatchObject({
      id: category.id,
      user_id: user1.id,
      name: "Private",
    });

    expect(wrongUser).toBeNull();
  });

  it("should update a category and trim the name", async () => {
    const user = await createUser(
      "update-category@example.com",
      "hashed-password",
    );

    const category = await createCategory(user.id, "Old Name");

    const updated = await updateCategory(category.id, user.id, "  New Name  ");

    expect(updated).toMatchObject({
      id: category.id,
      user_id: user.id,
      name: "New Name",
    });
  });

  it("should delete a category only for the correct user", async () => {
    const user1 = await createUser(
      "delete-user1@example.com",
      "hashed-password",
    );

    const user2 = await createUser(
      "delete-user2@example.com",
      "hashed-password",
    );

    const category = await createCategory(user1.id, "To Delete");

    const wrongUserDelete = await deleteCategory(category.id, user2.id);

    expect(wrongUserDelete).toBeNull();

    const deleted = await deleteCategory(category.id, user1.id);

    expect(deleted).toMatchObject({
      id: category.id,
      name: "To Delete",
    });

    const found = await findCategoryById(category.id, user1.id);

    expect(found).toBeNull();
  });
});
