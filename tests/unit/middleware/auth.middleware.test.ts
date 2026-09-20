import { describe, expect, it, vi, beforeEach } from "vitest";
import { authMiddleware } from "../../../src/middleware/auth.middleware";
import { signJwt } from "../../../src/modules/auth/jwt";

describe("authMiddleware", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("should throw 401 when authorization header is missing", () => {
    const req = { headers: {} } as any;
    const res = {} as any;
    const next = vi.fn();

    expect(() => authMiddleware(req, res, next)).toThrow(
      "Authentication required",
    );

    expect(next).not.toHaveBeenCalled();
  });

  it("should throw 401 when authorization scheme is not Bearer", () => {
    const req = {
      headers: {
        authorization: "Basic abc123",
      },
    } as any;

    const res = {} as any;
    const next = vi.fn();

    expect(() => authMiddleware(req, res, next)).toThrowError(
      "Invalid authorization bearer",
    );

    expect(next).not.toHaveBeenCalled();
  });

  it("should throw 401 when Bearer token is missing", () => {
    const req = {
      headers: {
        authorization: "Bearer",
      },
    } as any;

    const res = {} as any;
    const next = vi.fn();

    expect(() => authMiddleware(req, res, next)).toThrowError(
      "Invalid authorization bearer",
    );

    expect(next).not.toHaveBeenCalled();
  });

  it("should call next with an erro when JWT verification fails", () => {
    const req = {
      headers: {
        authorization: "Bearer invalid-token",
      },
    } as any;

    const res = {} as any;
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("should populate req.user and call next for a valid JWT", () => {
    const token = signJwt("user-123", 3600);

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as any;

    const res = {} as any;
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(req.user).toEqual({
      id: "user-123",
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
