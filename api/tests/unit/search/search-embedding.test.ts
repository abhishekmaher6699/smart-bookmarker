import { describe, it, expect } from "vitest";
import { buildEmbeddingText } from "../../../src/modules/search/search-embedding.js";

describe("buildEmbeddingText", () => {
  it("builds embedding text from all available fields", () => {
    const input = {
      title: "Learning PostgreSQL",
      description: "Database fundamentals",
      tags: ["postgres", "backend"],
      content: "PostgreSQL is a relational database.",
    };

    const result = buildEmbeddingText(input);

    expect(result).toBe(
      "Title: Learning PostgreSQL\n\n" +
        "Description: Database fundamentals\n\n" +
        "Tags: postgres, backend\n\n" +
        "Content: PostgreSQL is a relational database.",
    );
  });

  it("skips fields that are not provided", () => {
    const result = buildEmbeddingText({
      title: "Learning PostgreSQL",
      content: "PostgreSQL is a relational database.",
    });

    expect(result).toBe(
      "Title: Learning PostgreSQL\n\n" +
        "Content: PostgreSQL is a relational database.",
    );
  });

  it("skips empty tags", () => {
    const result = buildEmbeddingText({
      title: "Learning PostgreSQL",
      tags: [],
    });

    expect(result).toBe("Title: Learning PostgreSQL");
  });

  it("returns empty string when input has no values", () => {
    const result = buildEmbeddingText({});
    expect(result).toBe("");
  });
});
