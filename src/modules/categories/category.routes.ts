import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { listCategoriesHandler } from "./category.controller.js";

const router = Router();

router.get("/", authMiddleware, listCategoriesHandler);

export default router;
