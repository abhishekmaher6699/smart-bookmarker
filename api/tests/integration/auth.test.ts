import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "../../src/db/client.js";
import {
  createRefreshToken,
  createUser,
  findRefreshToken,
  findUserByEmail,
  findUserById,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../../src/modules/auth/auth.repository.js";

describe("auth repository", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM users");
  });

  it("should create a user in the database", async () => {
    const user = await createUser("test@example.com", "hashed-password");

    expect(user).toMatchObject({
      email: "test@example.com",
      created_at: expect.any(Date),
    });

    expect(user.id).toEqual(expect.any(String));
  });

  it("should find a user by email", async () => {
    const created = await createUser("find@example.com", "hashed-password");

    const user = await findUserByEmail("find@example.com");

    expect(user).toMatchObject({
      id: created.id,
      email: "find@example.com",
      password: "hashed-password",
    });
  });

  it("should find a user by id", async () => {
    const created = await createUser("byid@example.com", "hashed-password");

    const user = await findUserById(created.id);

    expect(user).toMatchObject({
      id: created.id,
      email: "byid@example.com",
      password: "hashed-password",
    });
  });

  it("should return null when user id does not exist", async () => {
    const user = await findUserById("00000000-0000-0000-0000-000000000000");

    expect(user).toBeNull();
  });

  it("should create and find a refresh token", async () => {
    const user = await createUser("refresh@example.com", "hashed-password");

    const familyId = crypto.randomUUID();
    const tokenHash = "hash-123";
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const created = await createRefreshToken(
      user.id,
      familyId,
      tokenHash,
      expiresAt,
    );

    expect(created).toMatchObject({
      user_id: user.id,
      family_id: familyId,
      expires_at: expect.any(Date),
    });

    expect(created.id).toEqual(expect.any(String));

    const found = await findRefreshToken(tokenHash);

    expect(found).toMatchObject({
      id: created.id,
      user_id: user.id,
      token_hash: tokenHash,
      family_id: familyId,
      revoked_at: null,
    });
  });

  it("should return null when refresh token does not exist", async () => {
    const token = await findRefreshToken("does-not-exist");

    expect(token).toBeNull();
  });

  it("should revoke a refresh token", async () => {
    const user = await createUser("revoke@example.com", "hashed-password");

    const familyId = crypto.randomUUID();
    const tokenHash = "revoke-hash";
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const created = await createRefreshToken(
      user.id,
      familyId,
      tokenHash,
      expiresAt,
    );

    const revoked = await revokeRefreshToken(created.id);

    expect(revoked).toEqual({
      id: created.id,
    });

    const found = await findRefreshToken(tokenHash);

    expect(found).not.toBeNull();
    expect(found?.revoked_at).toEqual(expect.any(Date));
  });

  it("should not revoke an already revoked refresh token", async () => {
    const user = await createUser(
      "already-revoked@example.com",
      "hashed-password",
    );

    const familyId = crypto.randomUUID();
    const tokenHash = "already-revoked-hash";
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const created = await createRefreshToken(
      user.id,
      familyId,
      tokenHash,
      expiresAt,
    );

    await revokeRefreshToken(created.id);

    const secondAttempt = await revokeRefreshToken(created.id);

    expect(secondAttempt).toBeNull();
  });

  it("should rotate an active refresh token", async () => {
    const user = await createUser("rotate@example.com", "hashed-password");

    const familyId = crypto.randomUUID();

    const oldToken = await createRefreshToken(
      user.id,
      familyId,
      "old-token-hash",
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );

    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const result = await rotateRefreshToken(
      oldToken.id,
      user.id,
      familyId,
      "new-token-hash",
      newExpiresAt,
    );

    expect(result.status).toBe("rotated");

    if (result.status !== "rotated") {
      throw new Error("Expected token rotation");
    }

    expect(result.token).toMatchObject({
      user_id: user.id,
      family_id: familyId,
    });

    const oldTokenFromDb = await findRefreshToken("old-token-hash");
    const newTokenFromDb = await findRefreshToken("new-token-hash");

    expect(oldTokenFromDb?.revoked_at).toEqual(expect.any(Date));
    expect(newTokenFromDb?.revoked_at).toBeNull();
  });

  it("should return not_found when rotating a missing token", async () => {
    const user = await createUser(
      "missing-rotate@example.com",
      "hashed-password",
    );

    const familyId = crypto.randomUUID();

    const result = await rotateRefreshToken(
      "00000000-0000-0000-0000-000000000000",
      user.id,
      familyId,
      "new-token-hash",
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );

    expect(result).toEqual({
      status: "not_found",
    });

    const newToken = await findRefreshToken("new-token-hash");

    expect(newToken).toBeNull();
  });

  it("should return already_revoked when rotating a revoked token", async () => {
    const user = await createUser(
      "revoked-rotate@example.com",
      "hashed-password",
    );

    const familyId = crypto.randomUUID();

    const oldToken = await createRefreshToken(
      user.id,
      familyId,
      "revoked-token-hash",
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );

    await revokeRefreshToken(oldToken.id);

    const result = await rotateRefreshToken(
      oldToken.id,
      user.id,
      familyId,
      "new-revoked-hash",
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );

    expect(result).toEqual({
      status: "already_revoked",
    });

    const newToken = await findRefreshToken("new-revoked-hash");

    expect(newToken).toBeNull();
  });

  it("should return expired when rotating an expired token", async () => {
    const user = await createUser(
      "expired-rotate@example.com",
      "hashed-password",
    );

    const familyId = crypto.randomUUID();

    const oldToken = await createRefreshToken(
      user.id,
      familyId,
      "expired-token-hash",
      new Date(Date.now() - 60 * 1000),
    );

    const result = await rotateRefreshToken(
      oldToken.id,
      user.id,
      familyId,
      "new-expired-hash",
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );

    expect(result).toEqual({
      status: "expired",
    });

    const oldTokenFromDb = await findRefreshToken("expired-token-hash");
    const newToken = await findRefreshToken("new-expired-hash");

    // The old token should remain unrevoked because the transaction
    // returned before the UPDATE.
    expect(oldTokenFromDb?.revoked_at).toBeNull();

    expect(newToken).toBeNull();
  });
});
