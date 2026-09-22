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

describe("Auth API", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM users");
  });

  const validUser = {
    email: "auth@example.com",
    password: "StrongPassword123!",
  };

  it("should register a user", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send(validUser);

    expect(response.status).toBe(201);
  });

  it("should reject duplicate registration", async () => {
    await request(app)
      .post("/auth/register")
      .send(validUser);

    const response = await request(app)
      .post("/auth/register")
      .send(validUser);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("User already exists");
  });

  it("should login with valid credentials", async () => {
    await request(app)
      .post("/auth/register")
      .send(validUser);

    const response = await request(app)
      .post("/auth/login")
      .send(validUser);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
  });

  it("should reject invalid login credentials", async () => {
    await request(app)
      .post("/auth/register")
      .send(validUser);

    const response = await request(app)
      .post("/auth/login")
      .send({
        email: validUser.email,
        password: "WrongPassword123!",
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid email or password");
  });

  it("should reject invalid registration input", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        email: "not-an-email",
        password: "123",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request");
  });

  it("should refresh an access token", async () => {
    await request(app)
      .post("/auth/register")
      .send(validUser);

    const login = await request(app)
      .post("/auth/login")
      .send(validUser);

    const response = await request(app)
      .post("/auth/refresh")
      .send({
        refreshToken: login.body.refreshToken,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");

    expect(response.body.refreshToken).not.toBe(
      login.body.refreshToken,
    );
  });

  it("should logout successfully", async () => {
    await request(app)
      .post("/auth/register")
      .send(validUser);

    const login = await request(app)
      .post("/auth/login")
      .send(validUser);

    const response = await request(app)
      .post("/auth/logout")
      .send({
        refreshToken: login.body.refreshToken,
      });

    expect(response.status).toBe(204);
  });

  it("should reject refresh with an invalid token", async () => {
    const response = await request(app)
      .post("/auth/refresh")
      .send({
        refreshToken: "invalid-refresh-token",
      });

    expect(response.status).toBe(401);
  });

  it("should reject change password without authentication", async () => {
    const response = await request(app)
      .post("/auth/change-password")
      .send({
        currentPassword: validUser.password,
        newPassword: "NewStrongPassword123!",
      });

    expect(response.status).toBe(401);
  });

  it("should change the password with authentication", async () => {
    await request(app)
      .post("/auth/register")
      .send(validUser);

    const login = await request(app)
      .post("/auth/login")
      .send(validUser);

    const response = await request(app)
      .post("/auth/change-password")
      .set(
        "Authorization",
        `Bearer ${login.body.accessToken}`,
      )
      .send({
        currentPassword: validUser.password,
        newPassword: "NewStrongPassword123!",
      });

    expect(response.status).toBe(204);

    const newLogin = await request(app)
      .post("/auth/login")
      .send({
        email: validUser.email,
        password: "NewStrongPassword123!",
      });

    expect(newLogin.status).toBe(200);
    expect(newLogin.body).toHaveProperty("accessToken");
  });
});