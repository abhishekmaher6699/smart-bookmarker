function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export const env = {
  port: Number.parseInt(process.env.PORT ?? "3000", 10),
  databaseUrl: getOptionalEnv("DATABASE_URL"),
  geminiApiKey: getOptionalEnv("GEMINI_API_KEY"),
  geminiModel: getOptionalEnv("GEMINI_MODEL") ?? "gemini-3.1-flash-lite",
  geminiTimeoutMs: 12_000,
  geminiEmbeddingModel: getOptionalEnv("GEMINI_EMBEDDING_MODEL") ?? "gemini-embedding-2",
  geminiEmbeddingDimensions: Number.parseInt(getOptionalEnv("GEMINI_EMBEDDING_DIMENSIONS") ?? "768", 10),

  resendApiKey: getOptionalEnv("RESEND_API_KEY"),
  emailFrom: getOptionalEnv("EMAIL_FROM") ?? "onboarding@resend.dev",
} as const;

export function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }

  return value;
}
