import { pool } from "../../db/client.js";
import type { Pool, PoolClient } from "pg";

type BrowserSourceData = {
  captureId: string;
  title?: string | null | undefined;
  type?: string | null | undefined;
  html?: string | null | undefined;
  content?: string | null | undefined;
  description?: string | null | undefined;
  thumbnailUrl?: string | null | undefined;
  selectedText?: string | null | undefined;
};

export async function insertBrowserSource(
  data: BrowserSourceData,
  db: Pool | PoolClient = pool,
) {
  const result = await db.query(
    `
    INSERT INTO capture_sources (
      capture_id,
      source_type,
      title,
      type,
      html,
      content,
      description,
      thumbnail_url,
      selected_text
    )
    VALUES ($1, 'browser', $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
    `,
    [
      data.captureId,
      data.title ?? null,
      data.type ?? null,
      data.html ?? null,
      data.content ?? null,
      data.description ?? null,
      data.thumbnailUrl ?? null,
      data.selectedText ?? null,
    ],
  );

  return result.rows[0];
}

export async function findBrowserSource(captureId: string) {
  const result = await pool.query(
    `
        SELECT * 
        FROM capture_sources
        WHERE capture_id = $1
         AND source_type = 'browser'
        ORDER BY created_at DESC
        LIMIT 1;
        `,
    [captureId],
  );

  return result.rows[0] ?? null;
}
