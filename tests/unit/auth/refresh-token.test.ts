import { describe, expect, it } from "vitest";
import {
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiry,
} from "../../../src/modules/auth/refresh-token.js";

describe("generateRefreshToken", () => {
  it("should generate a base64url refresh token", () => {
    const token = generateRefreshToken();

    expect(token).toBeTruthy();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("should generate different tokens each time", () => {
    const token1 = generateRefreshToken();
    const token2 = generateRefreshToken();

    expect(token1).not.toBe(token2);
  });
});

describe("hashRefreshToken", () => {
  it("should return a SHA-256 hash as a 64-character hex string", () => {
    const token = "test-refresh-token";

    const hash = hashRefreshToken(token);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should return the same hash for the same token", () => {
    const token = "test-refresh-token";

    const hash1 = hashRefreshToken(token);
    const hash2 = hashRefreshToken(token);

    expect(hash1).toBe(hash2);
  });

  it("should return different hashes for different tokens", () => {
    const hash1 = hashRefreshToken("token-one");
    const hash2 = hashRefreshToken("token-two");

    expect(hash1).not.toBe(hash2);
  });
});

describe("getRefreshTokenExpiry", () => {
  it("should return a date approximately 30 days from now", () => {
    const before = new Date();

    const expiry = getRefreshTokenExpiry();

    const after = new Date();

    const expectedMinimum = new Date(before);
    expectedMinimum.setDate(expectedMinimum.getDate() + 30);

    const expectedMaximum = new Date(after);
    expectedMaximum.setDate(expectedMaximum.getDate() + 30);

    expect(expiry.getTime()).toBeGreaterThanOrEqual(expectedMinimum.getTime());

    expect(expiry.getTime()).toBeLessThanOrEqual(expectedMaximum.getTime());
  });
});
