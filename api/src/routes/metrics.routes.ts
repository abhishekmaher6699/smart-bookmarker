import { Router } from "express";

import {
  getMetrics,
  getMetricsContentType,
} from "../utils/metrics.js";

const router = Router();

router.get("/metrics", async (_req, res, next) => {
  try {
    res.setHeader("Content-Type", getMetricsContentType());

    res.status(200).send(await getMetrics());
  } catch (error) {
    next(error);
  }
});

export default router;