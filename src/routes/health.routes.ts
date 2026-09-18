import { Router } from "express";

import { pool } from "../db/client.js";
import { redis } from "../lib/redis.js";

const router = Router()

router.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
    })
})

router.get("/ready", async (_req, res, next) => {
    try {

        await pool.query("SELECT 1")
        await redis.ping()

        res.status(200).json({
            status: "ready",
            dependencies: {
                database: "ok",
                redis: "ok",
            }
        })
    } catch (error) {
        next(error)
    }
})

export default router