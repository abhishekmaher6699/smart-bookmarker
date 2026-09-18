import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import { logger } from "../utils/logger.js";


export function errorMiddleware(
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) {
    logger.error("Request failed", {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof AppError) {
        res.status(error.statusCode).json({
            error: error.message,
            requestId: req.requestId,
        })
        return
    }

    res.status(500).json({
        error: "Internal server error",
        requestId: req.requestId,
    })

}
