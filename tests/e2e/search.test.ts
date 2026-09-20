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

describe("Search API", () => {
  async function createUser(email = `search-${Date.now()}@example.com`) {
    await request(app).post("/auth/register").send({
      email,
      password: "StrongPassword123!",
    });

    const login = await request(app).post("/auth/login").send({
      email,
      password: "StrongPassword123!",
    });

    return login.body.accessToken;
  }

  beforeEach(async () => {
    await pool.query("DELETE FROM users");
  });

  it("should search captures for the authenticated user", async () => {
    const token = await createUser();

    const response = await request(app)
      .get("/search")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body).toHaveProperty("pagination");

    expect(response.body.pagination).toMatchObject({
      limit: expect.any(Number),
      offset: 0,
      total: expect.any(Number),
      hasNext: expect.any(Boolean),
      hasPrevious: false,
    });
  });

  it("should support keyword search", async () => {
    const token = await createUser("keyword@example.com");

    const response = await request(app)
      .get("/search")
      .query({
        search: "typescript",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body).toHaveProperty("pagination");
  });

  it("should reject semantic search without a search query", async () => {
    const token = await createUser("semantic-error@example.com");

    const response = await request(app)
      .get("/search")
      .query({
        mode: "semantic",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
  });

  it("should reject hybrid search without a search query", async () => {
    const token = await createUser("hybrid-error@example.com");

    const response = await request(app)
      .get("/search")
      .query({
        mode: "hybrid",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
  });

  it("should reject unauthenticated search", async () => {
    const response = await request(app).get("/search").query({
      search: "typescript",
    });

    expect(response.status).toBe(401);
  });

  it("should support pagination", async () => {
    const token = await createUser("pagination@example.com");

    const response = await request(app)
      .get("/search")
      .query({
        limit: 10,
        offset: 10,
      })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.pagination).toMatchObject({
      limit: 10,
      offset: 10,
      hasPrevious: true,
    });
  });

  it("should reject invalid query parameters", async () => {
    const token = await createUser("invalid-query@example.com");

    const response = await request(app)
      .get("/search")
      .query({
        limit: "invalid",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
  });
});
