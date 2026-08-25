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
