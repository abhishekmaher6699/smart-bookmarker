import { pool } from "../../db/client.js";


export async function upsertSearchDocument(captureId: string) {
  const result = await pool.query(
    `
      INSERT INTO capture_search_documents (
        capture_id,
        search_document,
        indexed_at
      )
      SELECT
        c.id,
        setweight(
          to_tsvector('english', COALESCE(c.title, '')),
          'A'
        )
        ||
        setweight(
          to_tsvector(
            'english',
            COALESCE(array_to_string(c.tags, ' '), '')
          ),
          'B'
        )
        ||
        setweight(
          to_tsvector('english', COALESCE(c.description, '')),
          'C'
        )
        ||
        setweight(
          to_tsvector('english', COALESCE(c.content, '')),
          'D'
        )
        ||
        setweight(
          to_tsvector('english', COALESCE(c.url, '')),
          'D'
        ),
        NOW()
      FROM captures c
      WHERE c.id = $1
      ON CONFLICT (capture_id)
      DO UPDATE SET
        search_document = EXCLUDED.search_document,
        indexed_at = NOW()
      RETURNING *;
    `,
    [captureId],
  );

  return result.rows[0] ?? null;
}


export async function updateSearchEmbedding(
    captureId: string,
    embedding: number[]
) {
    const result = await pool.query(
        `
          UPDATE capture_search_documents
          SET
            embedding = $1::vector,
            indexed_at = NOW()
          WHERE capture_id = $2
          RETURNING capture_id;
        `,
        [JSON.stringify(embedding), captureId]
    )

    return result.rows[0] ?? null
}