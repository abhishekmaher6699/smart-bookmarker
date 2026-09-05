import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { connectRedis, disconnectRedis } from "./lib/redis.js";

async function start() {
  await connectRedis();

  const server = app.listen(env.port, () => {
    logger.info("API server started", { port: env.port });
  });

  const shutdown = async (signal: string) => {
    logger.info("Shutdown signal received", {
      signal,
    });

    server.close(async () => {
      try {
        await disconnectRedis();

        logger.info("Shutdown complete");

        process.exit(0);
      } catch (error) {
        logger.error("Shutdown failed", {
          error: error instanceof Error ? error.message : String(error),
        });

        process.exit(1);
      }
    });
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM")
  })

    process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}


start().catch((error) => {
    logger.error("Failed to start application", {
        error: error instanceof Error
        ? error.message
        : String(error)
    })

    process.exit(1)
})