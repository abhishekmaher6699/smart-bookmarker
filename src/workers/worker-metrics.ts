import { createServer } from "node:http";

import { getMetrics, getMetricsContentType } from "../utils/metrics.js";

import { logger } from "../utils/logger.js";

const WORKER_METRICS_PORT = Number(process.env.WORKER_METRICS_PORT ?? 9091);

let metricsServer: ReturnType<typeof createServer> | null = null;

export function startWorkerMetricsServer() {
  metricsServer = createServer(async (req, res) => {
    if (req.method !== "GET" || req.url !== "/metrics") {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    try {
      const metrics = await getMetrics();
      res.statusCode = 200;
      res.setHeader("Content-Type", getMetricsContentType());
      res.end(metrics);
    } catch (error) {
      logger.error("Failed to collect worker metrics", {
        error: error instanceof Error ? error.message : String(error),
      });

      res.statusCode = 500;
      res.end("Failed to collect metrics");
    }
  });

  metricsServer.listen(WORKER_METRICS_PORT, "0.0.0.0", () => {
    logger.info("Worker metrics server started", {
      port: WORKER_METRICS_PORT,
    });
  });
}

export async function stopWorkerMetricsServer() {
  if (!metricsServer) {
    return;
  }

  const server = metricsServer;

  metricsServer = null;

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  logger.info("Worker metrics server stopped");
}
