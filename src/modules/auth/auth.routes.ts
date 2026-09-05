import { Router } from "express"
import { loginHandler, logoutHandler, refreshTokenHandler, registerHandler } from "./auth.controller.js"
import { RATE_LIMITS, rateLimit } from "../../middleware/rate-limit.middleware.js";

const router = Router();

router.post("/register", rateLimit("register", RATE_LIMITS.register, "ip"), registerHandler)
router.post("/login",rateLimit("login", RATE_LIMITS.login, "ip"), loginHandler)
router.post("/refresh", rateLimit("refresh", RATE_LIMITS.refresh, "ip"), refreshTokenHandler)
router.post("/logout", logoutHandler)

export default router