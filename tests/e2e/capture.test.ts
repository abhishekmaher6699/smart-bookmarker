import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

process.env.JWT_SECRET = "test-jwt-secret-for-vitest";

vi.mock("../../src/integrations/email/email.js", () => ({
  emailProvider: {
    sendEmailVerificationEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
  },
}));

vi.mock("../../src/lib/redis.js", () => ({
  redis: {
    isOpen: false,
    connect: vi.fn(),
    quit: vi.fn(),
    eval: vi.fn(),
  },
  connectRedis: vi.fn(),
  disconnectRedis: vi.fn(),
}));

import app from "../../src/app.js";
import { pool } from "../../src/db/client.js";

describe("Capture API", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM users");
  });

  async function createAuthenticatedUser(
    email = "capture-api@example.com",
  ) {
    await request(app)
      .post("/auth/register")
      .send({
        email,
        password: "StrongPassword123!",
      });

    const login = await request(app)
      .post("/auth/login")
      .send({
        email,
        password: "StrongPassword123!",
      });

    return login.body.accessToken;
  }

  it("should create a capture", async () => {
    const token = await createAuthenticatedUser();

    const response = await request(app)
      .post("/captures")
      .set("Authorization", `Bearer ${token}`)
      .send({
        url: "https://example.com/article",
        title: "Example Article",
        type: "article",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      url: "https://example.com/article",
      title: "Example Article",
      type: "article",
    });

    expect(response.body.id).toEqual(expect.any(String));
  });

  it("should return the existing capture when creating the same URL", async () => {
    const token = await createAuthenticatedUser(
      "duplicate-capture@example.com",
    );

    const first = await request(app)
      .post("/captures")
      .set("Authorization", `Bearer ${token}`)
      .send({
        url: "https://example.com/duplicate",
        title: "First",
        type: "article",
      });

    const second = await request(app)
      .post("/captures")
      .set("Authorization", `Bearer ${token}`)
      .send({
        url: "https://example.com/duplicate",
        title: "Second",
        type: "article",
      });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    expect(second.body.id).toBe(first.body.id);
  });

  it("should reject creating a capture without authentication", async () => {
    const response = await request(app)
      .post("/captures")
      .send({
        url: "https://example.com/no-auth",
        title: "No Auth",
        type: "article",
      });

    expect(response.status).toBe(401);
  });

  it("should get a capture", async () => {
    const token = await createAuthenticatedUser(
      "get-capture@example.com",
    );

    const created = await request(app)
      .post("/captures")
      .set("Authorization", `Bearer ${token}`)
      .send({
        url: "https://example.com/get",
        title: "Get Me",
        type: "article",
      });

    const response = await request(app)
      .get(`/captures/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: created.body.id,
      title: "Get Me",
      url: "https://example.com/get",
    });
  });

  it("should return 404 when getting another user's capture", async () => {
    const token1 = await createAuthenticatedUser(
      "owner@example.com",
    );

    const created = await request(app)
      .post("/captures")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        url: "https://example.com/private",
        title: "Private",
        type: "article",
      });

    const token2 = await createAuthenticatedUser(
      "other-user@example.com",
    );

    const response = await request(app)
      .get(`/captures/${created.body.id}`)
      .set("Authorization", `Bearer ${token2}`);

    expect(response.status).toBe(404);
  });

  it("should update a capture", async () => {
    const token = await createAuthenticatedUser(
      "update-capture@example.com",
    );

    const created = await request(app)
      .post("/captures")
      .set("Authorization", `Bearer ${token}`)
      .send({
        url: "https://example.com/old",
        title: "Old title",
        type: "article",
      });

    const response = await request(app)
      .patch(`/captures/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "New title",
        type: "github",
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: created.body.id,
      title: "New title",
      type: "github",
    });
  });

  it("should reject updating to another existing URL", async () => {
    const token = await createAuthenticatedUser(
      "duplicate-url-update@example.com",
    );

    await request(app)
      .post("/captures")
      .set("Authorization", `Bearer ${token}`)
      .send({
        url: "https://example.com/existing",
        title: "Existing",
        type: "article",
      });

    const second = await request(app)
      .post("/captures")
      .set("Authorization", `Bearer ${token}`)
      .send({
        url: "https://example.com/second",
        title: "Second",
        type: "article",
      });

    const response = await request(app)
      .patch(`/captures/${second.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        url: "https://example.com/existing",
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe(
      "A capture with this URL already exists",
    );
  });

  it("should delete a capture", async () => {
    const token = await createAuthenticatedUser(
      "delete-capture@example.com",
    );

    const created = await request(app)
      .post("/captures")
      .set("Authorization", `Bearer ${token}`)
      .send({
        url: "https://example.com/delete",
        title: "Delete me",
        type: "article",
      });

    const response = await request(app)
      .delete(`/captures/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(204);

    const getResponse = await request(app)
      .get(`/captures/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(getResponse.status).toBe(404);
  });

  it("should reject an invalid capture id", async () => {
    const token = await createAuthenticatedUser(
      "invalid-id@example.com",
    );

    const response = await request(app)
      .get("/captures/not-a-uuid")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
  });
});