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
  const values: unknown[] = [userId, search ?? ""];
  const searchParam = 2;

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
    searchFilter = `
      AND (
        csd.search_document @@ websearch_to_tsquery(
          'english',
          $${searchParam}
        )
        OR c.title %> $${searchParam}
        OR c.description %> $${searchParam}
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
  const orderBy = search
    ? `search_rank DESC, c.created_at ${orderDirection}`
    : `c.created_at ${orderDirection}`;

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
            c.updated_at,
            
            CASE
              WHEN $${searchParam} <> ''
              THEN
                CASE
                  WHEN csd.search_document @@ websearch_to_tsquery(
                    'english',
                    $${searchParam}
                  )
                  THEN ts_rank(
                    ARRAY[0.2, 0.5, 0.8, 1.0],
                    csd.search_document,
                    websearch_to_tsquery('english', $${searchParam})
                  )
                  ELSE GREATEST(
                    word_similarity(
                      $${searchParam},
                      COALESCE(c.title, '')
                    ),
                    word_similarity(
                      $${searchParam},
                      COALESCE(c.description, '')
                    )
                  )
                END
              ELSE 0
            END AS search_rank,

            CASE
              WHEN $${searchParam} <> ''
              THEN ts_headline(
                'english',
                concat_ws(' ', c.title, c.description, c.content),
                websearch_to_tsquery('english', $${searchParam}),
                'MaxWords=30, MinWords=15'
              )
              ELSE NULL
            END AS search_snippet
        FROM captures c
        LEFT JOIN capture_categories cc
          ON cc.id = c.category_id
        JOIN capture_search_documents csd
          ON csd.capture_id = c.id
        WHERE c.user_id = $1
        ${categoryFilter}
        ${searchFilter}
        ${typeFilter}
        ${tagFilter}
        ORDER BY ${orderBy}
        LIMIT $${limitParam}
        OFFSET $${offsetParam};
        `,
    values,
  );

  const countResult = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM captures c
    LEFT JOIN capture_categories cc
      ON cc.id = c.category_id
    JOIN capture_search_documents csd
      ON csd.capture_id = c.id
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
