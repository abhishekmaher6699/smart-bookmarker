import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "../../src/db/client.js";
import { createUser } from "../../src/modules/auth/auth.repository.js";
import { createCategory } from "../../src/modules/categories/category.repository.js";
import {
  deleteCaptureById,
  findCaptureById,
  findCaptureByUrl,
  findCaptureForEnrichment,
  insertCapture,
  updateCaptureById,
} from "../../src/modules/captures/capture.repository.js";

describe("capture repository", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM users");
  });

  it("should insert a capture", async () => {
    const user = await createUser(
      "capture@example.com",
      "hashed-password",
    );

    const capture = await insertCapture({
      userID: user.id,
      url: "https://example.com/article",
      title: "Example Article",
      type: "article",
      description: "Description",
      thumbnailUrl: "https://example.com/image.jpg",
      content: "Article content",
      tags: ["backend", "testing"],
    });

    expect(capture).toMatchObject({
      user_id: user.id,
      url: "https://example.com/article",
      title: "Example Article",
      type: "article",
      description: "Description",
      content: "Article content",
      tags: ["backend", "testing"],
    });

    expect(capture.id).toEqual(expect.any(String));
  });

  it("should find a capture by id for the correct user", async () => {
    const user = await createUser(
      "find-capture@example.com",
      "hashed-password",
    );

    const category = await createCategory(user.id, "Design");

    const capture = await insertCapture({
      userID: user.id,
      url: "https://example.com/design",
      title: "Design Principles",
      type: "article",
      categoryId: category.id,
    });

    const found = await findCaptureById(capture.id, user.id);

    expect(found).toMatchObject({
      id: capture.id,
      user_id: user.id,
      title: "Design Principles",
      category_id: category.id,
      category: "Design",
    });
  });

  it("should find a capture by URL for the correct user", async () => {
    const user = await createUser(
      "url-capture@example.com",
      "hashed-password",
    );

    const capture = await insertCapture({
      userID: user.id,
      url: "https://example.com/unique",
      title: "Unique",
      type: "article",
    });

    const found = await findCaptureByUrl(
      user.id,
      "https://example.com/unique",
    );

    expect(found).toMatchObject({
      id: capture.id,
      user_id: user.id,
      url: "https://example.com/unique",
    });
  });

  it("should exclude a specific capture when finding by URL", async () => {
    const user = await createUser(
      "exclude-capture@example.com",
      "hashed-password",
    );

    const first = await insertCapture({
      userID: user.id,
      url: "https://example.com/same",
      title: "First",
      type: "article",
    });

    const found = await findCaptureByUrl(
      user.id,
      "https://example.com/same",
      first.id,
    );

    expect(found).toBeNull();
  });

  it("should update a capture", async () => {
    const user = await createUser(
      "update-capture@example.com",
      "hashed-password",
    );

    const capture = await insertCapture({
      userID: user.id,
      url: "https://example.com/old",
      title: "Old title",
      type: "article",
    });

    const updated = await updateCaptureById(
      capture.id,
      user.id,
      {
        url: "https://example.com/new",
        title: "New title",
        type: "github",
      },
    );

    expect(updated).toMatchObject({
      id: capture.id,
      user_id: user.id,
      url: "https://example.com/new",
      title: "New title",
      type: "github",
    });
  });

  it("should delete a capture only for the correct user", async () => {
    const user1 = await createUser(
      "delete-capture1@example.com",
      "hashed-password",
    );

    const user2 = await createUser(
      "delete-capture2@example.com",
      "hashed-password",
    );

    const capture = await insertCapture({
      userID: user1.id,
      url: "https://example.com/delete",
      title: "Delete me",
      type: "article",
    });

    const wrongUserDelete = await deleteCaptureById(
      capture.id,
      user2.id,
    );

    expect(wrongUserDelete).toBeNull();

    const deleted = await deleteCaptureById(
      capture.id,
      user1.id,
    );

    expect(deleted).toEqual({
      id: capture.id,
    });

    const found = await findCaptureById(capture.id, user1.id);

    expect(found).toBeNull();
  });

  it("should find a capture for enrichment", async () => {
    const user = await createUser(
      "enrichment-capture@example.com",
      "hashed-password",
    );

    const capture = await insertCapture({
      userID: user.id,
      url: "https://example.com/enrich",
      title: "Enrich me",
      type: "article",
      content: "Original content",
    });

    const found = await findCaptureForEnrichment(capture.id);

    expect(found).toMatchObject({
      id: capture.id,
      user_id: user.id,
      url: "https://example.com/enrich",
      title: "Enrich me",
      content: "Original content",
    });
  });
});