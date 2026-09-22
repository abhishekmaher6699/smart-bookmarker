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
    const durationMs = Date.now() - start;

    const labels = {
      method: req.method,
      route: req.route?.path ?? req.path,
      status_code: String(res.statusCode),
    };

    if (req.path !== "/metrics") {
      incrementMetric("http_requests_total", 1, labels);

      if (res.statusCode >= 400) {
        incrementMetric("http_errors_total", 1, labels);
      }

      recordHttpDuration(durationMs, labels);
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
