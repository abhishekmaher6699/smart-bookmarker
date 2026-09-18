import { Resend } from "resend";

import type { EmailProvider } from "./email.provider.js";
import { env, requireEnv } from "../../config/env.js";

export class ResendEmailProvider implements EmailProvider {
  private readonly resend: Resend;

  constructor() {
    this.resend = new Resend(
      requireEnv(
        env.resendApiKey,
        "RESEND_API_KEY",
      ),
    );
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl =
      `http://localhost:3000/reset-password?token=${encodeURIComponent(resetToken)}`;

    const { error } = await this.resend.emails.send({
      from: env.emailFrom,
      to: [email],
      subject: "Reset your Smart Bookmarker password",
      html: `
        <h2>Password reset</h2>

        <p>
          You requested a password reset for your
          Smart Bookmarker account.
        </p>

        <p>
          <a href="${resetUrl}">
            Reset your password
          </a>
        </p>

        <p>
          This link will expire in 15 minutes.
        </p>

        <p>
          If you did not request this, you can safely ignore
          this email.
        </p>
      `,
    });

    if (error) {
      throw new Error(
        `Failed to send password reset email: ${error.message}`,
      );
    }
  }

  async sendEmailVerificationEmail(
    email: string,
    verificationToken: string,
  ): Promise<void> {
    const verificationUrl =
      `http://localhost:3000/verify-email?token=${encodeURIComponent(
        verificationToken,
      )}`;

    const { error } = await this.resend.emails.send({
      from: env.emailFrom,
      to: [email],
      subject: "Verify your Smart Bookmarker email",
      html: `
        <h2>Verify your email</h2>

        <p>
          Thanks for creating a Smart Bookmarker account.
        </p>

        <p>
          <a href="${verificationUrl}">
            Verify your email
          </a>
        </p>

        <p>
          This link will expire in 24 hours.
        </p>
      `,
    });

    if (error) {
      throw new Error(
        `Failed to send email verification: ${error.message}`,
      );
    }
  }
}