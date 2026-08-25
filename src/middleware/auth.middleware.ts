import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { verifyJwt } from "../modules/auth/jwt.js";
import { AppError } from "../errors/app-error.js";


export function authMiddleware(req: Request, res: Response, next: NextFunction) {

    const authorization = req.headers.authorization;

    if (!authorization) {
        throw new AppError(
            401,
            "Authentication required",
            );
        
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
        throw new AppError(
            401,
            "Invalid authorization bearer",
            );
    }

    try {
        const payload = verifyJwt(token);

        req.user = {
            id: payload.sub,
        };

        next()
    } catch (error) {
        next(error)
    }


}