import { Router } from "express"
import { loginHandler, logoutHandler, refreshTokenHandler, registerHandler } from "./auth.controller.js"

const router = Router();

router.post("/register", registerHandler)
router.post("/login", loginHandler)
router.post("/refresh", refreshTokenHandler)
router.post("/logout", logoutHandler)

export default router