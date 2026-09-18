import type { NextFunction, Request, Response } from "express";

export function securityMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  res.setHeader("X-Content-Type-Options", "nosniff");

  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );

  res.setHeader(
    "X-Frame-Options",
    "DENY",
  );

  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  next();
}