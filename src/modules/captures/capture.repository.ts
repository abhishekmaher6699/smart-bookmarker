
import { pool } from "../../db/client.js";
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
    enrichmentStatus?: "pending" | "processing" | "completed" | "failed";
}

export async function insertCapture(data: CreateCaptureData) {
    const result = await pool.query(
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
            tags,
            enrichment_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
            data.enrichmentStatus ?? "pending"
        ]
    );

    return result.rows[0];
}

export async function findCapturesByUser(
    userId: string,
    limit: number,
    offset: number,
    categoryIds?: string[],
) {
    const values: unknown[] = [userId];
    let categoryFilter = "";

    if (categoryIds?.length) {
        values.push(categoryIds);

        categoryFilter = `
            AND c.category_id = ANY($${values.length}::uuid[])
        `;
    }

    values.push(limit);
    const limitParam = values.length;

    values.push(offset);
    const offsetParam = values.length;

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
            c.updated_at,
            c.enrichment_status
        FROM captures c
        LEFT JOIN capture_categories cc
            ON cc.id = c.category_id
        WHERE c.user_id = $1
        ${categoryFilter}
        ORDER BY c.created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam};
        `,
        values,
    );

    return result.rows;
}

export async function findCaptureById(
    captureId: string,
    userId: string
) {
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
            c.updated_at,
            c.enrichment_status
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

export async function findCaptureByUrl(
    userId: string,
    url: string,
) {
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
            c.updated_at,
            c.enrichment_status
        FROM captures c
        LEFT JOIN capture_categories cc
            ON cc.id = c.category_id
        WHERE c.user_id = $1
          AND c.url = $2;
        `,
        [userId, url],
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


export async function deleteCaptureById(
    captureId: string,
    userId: string
) {
    const result = await pool.query(
        `
        DELETE FROM captures
        WHERE id = $1
         AND user_id = $2
        RETURNING id;
        `,
        [captureId, userId],
    )

    return result.rows[0] ?? null
}

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

export async function updateEnrichmentStatus(
    captureId: string,
    status: "processing" | "completed" | "failed",
) {
    const result = await pool.query(
        `
        UPDATE captures
        SET
            enrichment_status = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *;
        `,
        [status, captureId],
    );

    return result.rows[0] ?? null;
}

export async function claimEnrichment(
    captureId: string,
) {
    const result = await pool.query(
        `
        UPDATE captures
        SET
            enrichment_status = 'processing',
            updated_at = NOW()
        WHERE id = $1
          AND enrichment_status IN ('pending', 'failed')
        RETURNING *;
        `,
        [captureId],
    );

    return result.rows[0] ?? null;
}
