import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/app-error.js";
import { getCategories } from "./category.service.js";

export async function listCategoriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    res.json({ data: await getCategories(req.user.id) });
  } catch (error) {
    next(error);
  }
}
