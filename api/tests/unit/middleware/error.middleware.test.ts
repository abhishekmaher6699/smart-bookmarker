import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorMiddleware } from "../../../src/middleware/error.middleware";
import { AppError } from "../../../src/errors/app-error";

vi.mock("../../../src/utils/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { logger } from "../../../src/utils/logger";

describe("errorMiddleware", () => {
  const req = {
    requestId: "req-123",
    method: "GET",
    originalUrl: "/api/test",
  } as any;

  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 response for an AppError", () => {
    const res = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    const error = new AppError(400, "Invalid input");

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid input",
      requestId: "req-123",
    });
  });

  it("should return 500 response for an unknown error", () => {
    const res = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    const error = new Error("Database connection failed");

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      error: "Internal server error",
      requestId: "req-123",
    });
  });
  it("should return 500 response when the error is not an Error object", () => {
    const res = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    errorMiddleware("something went wrong", req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      error: "Internal server error",
      requestId: "req-123",
    });
  });

  it("should not send a response when headers have already been sent", () => {
    const res = {
      headersSent: true,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    const error = new Error("Something failed");

    errorMiddleware(error, req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("should log the request failure", () => {
    const res = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    const error = new Error("Something failed");

    errorMiddleware(error, req, res, next);

    expect(logger.error).toHaveBeenCalledWith("Request failed", {
      requestId: "req-123",
      method: "GET",
      path: "/api/test",
      error: "Something failed",
    });s
  });
});
