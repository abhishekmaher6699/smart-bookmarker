import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";


export function errorMiddleware(
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error(error);

    if (error instanceof AppError) {
        res.status(error.statusCode).json({
            error: error.message
        })
        return
    }

    res.status(500).json({
        error: "Internal server error",
    })

}
