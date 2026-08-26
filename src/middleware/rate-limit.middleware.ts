import type { Request, Response, NextFunction } from "express";

type RateLimitEntry = {
  count: number;
  windowStart: number;
};

const clients = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000;
const MAX_REQ = 2;
const CLEANUP_INTERVAL_MS = 60 * 1000;

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const clientKey = req.ip ?? "unknown";
  const now = Date.now();

  setInterval(() => {
    const now = Date.now();

    for (const [clientKey, entry] of clients) {
      if (now - entry.windowStart >= WINDOW_MS) {
        clients.delete(clientKey);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  

  const entry = clients.get(clientKey);

  if (!entry) {
    clients.set(clientKey, {
      count: 1,
      windowStart: now,
    });

    return next();
  }

  const windowExpired = now - entry.windowStart >= WINDOW_MS;

  if (windowExpired) {
    clients.set(clientKey, {
      count: 1,
      windowStart: now,
    });

    return next();
  }

  entry.count++;

  const remaining = Math.max(0, MAX_REQ - entry.count);

  const resetAt = Math.ceil((entry.windowStart + WINDOW_MS) / 1000);

  res.setHeader("RateLimit-Limit", MAX_REQ);
  res.setHeader("RateLimit-Remaining", remaining);
  res.setHeader("RateLimit-Reset", resetAt);

  if (entry.count > MAX_REQ) {
    return res.status(429).json({
      error: "Too many requests",
    });
  }

  next();
}
