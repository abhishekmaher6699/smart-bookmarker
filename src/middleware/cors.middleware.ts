import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { error } from "node:console";

export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {

    const origin = req.header("Origin")

    if (origin && origin === env.corsOrigin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-Id");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    }

    if (req.method === "OPTIONS") {
        if (origin !== env.corsOrigin) {
            res.status(403).json({
                error: "CORS origin not allowed",
            })

            return
        }

        res.status(204).end()
        return
    }

    next()
}