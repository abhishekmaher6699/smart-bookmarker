import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/app-error.js";
import { deleteUserCategory, getCategories, updateUserCategory } from "./category.service.js";

import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.schema.js";

import { createUserCategory } from "./category.service.js";

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

export async function createCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const result = createCategorySchema.safeParse(req.body);

    if (!result.success) {
      throw new AppError(400, "Invalid request");
    }

    const category = await createUserCategory(req.user.id, result.data.name);

    res.status(201).json({
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCategoryHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const categoryId = req.params.id;

    if (!categoryId) {
      throw new AppError(400, "Category ID is required");
    }

    const result = updateCategorySchema.safeParse(req.body);

    if (!result.success) {
      throw new AppError(400, "Invalid request");
    }

    const category = await updateUserCategory(
      categoryId,
      req.user.id,
      result.data.name,
    );

    if (!category) {
      throw new AppError(404, "Category not found");
    }

    res.status(200).json({
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategoryHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const categoryId = req.params.id;

    if (!categoryId) {
      throw new AppError(400, "Category ID is required");
    }

    const category = await deleteUserCategory(
      categoryId,
      req.user.id,
    );

    if (!category) {
      throw new AppError(404, "Category not found");
    }

    res.status(200).json({ data: category });
  } catch (error) {
    next(error);
  }
}