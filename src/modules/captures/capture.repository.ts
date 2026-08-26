
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
}

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
            data.tags ?? null
        ]
    );

    return result.rows[0];
}

export async function findCapturesByUser(
    userId: string,
    limit: number,
    offset: number,
    categoryIds?: string[],
    search?: string,
    type?: string,
    tag?: string,
    sort: "newest" | "oldest" = "newest",
) {
    const values: unknown[] = [userId];


    let categoryFilter = "";
    let searchFilter = ""
    let typeFilter = ""
    let tagFilter = ""

    if (categoryIds?.length) {
        values.push(categoryIds);

        categoryFilter = `
            AND c.category_id = ANY($${values.length}::uuid[])
        `;
    }

    if (search) {
        values.push(`%${search}%`)

        searchFilter = `
            AND (
                c.title ILIKE $${values.length}
                OR c.description ILIKE $${values.length}
                OR c.url ILIKE $${values.length}
                OR c.content ILIKE $${values.length}
            )
        `
    }

    if (type) {
        values.push(type)

        typeFilter = `
            AND c.type = $${values.length}
        `
    }

    if (tag) {
        values.push(tag.toLowerCase())

        tagFilter = `
            AND $${values.length} = ANY(c.tags)
        `
    }

    const orderDirection = sort === "oldest" ? "ASC" : "DESC";


    const filterValues = [...values]

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
            c.updated_at
        FROM captures c
        LEFT JOIN capture_categories cc
            ON cc.id = c.category_id
        WHERE c.user_id = $1
        ${categoryFilter}
        ${searchFilter}
        ${typeFilter}
        ${tagFilter}
        ORDER BY c.created_at ${orderDirection}
        LIMIT $${limitParam}
        OFFSET $${offsetParam};
        `,
        values,
    );

    const countResult = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM captures c
        WHERE c.user_id = $1
        ${categoryFilter}
        ${searchFilter}
        ${typeFilter}
        ${tagFilter}
        `,
        filterValues
    )

    return {
        rows: result.rows,
        total: Number(countResult.rows[0].total)
    }
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
            c.updated_at
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

