import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/app-error.js";
import { searchCaptures } from "./search.service.js";
import { searchCapturesSchema } from "./search.schema.js";

export async function searchCapturesHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const result = searchCapturesSchema.safeParse(req.query);
        
        if (!result.success) {
            throw new AppError(400, "Invalid request");
        }

        const { limit, offset, search, categoryIds, type, tag, sort } = result.data;

        if (!req.user) {
            throw new AppError(401, "Authentication required");
        }

        const userId = req.user.id;

        const captures = await searchCaptures(
            userId,
            limit,
            offset,
            categoryIds,
            search,
            type,
            tag, 
            sort
        )
        
        const hasPrevious = offset > 0
        const hasNext = offset + captures.rows.length < captures.total

        res.json({
            data: captures.rows,
            pagination: {
                limit, 
                offset,
                total: captures.total,
                hasNext,
                hasPrevious
            },
        });
    } catch (error) {

        next(error)
    }
}