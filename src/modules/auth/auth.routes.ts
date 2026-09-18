import { Router } from "express";
import {
  changePasswordHandler,
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  refreshTokenHandler,
  registerHandler,
  resetPasswordHandler,
  verifyEmailHandler,
} from "./auth.controller.js";
import {
  RATE_LIMITS,
  rateLimit,
} from "../../middleware/rate-limit.middleware.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/register",
  rateLimit("register", RATE_LIMITS.register, "ip"),
  registerHandler,
);
router.post(
  "/login",
  rateLimit("login", RATE_LIMITS.login, "ip"),
  loginHandler,
);
router.post(
  "/refresh",
  rateLimit("refresh", RATE_LIMITS.refresh, "ip"),
  refreshTokenHandler,
);
router.post("/logout", logoutHandler);
router.post("/change-password", authMiddleware, changePasswordHandler);

router.post(
  "/forgot-password",
  rateLimit("forgotPassword", RATE_LIMITS.forgotPassword, "ip"),
  forgotPasswordHandler,
);

router.post(
  "/reset-password",
  rateLimit("resetPassword", RATE_LIMITS.resetPassword, "ip"),
  resetPasswordHandler,
);

router.post(
  "/verify-email",
  rateLimit("verifyEmail", RATE_LIMITS.verifyEmail, "ip"),
  verifyEmailHandler,
);

export default router;
