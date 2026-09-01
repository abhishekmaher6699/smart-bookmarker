import type { Request, Response, NextFunction } from "express";

type RateLimitEntry = {
  count: number;
  windowStart: number;
};

const clients = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000;
const MAX_REQ = 50;
const CLEANUP_INTERVAL_MS = 60 * 1000;

setInterval(() => {
  const now = Date.now();

  for (const [clientKey, entry] of clients) {
    if (now - entry.windowStart >= WINDOW_MS) {
      clients.delete(clientKey);
    }
  }
}, CLEANUP_INTERVAL_MS);

export function rateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const clientKey = req.ip ?? "unknown";
  const now = Date.now();

  let entry = clients.get(clientKey);

  // Start a new fixed window.
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    entry = {
      count: 0,
      windowStart: now,
    };

    clients.set(clientKey, entry);
  }

  const resetAt = Math.ceil(
    (entry.windowStart + WINDOW_MS) / 1000,
  );

  // Reject before incrementing.
  if (entry.count >= MAX_REQ) {
    res.setHeader("RateLimit-Limit", MAX_REQ);
    res.setHeader("RateLimit-Remaining", 0);
    res.setHeader("RateLimit-Reset", resetAt);

    return res.status(429).json({
      error: "Too many requests",
    });
  }

  // This request is accepted.
  entry.count++;

  const remaining = MAX_REQ - entry.count;

  res.setHeader("RateLimit-Limit", MAX_REQ);
  res.setHeader("RateLimit-Remaining", remaining);
  res.setHeader("RateLimit-Reset", resetAt);

  next();
}