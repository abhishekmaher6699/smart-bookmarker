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

describe("Category API", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM users");
  });

  async function createAuthenticatedUser(
    email = "category-api@example.com",
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

  it("should create a category", async () => {
    const token = await createAuthenticatedUser();

    const response = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Programming",
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: "Programming",
    });

    expect(response.body.data.id).toEqual(expect.any(String));
  });

  it("should list categories", async () => {
    const token = await createAuthenticatedUser("list@example.com");

    await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Zebra" });

    await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Backend" });

    const response = await request(app)
      .get("/categories")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.map((category: { name: string }) => category.name))
      .toEqual(["Backend", "Zebra"]);
  });

  it("should return the existing category for a duplicate name", async () => {
    const token = await createAuthenticatedUser("duplicate-category@example.com");

    const first = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Programming" });

    const second = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Programming" });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);
  });

  it("should update a category", async () => {
    const token = await createAuthenticatedUser("update-category@example.com");

    const created = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Old Name" });

    const response = await request(app)
      .patch(`/categories/${created.body.data.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Name" });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: created.body.data.id,
      name: "New Name",
    });
  });

  it("should return 404 when updating another user's category", async () => {
    const token1 = await createAuthenticatedUser("category-owner@example.com");

    const created = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token1}`)
      .send({ name: "Private" });

    const token2 = await createAuthenticatedUser("category-other@example.com");

    const response = await request(app)
      .patch(`/categories/${created.body.data.id}`)
      .set("Authorization", `Bearer ${token2}`)
      .send({ name: "Hacked" });

    expect(response.status).toBe(404);
  });

  it("should delete a category", async () => {
    const token = await createAuthenticatedUser("delete-category@example.com");

    const created = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Delete Me" });

    const response = await request(app)
      .delete(`/categories/${created.body.data.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(created.body.data.id);

    const list = await request(app)
      .get("/categories")
      .set("Authorization", `Bearer ${token}`);

    expect(list.body.data).toHaveLength(0);
  });

  it("should reject unauthenticated category access", async () => {
    const response = await request(app)
      .get("/categories");

    expect(response.status).toBe(401);
  });
});