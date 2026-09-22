import { describe, expect, it, vi } from "vitest";
import request from "supertest";


vi.mock("../../src/integrations/email/email.js", () => ({
  emailProvider: {
    sendEmail: vi.fn(),
  },
}));

vi.mock("../../src/lib/redis.js", () => ({
  redis: {
    isOpen: false,
    connect: vi.fn(),
    quit: vi.fn(),
  },
  connectRedis: vi.fn(),
  disconnectRedis: vi.fn(),
}));

import app from "../../src/app.js";


describe("Health API", () => {
  it("should return a healthy response", async () => {
    const response = await request(app)
      .get("/health");

    expect(response.status).toBe(200);
  });
});