import { GoogleGenAI } from "@google/genai";
import { env, requireEnv } from "../../config/env.js";

let client: GoogleGenAI | undefined;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({
      apiKey: requireEnv(env.geminiApiKey, "GEMINI_API_KEY"),
    });
  }

  return client;
}

export function isGeminiRateLimitError(
  error: unknown,
): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  if ("status" in error && error.status === 429) {
    return true;
  }

  return false;
}