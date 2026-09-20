import { describe, expect, it, beforeEach } from "vitest";
import { signJwt, verifyJwt } from "../../../src/modules/auth/jwt.js";

describe("signJwt", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("should create a JWT with three parts", () => {
    const token = signJwt("user-123", 3600);

    const parts = token.split(".");

    expect(parts).toHaveLength(3);
  });

  it("should create a JWT with the correct header and payload", () => {
    const userId = "user-123";
    const expiresIn = 3600;

    const token = signJwt(userId, expiresIn);

    const [encodedHeader, encodedPayload] = token.split(".");

    const header = JSON.parse(
      Buffer.from(encodedHeader!, "base64url").toString("utf8"),
    );

    const payload = JSON.parse(
      Buffer.from(encodedPayload!, "base64url").toString("utf8"),
    );

    expect(header).toEqual({
      alg: "HS256",
      typ: "JWT",
    });

    expect(payload.sub).toBe(userId);
    expect(payload.iat).toEqual(expect.any(Number));
    expect(payload.exp).toBe(payload.iat + expiresIn);
  });
});

describe("verifyJwt", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("should verify a valid JWT and return its payload", () => {
    const token = signJwt("user-123", 3600);

    const payload = verifyJwt(token);

    expect(payload.sub).toBe("user-123");
    expect(payload.iat).toEqual(expect.any(Number));
    expect(payload.exp).toEqual(expect.any(Number));
  });

  it("should reject a tampered JWT", () => {
    const token = signJwt("user-123", 3600);

    const [header, encodedPayload, signature] = token.split(".");

    const tamperedPayload = Buffer.from(
      JSON.stringify({
        sub: "user-999",
        iat: 0,
        exp: 999999999,
      }),
      "utf8",
    ).toString("base64url");

    const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

    expect(() => verifyJwt(tamperedToken)).toThrowError(
      "Invalid token signature",
    );
  });

  it("should reject an expired JWT", () => {
    const token = signJwt("user-123", -1);

    expect(() => verifyJwt(token)).toThrowError("Token has expired");
  });

  it("should reject a token with an invalid format", () => {
    expect(() => verifyJwt("not-a-jwt")).toThrowError("Invalid token format");

    expect(() => verifyJwt("one.two")).toThrowError("Invalid token format");

    expect(() => verifyJwt("one.two.three.four")).toThrowError(
      "Invalid token format",
    );
  });

  it("should reject a malformed JWT header", () => {
    const token = `not-json.payload.signature`;

    expect(() => verifyJwt(token)).toThrowError("Invalid token format");
  });

  it("should reject a JWT with an unsupported algorithm", () => {
    const header = Buffer.from(
      JSON.stringify({
        alg: "HS512",
        typ: "JWT",
      }),
      "utf8",
    ).toString("base64url");

    const payload = Buffer.from(
      JSON.stringify({
        sub: "user-123",
        iat: 1000,
        exp: 9999999999,
      }),
      "utf8",
    ).toString("base64url");

    const token = `${header}.${payload}.signature`;

    expect(() => verifyJwt(token)).toThrowError("Invalid token header");
  });

  it("should reject a malformed JWT payload", () => {
    const header = Buffer.from(
      JSON.stringify({
        alg: "HS256",
        typ: "JWT",
      }),
      "utf8",
    ).toString("base64url");

    const token = `${header}.not-json.signature`;

    expect(() => verifyJwt(token)).toThrowError("Invalid token format");
  });

  it("should reject a token signed with a different secret", () => {
    const token = signJwt("user-123", 3600);

    process.env.JWT_SECRET = "different-secret";

    expect(() => verifyJwt(token)).toThrowError("Invalid token signature");
  });

  it("should throw if JWT_SECRET is missing", () => {
    delete process.env.JWT_SECRET;

    expect(() => signJwt("user-123", 3600)).toThrowError(
      "JWT_SECRET is not set",
    );
  });
});
