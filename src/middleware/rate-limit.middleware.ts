import type { Request, Response, NextFunction } from "express";
import { redis } from "../lib/redis.js";

export type RateLimitPolicy = {
  capacity: number;
  refillRate: number;
};

export const RATE_LIMITS = {
  global: {
    capacity: 100,
    refillRate: 100 / 60,
  },

  login: {
    capacity: 5,
    refillRate: 5 / 60,
  },

  register: {
    capacity: 3,
    refillRate: 3 / 60,
  },

  refresh: {
    capacity: 10,
    refillRate: 10 / 60,
  },

  captureCreate: {
    capacity: 2,
    refillRate: 2 / 60,
  },
} satisfies Record<string, RateLimitPolicy>;

const TTL_SECONDS = 120;

const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]

local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local data = redis.call("HMGET", key, "tokens", "lastRefill")

local tokens = tonumber(data[1])
local lastRefill = tonumber(data[2])

if tokens == nil then
    tokens = capacity
    lastRefill = now
else
    local elapsed = math.max(0, now - lastRefill)

    tokens = math.min(
        capacity,
        tokens + elapsed * refillRate
    )

    lastRefill = now
end

local allowed = 0

if tokens >= 1 then
    tokens = tokens - 1
    allowed = 1
end

redis.call(
    "HSET",
    key,
    "tokens",
    tokens,
    "lastRefill",
    lastRefill
)

redis.call("EXPIRE", key, ttl)

return {
    allowed,
    tokens
}
`;

export function rateLimit(policyName: string, policy: RateLimitPolicy) {
  return async function rateLimit(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const clientKey = req.ip ?? "unknown";
    const redisKey = `rate-limit:${policyName}:${clientKey}`;

    const now = Date.now() / 1000;

    const result = (await redis.eval(TOKEN_BUCKET_SCRIPT, {
      keys: [redisKey],
      arguments: [
        String(policy.capacity),
        String(policy.refillRate),
        String(now),
        String(TTL_SECONDS),
      ],
    })) as [number, number];

    const [allowed, remainingTokens] = result;

    console.log({
      clientKey,
      redisKey,
      allowed,
      remainingTokens,
    });

    res.setHeader("RateLimit-Limit", policy.capacity);
    res.setHeader(
      "RateLimit-Remaining",
      Math.floor(Math.max(0, remainingTokens)),
    );

    if (!allowed) {
      res.setHeader("Retry-After", "2");

      return res.status(429).json({
        error: "Too many requests",
      });
    }

    next();
  };
}
