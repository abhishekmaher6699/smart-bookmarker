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
