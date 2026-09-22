import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "../../src/db/client.js";
import { createUser } from "../../src/modules/auth/auth.repository.js";
import { createCategory } from "../../src/modules/categories/category.repository.js";
import { insertCapture } from "../../src/modules/captures/capture.repository.js";
import {
  updateSearchEmbedding,
  upsertSearchDocument,
} from "../../src/modules/search/search-doc.repository.js";
import {
  findHybridSearchResults,
  findSearchResults,
  findSemanticSearchResults,
} from "../../src/modules/search/search.repository.js";

describe("search repository", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM users");
  });

  function vector(index: number) {
    const values = Array(768).fill(0);
    values[index] = 1;
    return values;
  }

  async function createTestCapture(
    email: string,
    data: {
      title?: string;
      description?: string;
      content?: string;
      type?: string;
      tags?: string[];
    } = {},
  ) {
    const user = await createUser(email, "hashed-password");

    const capture = await insertCapture({
      userID: user.id,
      url: `https://example.com/${email}`,
      title: data.title ?? "Test capture",
      type: data.type ?? "article",
      description: data.description ?? null,
      content: data.content ?? null,
      tags: data.tags ?? null,
    });

    return { user, capture };
  }

  it("should create a search document", async () => {
    const { capture } = await createTestCapture(
      "search-document@example.com",
      {
        title: "TypeScript Testing",
        description: "Backend testing guide",
        content: "Learn how to test Node applications",
        tags: ["typescript", "testing"],
      },
    );

    const document = await upsertSearchDocument(capture.id);

    expect(document).toMatchObject({
      capture_id: capture.id,
    });

    expect(document?.search_document).toBeTruthy();
    expect(document?.indexed_at).toBeTruthy();
  });

  it("should update an existing search document when upserted again", async () => {
    const { capture } = await createTestCapture(
      "search-upsert@example.com",
      {
        title: "Old title",
      },
    );

    const first = await upsertSearchDocument(capture.id);

    await pool.query(
      `
      UPDATE captures
      SET title = 'New TypeScript title'
      WHERE id = $1
      `,
      [capture.id],
    );

    const second = await upsertSearchDocument(capture.id);

    expect(second?.capture_id).toBe(capture.id);
    expect(second?.search_document).toBeTruthy();
    expect(second?.search_document).not.toEqual(
      first?.search_document,
    );
  });

  it("should update a search embedding", async () => {
    const { capture } = await createTestCapture(
      "embedding@example.com",
    );

    await upsertSearchDocument(capture.id);

    const updated = await updateSearchEmbedding(
      capture.id,
      vector(0),
    );

    expect(updated).toEqual({
      capture_id: capture.id,
    });

    const result = await pool.query(
      `
      SELECT embedding::text AS embedding
      FROM capture_search_documents
      WHERE capture_id = $1
      `,
      [capture.id],
    );

    expect(result.rows[0].embedding).toContain("1");
  });

  it("should find keyword search results", async () => {
    const { user, capture } = await createTestCapture(
      "keyword@example.com",
      {
        title: "TypeScript Backend Testing",
        description: "Testing Node applications",
        content: "Vitest integration testing guide",
      },
    );

    await upsertSearchDocument(capture.id);

    const result = await findSearchResults(
      user.id,
      10,
      0,
      undefined,
      "TypeScript",
    );

    expect(result.total).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: capture.id,
      title: "TypeScript Backend Testing",
    });

    expect(result.rows[0].search_rank).toBeGreaterThan(0);
    expect(result.rows[0].search_snippet).toBeTruthy();
  });

  it("should apply search filters", async () => {
    const { user, capture } = await createTestCapture(
      "filters@example.com",
      {
        title: "React Testing",
        type: "github",
        tags: ["frontend", "testing"],
      },
    );

    const other = await insertCapture({
      userID: user.id,
      url: "https://example.com/other",
      title: "React Article",
      type: "article",
      tags: ["frontend"],
    });

    await upsertSearchDocument(capture.id);
    await upsertSearchDocument(other.id);

    const result = await findSearchResults(
      user.id,
      10,
      0,
      undefined,
      "React",
      "github",
      "testing",
    );

    expect(result.total).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe(capture.id);
  });

  it("should find semantic search results", async () => {
    const { user, capture } = await createTestCapture(
      "semantic@example.com",
      {
        title: "Semantic Search",
      },
    );

    await upsertSearchDocument(capture.id);
    await updateSearchEmbedding(capture.id, vector(0));

    const result = await findSemanticSearchResults(
      user.id,
      vector(0),
      10,
      0,
    );

    expect(result.total).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: capture.id,
      title: "Semantic Search",
    });

    expect(result.rows[0].semantic_score).toBeCloseTo(1);
  });

  it("should exclude semantic results below the similarity threshold", async () => {
    const { user, capture } = await createTestCapture(
      "semantic-threshold@example.com",
      {
        title: "Weak Match",
      },
    );

    await upsertSearchDocument(capture.id);

    // Orthogonal vector → cosine similarity is 0.
    await updateSearchEmbedding(capture.id, vector(1));

    const result = await findSemanticSearchResults(
      user.id,
      vector(0),
      10,
      0,
    );

    expect(result.total).toBe(0);
    expect(result.rows).toHaveLength(0);
  });

  it("should find hybrid search results", async () => {
    const { user, capture } = await createTestCapture(
      "hybrid@example.com",
      {
        title: "TypeScript Search",
        description: "Backend search implementation",
      },
    );

    await upsertSearchDocument(capture.id);
    await updateSearchEmbedding(capture.id, vector(0));

    const result = await findHybridSearchResults(
      user.id,
      "TypeScript",
      vector(0),
      10,
      0,
    );

    expect(result.total).toBe(1);
    expect(result.rows).toHaveLength(1);

    expect(result.rows[0]).toMatchObject({
      id: capture.id,
      title: "TypeScript Search",
    });

    expect(result.rows[0].keyword_score).toBeGreaterThan(0);
    expect(result.rows[0].semantic_score).toBeCloseTo(1);
    expect(result.rows[0].hybrid_score).toBeGreaterThan(0);
  });
});