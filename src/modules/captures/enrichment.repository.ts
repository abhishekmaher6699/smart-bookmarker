import { pool } from "../../db/client.js";

export async function updateCaptureEnrichment(
    captureId: string,
    data: {
        title: string | null;
        type: string | null;
        description: string | null;
        thumbnailUrl: string | null;
        content: string | null;
        categoryId: string;
        tags: string[];
    },
) {
    const result = await pool.query(
        `
        UPDATE captures
        SET
            title = $1,
            type = $2,
            description = $3,
            thumbnail_url = $4,
            content = $5,
            category_id = $6,
            tags = $7,
            updated_at = NOW()
        WHERE id = $8
        RETURNING *;
        `,
        [
            data.title,
            data.type,
            data.description,
            data.thumbnailUrl,
            data.content,
            data.categoryId,
            data.tags,
            captureId,
        ],
    );

    return result.rows[0] ?? null;
}

export async function updateCaptureSummary(
    captureId: string,
    summary: string | null,
) {
    const result = await pool.query(
        `
        UPDATE captures
        SET
            summary = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *;
        `,
        [summary, captureId],
    );

    return result.rows[0] ?? null;
}

