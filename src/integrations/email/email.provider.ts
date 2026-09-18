export interface EmailProvider {
  sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void>;

  sendEmailVerificationEmail(
    email: string,
    verificationToken: string,
  ): Promise<void>;
}