import type { Request, Response, NextFunction } from "express"
import { registerSchema, loginSchema, refreshTokenSchema } from "./auth.schema.js"
import { registerUser, loginUser, refreshAccessToken, logout } from "./auth.service.js"
import { z } from "zod"


export async function registerHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const result = registerSchema.safeParse(req.body);

        if (!result.success) {
            res.status(400).json({
                error: "Invalid request",
                details: z.flattenError(result.error)
            })
            return
        }

        const user = await registerUser(result.data)

        res.status(201).json(user)
        
    } catch (error) {
        next(error)
    }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
    try {

        const result = loginSchema.safeParse(req.body);

        if (!result.success) {
            res.status(400).json({
                error: "Invalid request",
                details: z.flattenError(result.error)
            })
            return
        }

        const user = await loginUser(result.data);
        res.status(200).json(user);
        
    } catch (error) {
        next(error)
    }
}

export async function refreshTokenHandler(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {

        const result = refreshTokenSchema.safeParse(req.body)

        if (!result.success) {
            res.status(400).json({
                error: "Invalid request",
                details: z.flattenError(result.error),
            });

            return;
        }

        const resultToken = await refreshAccessToken(
            result.data.refreshToken
        )

        res.status(200).json(resultToken)
    } 
    catch (error) {
        next(error)
    }
}

export async function logoutHandler(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {

        const result = refreshTokenSchema.safeParse(req.body)

        if (!result.success) {
            res.status(400).json({
                error: "Invalid request",
                details: z.flattenError(result.error),
            });

            return;
        }
        
        await logout(result.data.refreshToken)

        res.status(204).send()
    } catch (error) {
        next(error)
    }
}