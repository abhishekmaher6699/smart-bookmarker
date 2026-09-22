import { DevEmailProvider } from "./dev-email.provider.js";
import type { EmailProvider } from "./email.provider.js";
import { ResendEmailProvider } from "./resend-email-provider.js";

export const emailProvider: EmailProvider =
  new ResendEmailProvider();