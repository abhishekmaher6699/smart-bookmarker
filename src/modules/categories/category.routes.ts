import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import {
  listCategoriesHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from "./category.controller.js";

const router = Router();

router.get("/", authMiddleware, listCategoriesHandler);
router.post("/", authMiddleware, createCategoryHandler);
router.patch("/:id", authMiddleware, updateCategoryHandler);
router.delete("/:id", authMiddleware, deleteCategoryHandler);

export default router;
