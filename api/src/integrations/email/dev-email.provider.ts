import type { EmailProvider } from "./email.provider.js";

export class DevEmailProvider implements EmailProvider {
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    console.log(
      `[DEV EMAIL] Password reset for ${email}`,
    );

    console.log(
      `[DEV EMAIL] Reset link: /reset-password?token=${resetToken}`,
    );
  }

  async sendEmailVerificationEmail(
    email: string,
    verificationToken: string,
  ): Promise<void> {
    console.log(
      `[DEV EMAIL] Email verification for ${email}`,
    );

    console.log(
      `[DEV EMAIL] Verification link: /verify-email?token=${verificationToken}`,
    );
  }
}