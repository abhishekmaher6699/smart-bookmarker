import { Router } from "express"
import { createCaptureHandler, deleteCaptureHandler, getCaptureHandler, listCapturesByUserHandler, updateCaptureHandler } from "./capture.controller.js"


import { authMiddleware } from "../../middleware/auth.middleware.js"

const router = Router();

router.post("/", authMiddleware, createCaptureHandler)
router.get("/", authMiddleware, listCapturesByUserHandler)
router.get("/:id", authMiddleware, getCaptureHandler,)
router.patch("/:id", authMiddleware, updateCaptureHandler)
router.delete("/:id", authMiddleware, deleteCaptureHandler)


export default router