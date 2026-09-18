import { Router } from "express";

import { getMetrics } from "../utils/metrics.js";

const router = Router();

router.get("/metrics", (_req, res) => {
  const metrics = getMetrics();

  const averageHttpDurationMs =
    metrics.http.requestsWithDuration > 0
      ? metrics.http.totalDurationMs /
        metrics.http.requestsWithDuration
      : 0;

  const averageJobDurationMs =
    metrics.jobs.completedWithDuration > 0
      ? metrics.jobs.totalDurationMs /
        metrics.jobs.completedWithDuration
      : 0;

  res.status(200).json({
    counters: metrics.counters,

    http: {
      ...metrics.http,
      averageDurationMs: Number(
        averageHttpDurationMs.toFixed(2),
      ),
    },

    jobs: {
      ...metrics.jobs,
      averageCompletedDurationMs: Number(
        averageJobDurationMs.toFixed(2),
      ),
    },
  });
});

export default router;