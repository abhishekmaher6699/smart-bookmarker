import { pool } from "../../db/client.js";


export async function findSearchResults(
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
  let searchFilter = "";
  let typeFilter = "";
  let tagFilter = "";

  if (categoryIds?.length) {
    values.push(categoryIds);

    categoryFilter = `
            AND c.category_id = ANY($${values.length}::uuid[])
        `;
  }

  if (search) {
    values.push(`%${search}%`);

    searchFilter = `
            AND (
                c.title ILIKE $${values.length}
                OR c.description ILIKE $${values.length}
                OR c.url ILIKE $${values.length}
                OR c.content ILIKE $${values.length}
            )
        `;
  }

  if (type) {
    values.push(type);

    typeFilter = `
            AND c.type = $${values.length}
        `;
  }

  if (tag) {
    values.push(tag.toLowerCase());

    tagFilter = `
            AND $${values.length} = ANY(c.tags)
        `;
  }

  const orderDirection = sort === "oldest" ? "ASC" : "DESC";

  const filterValues = [...values];

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
    filterValues,
  );

  return {
    rows: result.rows,
    total: Number(countResult.rows[0].total),
  };
}