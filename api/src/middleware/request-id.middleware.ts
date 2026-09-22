import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = req.header("x-request-id") ?? randomUUID();

  res.setHeader("X-Request-Id", requestId);

  req.requestId = requestId;

  next();
}