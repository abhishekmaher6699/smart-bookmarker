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
                    strict_word_similarity(
                      $${searchParam},
                      COALESCE(c.title, '')
                    ),
                    strict_word_similarity(
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

  const countValues: unknown[] = [userId];

  let countCategoryFilter = "";
  let countSearchFilter = "";
  let countTypeFilter = "";
  let countTagFilter = "";

  if (categoryIds?.length) {
    countValues.push(categoryIds);
    countCategoryFilter = `
    AND c.category_id = ANY($${countValues.length}::uuid[])
  `;
  }

  if (search) {
    countValues.push(search);
    countSearchFilter = `
    AND (
      csd.search_document @@ websearch_to_tsquery(
        'english',
        $${countValues.length}
      )
      OR c.title %> $${countValues.length}
      OR c.description %> $${countValues.length}
    )
  `;
  }

  if (type) {
    countValues.push(type);
    countTypeFilter = `
    AND c.type = $${countValues.length}
  `;
  }

  if (tag) {
    countValues.push(tag.toLowerCase());
    countTagFilter = `
    AND $${countValues.length} = ANY(c.tags)
  `;
  }

  const countResult = await pool.query(
    `
  SELECT COUNT(*) AS total
  FROM captures c
  LEFT JOIN capture_categories cc
    ON cc.id = c.category_id
  JOIN capture_search_documents csd
    ON csd.capture_id = c.id
  WHERE c.user_id = $1
  ${countCategoryFilter}
  ${countSearchFilter}
  ${countTypeFilter}
  ${countTagFilter}
  `,
    countValues,
  );

  return {
    rows: result.rows,
    total: Number(countResult.rows[0].total),
  };
}

export async function findSemanticSearchResults(
  userID: string,
  queryEmbedding: number[],
  limit: number,
  offset: number,
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

        1 - (
          csd.embedding <=> $2::vector
        ) AS semantic_score

        FROM captures c

        LEFT JOIN capture_categories cc
          ON cc.id = c.category_id

        JOIN capture_search_documents csd
          ON csd.capture_id = c.id

        WHERE
          c.user_id = $1
          AND csd.embedding IS NOT NULL
          AND 1 - (
            csd.embedding <=> $2::vector
          ) >= 0.40
        
        ORDER BY csd.embedding <=> $2::vector ASC
        
        LIMIT $3
        OFFSET $4;
    `,
    [userID, JSON.stringify(queryEmbedding), limit, offset],
  );

  const countResult = await pool.query(
    `
      SELECT COUNT(*) AS total

      FROM captures c

      JOIN capture_search_documents csd
        ON csd.capture_id = c.id

      WHERE
        c.user_id = $1
        AND csd.embedding IS NOT NULL
        AND 1 - (
          csd.embedding <=> $2::vector
        ) >= 0.40
        ;
    `,
    [userID, JSON.stringify(queryEmbedding)],
  );

  return {
    rows: result.rows,
    total: Number(countResult.rows[0].total),
  };
}

export async function findHybridSearchResults(
  userId: string,
  search: string,
  queryEmbedding: number[],
  limit: number,
  offset: number,
  categoryIds?: string[],
  type?: string,
  tag?: string,
  sort: "newest" | "oldest" = "newest",
) {
  const values: unknown[] = [userId, search, JSON.stringify(queryEmbedding)];

  const searchParam = 2;
  const embeddingParam = 3;

  let categoryFilter = "";
  let typeFilter = "";
  let tagFilter = "";

  if (categoryIds?.length) {
    values.push(categoryIds);

    categoryFilter = `
      AND c.category_id = ANY($${values.length}::uuid[])
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

  values.push(limit);
  const limitParam = values.length;

  values.push(offset);
  const offsetParam = values.length;

  const result = await pool.query(
    `
      WITH scored AS (
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
            WHEN csd.search_document @@ websearch_to_tsquery(
              'english',
              $${searchParam}
            )
            THEN ts_rank(
              ARRAY[0.2, 0.5, 0.8, 1.0],
              csd.search_document,
              websearch_to_tsquery(
                'english',
                $${searchParam}
              )
            )

            ELSE GREATEST(
              strict_word_similarity(
                $${searchParam},
                COALESCE(c.title, '')
              ),
              strict_word_similarity(
                $${searchParam},
                COALESCE(c.description, '')
              )
            )
          END AS keyword_score,

          1 - (
            csd.embedding <=> $${embeddingParam}::vector
          ) AS semantic_score

        FROM captures c

        LEFT JOIN capture_categories cc
          ON cc.id = c.category_id

        JOIN capture_search_documents csd
          ON csd.capture_id = c.id

        WHERE
          c.user_id = $1
          AND csd.embedding IS NOT NULL
          ${categoryFilter}
          ${typeFilter}
          ${tagFilter}
      ),

      normalized AS (
        SELECT
          *,

          LEAST(
            keyword_score,
            1.0
          ) AS normalized_keyword_score,

          /*
           * Rescale vector cosine similarity (0.35-0.80)
           * so baseline noise (~0.35) maps to 0.0.
           */
          GREATEST(
            0.0,
            LEAST(
              (semantic_score - 0.35) / 0.45,
              1.0
            )
          ) AS normalized_semantic_score

        FROM scored
      )

      SELECT
        id,
        user_id,
        url,
        title,
        type,
        description,
        thumbnail_url,
        content,
        summary,
        category_id,
        category,
        tags,
        created_at,
        updated_at,

        keyword_score,
        semantic_score,

        (
          0.40 * normalized_keyword_score
          +
          0.60 * normalized_semantic_score
        ) AS hybrid_score

      FROM normalized

      WHERE (
        normalized_keyword_score >= 0.20
        OR normalized_semantic_score >= 0.40
      )
      AND (
        0.40 * normalized_keyword_score
        +
        0.60 * normalized_semantic_score
      ) >= 0.25

      ORDER BY
        hybrid_score DESC,
        created_at ${orderDirection}

      LIMIT $${limitParam}
      OFFSET $${offsetParam};
    `,
    values,
  );

  const countValues: unknown[] = [
    userId,
    search,
    JSON.stringify(queryEmbedding),
  ];

  let countCategoryFilter = "";
  let countTypeFilter = "";
  let countTagFilter = "";

  if (categoryIds?.length) {
    countValues.push(categoryIds);

    countCategoryFilter = `
      AND c.category_id = ANY($${countValues.length}::uuid[])
    `;
  }

  if (type) {
    countValues.push(type);

    countTypeFilter = `
      AND c.type = $${countValues.length}
    `;
  }

  if (tag) {
    countValues.push(tag.toLowerCase());

    countTagFilter = `
      AND $${countValues.length} = ANY(c.tags)
    `;
  }

  const countResult = await pool.query(
    `
      WITH scored AS (
        SELECT
          CASE
            WHEN csd.search_document @@ websearch_to_tsquery(
              'english',
              $${searchParam}
            )
            THEN ts_rank(
              ARRAY[0.2, 0.5, 0.8, 1.0],
              csd.search_document,
              websearch_to_tsquery(
                'english',
                $${searchParam}
              )
            )

            ELSE GREATEST(
              strict_word_similarity(
                $${searchParam},
                COALESCE(c.title, '')
              ),
              strict_word_similarity(
                $${searchParam},
                COALESCE(c.description, '')
              )
            )
          END AS keyword_score,

          1 - (
            csd.embedding <=> $${embeddingParam}::vector
          ) AS semantic_score

        FROM captures c

        JOIN capture_search_documents csd
          ON csd.capture_id = c.id

        WHERE
          c.user_id = $1
          AND csd.embedding IS NOT NULL
          ${countCategoryFilter}
          ${countTypeFilter}
          ${countTagFilter}
      ),

      normalized AS (
        SELECT
          LEAST(
            keyword_score,
            1.0
          ) AS normalized_keyword_score,

          GREATEST(
            0.0,
            LEAST(
              (semantic_score - 0.35) / 0.45,
              1.0
            )
          ) AS normalized_semantic_score

        FROM scored
      )

      SELECT COUNT(*) AS total

      FROM normalized

      WHERE (
        normalized_keyword_score >= 0.20
        OR normalized_semantic_score >= 0.40
      )
      AND (
        0.40 * normalized_keyword_score
        +
        0.60 * normalized_semantic_score
      ) >= 0.25;
    `,
    countValues,
  );

  return {
    rows: result.rows,
    total: Number(countResult.rows[0].total),
  };
}
