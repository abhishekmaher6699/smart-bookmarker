import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/app-error.js";
import {
  hybridSearchCaptures,
  searchCaptures,
  semanticSearchCaptures,
} from "./search.service.js";
import { searchCapturesSchema } from "./search.schema.js";

export async function searchCapturesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = searchCapturesSchema.safeParse(req.query);

    if (!result.success) {
      throw new AppError(400, "Invalid request");
    }

    const { limit, offset, search, categoryIds, type, tag, sort, mode } =
      result.data;

    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const userId = req.user.id;

    if (mode === "semantic") {
      if (!search) {
        throw new AppError(400, "Search query is required for semantic search");
      }

      const captures = await semanticSearchCaptures(
        userId,
        search,
        limit,
        offset,
      );

      const hasPrevious = offset > 0;
      const hasNext = offset + captures.rows.length < captures.total;

      return res.json({
        data: captures.rows,
        pagination: {
          limit,
          offset,
          total: captures.total,
          hasNext,
          hasPrevious,
        },
      });
    }

    if (mode === "hybrid") {
      if (!search) {
        throw new AppError(400, "Search query is required for semantic search");
      }

      const captures = await hybridSearchCaptures(
        userId,
        search,
        limit,
        offset,
        categoryIds,
        type,
        tag,
        sort,
      );

      const hasPrevious = offset > 0;
      const hasNext = offset + captures.rows.length < captures.total;

      return res.json({
        data: captures.rows,
        pagination: {
          limit,
          offset,
          total: captures.total,
          hasNext,
          hasPrevious,
        },
      });
    }

    const captures = await searchCaptures(
      userId,
      limit,
      offset,
      categoryIds,
      search,
      type,
      tag,
      sort,
    );

    const hasPrevious = offset > 0;
    const hasNext = offset + captures.rows.length < captures.total;

    res.json({
      data: captures.rows,
      pagination: {
        limit,
        offset,
        total: captures.total,
        hasNext,
        hasPrevious,
      },
    });
  } catch (error) {
    next(error);
  }
}
