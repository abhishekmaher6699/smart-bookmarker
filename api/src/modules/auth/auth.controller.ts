import type { Request, Response, NextFunction } from "express"
import { registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema } from "./auth.schema.js"
import { registerUser, loginUser, refreshAccessToken, logout, changePassword, forgotPassword, resetPassword, verifyEmail } from "./auth.service.js"
import { z } from "zod"
import { AppError } from "../../errors/app-error.js";
import { error } from "node:console";


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

export async function changePasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const result = changePasswordSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: "Invalid request",
        details: z.flattenError(result.error),
      });

      return;
    }

    await changePassword(
      req.user.id,
      result.data,
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function forgotPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = forgotPasswordSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: "Invalid request",
        details: z.flattenError(result.error),
      });
      return;
    }

    await forgotPassword(result.data.email);

    // Always return the same response.
    // This prevents account enumeration.
    res.status(200).json({
      message:
        "If the account exists, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = resetPasswordSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: "Invalid request",
        details: z.flattenError(result.error),
      });
      return;
    }

    await resetPassword(
      result.data.token,
      result.data.newPassword,
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}


export async function verifyEmailHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {

    try {

      const result = verifyEmailSchema.safeParse(req.body)

      if (!result.success) {
        res.status(400).json({
          error: "Invalid request",
          details: z.flattenError(result.error)
        })

        return
      }

      await verifyEmail(result.data.token)

      res.status(204).send()
    } catch (error) {
      next(error)
    }
}

export async function verifyEmailLinkHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.query.token;

    if (typeof token !== "string" || !token) {
      res.status(400).send("Invalid verification link");
      return;
    }

    await verifyEmail(token);

    res.status(200).send(`
      <html>
        <body>
          <h1>Email verified successfully</h1>
          <p>Your email has been verified.</p>
        </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
}
