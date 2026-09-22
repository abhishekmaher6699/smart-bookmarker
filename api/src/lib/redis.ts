import {createClient} from "redis";
import { logger } from "../utils/logger.js";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is not configured");
}

export const redis = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: false,
  }
});


redis.on("error", (error) => {
    console.error("Redis error:", error)
})

export async function connectRedis() {
    if (!redis.isOpen) {
        await redis.connect()
        logger.info("Connected to Redis")
    }
}

export async function disconnectRedis() {
    if (redis.isOpen) {
        await redis.quit()
        logger.info("Disconnected from Redis")
    }
}