function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export const env = {
  port: Number.parseInt(process.env.PORT ?? "3000", 10),
  databaseUrl: getOptionalEnv("DATABASE_URL"),
  geminiApiKey: getOptionalEnv("GEMINI_API_KEY"),
  geminiModel: getOptionalEnv("GEMINI_MODEL") ?? "gemini-2.5-flash-lite",
  geminiTimeoutMs: 12_000,
} as const;

export function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }

  return value;
}
