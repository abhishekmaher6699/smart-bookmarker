import type { Request, Response, NextFunction } from "express";

type TokenBucket = {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();
const CAPACITY = 30
const REFILL_RATE = 1
const CLEANUP_INTERVAL_MS = 60 * 1000;

setInterval(() => {
  const now = Date.now();

  for (const [clientKey, bucket] of buckets) {
    const elapsedSec = (now - bucket.lastRefill) / 1000;

    if (elapsedSec >= 60) {
      buckets.delete(clientKey)
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

  let bucket = buckets.get(clientKey);

  if (!bucket) {
    bucket = {
      tokens: CAPACITY,
      lastRefill: now,
    }

    buckets.set(clientKey, bucket)
  }

  const elapsedSeconds = (now - bucket.lastRefill) / 1000

  bucket.tokens = Math.min(
    CAPACITY,
    bucket.tokens + elapsedSeconds * REFILL_RATE
  )

  bucket.lastRefill = now

  if (bucket.tokens < 1) {
    res.setHeader("RateLimit-Limit", CAPACITY);
    res.setHeader("RateLimit-Remaining", Math.floor(bucket.tokens))
  
    return res.status(429).json({
      error: "TOo many requests"
    })
  }

  bucket.tokens -= 1

  res.setHeader("RateLimit-Limit", CAPACITY);
  res.setHeader(
    "RateLimit-Remaining",
    Math.floor(bucket.tokens),
  );

  next();
}