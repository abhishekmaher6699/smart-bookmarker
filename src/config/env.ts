function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();

  return value || undefined;
}

function getPort(): number {
  const raw = process.env.PORT?.trim() ?? "3000";
  const port = Number.parseInt(raw, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be a valid TCP port");
  }

  return port;
}


function getPositiveInteger(
  name: string,
  fallback: number,
): number {
  const raw = getOptionalEnv(name);

  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

export const env = {
  nodeEnv: getOptionalEnv("NODE_ENV") ?? "development",

  port: getPort(),

  databaseUrl: getOptionalEnv("DATABASE_URL"),

  geminiApiKey: getOptionalEnv("GEMINI_API_KEY"),
  geminiModel:
    getOptionalEnv("GEMINI_MODEL") ??
    "gemini-3.1-flash-lite",
  geminiTimeoutMs: 12_000,

  geminiEmbeddingModel:
    getOptionalEnv("GEMINI_EMBEDDING_MODEL") ??
    "gemini-embedding-2",

  geminiEmbeddingDimensions:
    getPositiveInteger(
      "GEMINI_EMBEDDING_DIMENSIONS",
      768,
    ),

  resendApiKey: getOptionalEnv("RESEND_API_KEY"),

  emailFrom:
    getOptionalEnv("EMAIL_FROM") ??
    "onboarding@resend.dev",

  corsOrigin:
    getOptionalEnv("CORS_ORIGIN") ??
    "http://localhost:3000",
} as const;

export function requireEnv(
  value: string | undefined,
  name: string,
): string {
  if (!value) {
    throw new Error(
      `${name} environment variable is not set`,
    );
  }

  return value;
}

export function validateEnvironment() {
  requireEnv(env.databaseUrl, "DATABASE_URL");

  if (
    env.geminiApiKey &&
    !env.geminiModel
  ) {
    throw new Error(
      "GEMINI_MODEL must be configured when GEMINI_API_KEY is set",
    );
  }

  if (
    env.resendApiKey &&
    !env.emailFrom
  ) {
    throw new Error(
      "EMAIL_FROM must be configured when RESEND_API_KEY is set",
    );
  }

  if (!["development", "test", "production"].includes(env.nodeEnv)) {
    throw new Error(
      "NODE_ENV must be development, test, or production",
    );
  }
}