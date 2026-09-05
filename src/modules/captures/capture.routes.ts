import { Router } from "express"
import { createCaptureHandler, deleteCaptureHandler, getCaptureHandler, listCapturesByUserHandler, retryCaptureEnrichmentHandler, updateCaptureHandler } from "./capture.controller.js"
import { RATE_LIMITS, rateLimit } from "../../middleware/rate-limit.middleware.js"

import { authMiddleware } from "../../middleware/auth.middleware.js"

const router = Router();

router.post("/", authMiddleware, rateLimit("captures", RATE_LIMITS.captureCreate, "user"), createCaptureHandler)
router.get("/", authMiddleware, listCapturesByUserHandler)
router.post("/:id/retry-enrichment", authMiddleware, retryCaptureEnrichmentHandler)
router.get("/:id", authMiddleware, getCaptureHandler,)
router.patch("/:id", authMiddleware, updateCaptureHandler)
router.delete("/:id", authMiddleware, deleteCaptureHandler)


export default router
