import { pool } from "../../db/client.js";

export async function findCategoryByName(userId: string, name: string) {
  const result = await pool.query(
    `SELECT * FROM capture_categories WHERE user_id = $1 AND name = $2;`,
    [userId, name],
  );

  return result.rows[0] ?? null;
}

export async function createCategory(userId: string, name: string) {
  const result = await pool.query(
    `INSERT INTO capture_categories (user_id, name)
     VALUES ($1, $2)
     ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
     RETURNING *;`,
    [userId, name],
  );

  return result.rows[0];
}

export async function listCategoriesByUser(userId: string) {
  const result = await pool.query(
    `SELECT * FROM capture_categories WHERE user_id = $1 ORDER BY name ASC;`,
    [userId],
  );

  return result.rows;
}

export async function updateCategory(
  categoryId: string,
  userId: string,
  name: string,
) {
  const result = await pool.query(
    `
    UPDATE capture_categories
    SET
      name = $1,
      updated_at = NOW()
    WHERE id = $2
      AND user_id = $3
    RETURNING *;
    `,
    [name.trim(), categoryId, userId],
  );

  return result.rows[0] ?? null;
}

export async function deleteCategory(
  categoryId: string,
  userId: string,
) {
  const result = await pool.query(
    `
    DELETE FROM capture_categories
    WHERE id = $1
      AND user_id = $2
    RETURNING *;
    `,
    [categoryId, userId],
  );

  return result.rows[0] ?? null;
}

export async function findCategoryById(
  categoryId: string,
  userId: string,
) {
  const result = await pool.query(
    `
    SELECT *
    FROM capture_categories
    WHERE id = $1
      AND user_id = $2;
    `,
    [categoryId, userId],
  );

  return result.rows[0] ?? null;
}