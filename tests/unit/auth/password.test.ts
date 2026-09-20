import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../../src/modules/auth/password.js";

describe("hashPassword", () => {
  it("should return salt and derived key seperated by a colon", async () => {
    const hashedPassword = await hashPassword("myPassword123");

    const [salt, key] = hashedPassword.split(":");

    expect(salt).toBeDefined();
    expect(key).toBeDefined();
    expect(salt).toHaveLength(32);
    expect(key).toHaveLength(128);
  });

  it("should verify the correct password", async () => {
    const password = "myPassword123";
    const hashedPassword = await hashPassword(password);
    const result = await verifyPassword(password, hashedPassword);
    expect(result).toBe(true);
  });

  it("should reject an incorrect password", async () => {
    const password = "myPassword123";
    const wrongPassword = "wrongPassword123";
    const hashedPassword = await hashPassword(password);
    const result = await verifyPassword(wrongPassword, hashedPassword);
    expect(result).toBe(false);
  });

  it("should return false for a malformed hash", async () => {
    expect(await verifyPassword("myPassword123", "")).toBe(false);
    expect(await verifyPassword("myPassword123", "invalid")).toBe(false);
    expect(await verifyPassword("myPassword123", "saltOnly:")).toBe(false);
    expect(await verifyPassword("myPassword123", ":keyOnly")).toBe(false);
  });

  it("should generate different hashes for the same password", async () => {
    const password = "myPass";

    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });
});
