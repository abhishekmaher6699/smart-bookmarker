import { pool } from "../../db/client.js";
import type { Pool, PoolClient } from "pg";
import type { UpdateCaptureInput } from "./capture.schema.js";

type CreateCaptureData = {
  userID: string;
  url: string;
  title: string | null;
  type: string | null;
  categoryId?: string | null;
  tags?: string[] | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  content?: string | null;
};

export async function insertCapture(
  data: CreateCaptureData,
  db: Pool | PoolClient = pool,
) {
  const result = await db.query(
    `
        INSERT INTO captures (
            user_id,
            url,
            title,
            type,
            description,
            thumbnail_url,
            content,
            category_id,
            tags
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
        `,
    [
      data.userID,
      data.url,
      data.title,
      data.type,
      data.description ?? null,
      data.thumbnailUrl ?? null,
      data.content ?? null,
      data.categoryId ?? null,
      data.tags ?? null,
    ],
  );

  return result.rows[0];
}


export async function findCaptureById(captureId: string, userId: string) {
  const result = await pool.query(
    `
        SELECT
            c.id,
            c.user_id,
            c.url,
            c.title,
            c.type,
            c.description,
            c.thumbnail_url,
            c.content,
            c.summary,
            c.category_id,
            cc.name AS category,
            c.tags,
            c.created_at,
            c.updated_at
        FROM captures c
        LEFT JOIN capture_categories cc
            ON cc.id = c.category_id
        WHERE c.id = $1
          AND c.user_id = $2;
        `,
    [captureId, userId],
  );

  return result.rows[0] ?? null;
}

export async function findCaptureByUrl(userId: string, url: string, excludeCaptureId?: string,) {
  
  const values: unknown[] = [userId, url]

  let excludeFilter = ""

  if (excludeCaptureId) {
    values.push(excludeCaptureId)

    excludeFilter = "AND c.id <> $${values.length}"
  }
  
  
  const result = await pool.query(
    `
        SELECT
            c.id,
            c.user_id,
            c.url,
            c.title,
            c.type,
            c.description,
            c.thumbnail_url,
            c.content,
            c.summary,
            c.category_id,
            cc.name AS category,
            c.tags,
            c.created_at,
            c.updated_at
        FROM captures c
        LEFT JOIN capture_categories cc
            ON cc.id = c.category_id
        WHERE c.user_id = $1
          AND c.url = $2
          ${excludeFilter};
        `,
    values,
  );

  return result.rows[0] ?? null;
}

export async function updateCaptureById(
  captureId: string,
  userId: string,
  input: UpdateCaptureInput,
) {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.url !== undefined) {
    fields.push(`url = $${values.length + 1}`);
    values.push(input.url);
  }

  if (input.categoryId !== undefined) {
    fields.push(`category_id = $${values.length + 1}`);
    values.push(input.categoryId);
  }

  if (input.title !== undefined) {
    fields.push(`title = $${values.length + 1}`);
    values.push(input.title);
  }

  if (input.type !== undefined) {
    fields.push(`type = $${values.length + 1}`);
    values.push(input.type);
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(captureId);
  const captureIdParam = values.length;

  values.push(userId);
  const userIdParam = values.length;

  const result = await pool.query(
    `
        UPDATE captures
        SET ${fields.join(", ")}
        WHERE id = $${captureIdParam}
          AND user_id = $${userIdParam}
        RETURNING *;
        `,
    values,
  );

  return result.rows[0] ?? null;
}

export async function deleteCaptureById(captureId: string, userId: string) {
  const result = await pool.query(
    `
        DELETE FROM captures
        WHERE id = $1
         AND user_id = $2
        RETURNING id;
        `,
    [captureId, userId],
  );

  return result.rows[0] ?? null;
}

export async function findCaptureForEnrichment(captureId: string) {
  const result = await pool.query(
    `
    SELECT
      id,
      user_id,
      url,
      title,
      type,
      description,
      thumbnail_url,
      content,
      category_id,
      tags,
      summary
    FROM captures
    WHERE id = $1;
    `,
    [captureId],
  );

  return result.rows[0] ?? null;
}
