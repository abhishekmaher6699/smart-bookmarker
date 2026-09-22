import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { searchCapturesHandler } from "./search.controller.js";

const router = Router();

router.get("/", authMiddleware, searchCapturesHandler);

export default router;