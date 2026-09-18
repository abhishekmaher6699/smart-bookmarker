import type { NextFunction, Request, Response } from "express";

import { logger } from "../utils/logger.js";
import { incrementMetric, recordHttpDuration } from "../utils/metrics.js";

export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const start = Date.now();

  res.on("finish", () => {

    const durationMs = Date.now() - start

    incrementMetric("http_requests_total")
    recordHttpDuration(durationMs)

    if (res.statusCode >= 400) {
        incrementMetric("http_errors_total")
    }

    logger.info("Request completed", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    });
  });

  next();
}
