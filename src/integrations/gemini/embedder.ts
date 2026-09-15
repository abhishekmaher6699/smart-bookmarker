import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";

const ai = env.geminiApiKey
  ? new GoogleGenAI({
      apiKey: env.geminiApiKey,
    })
  : null;

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await ai.models.embedContent({
    model: env.geminiEmbeddingModel,
    contents: text,
    config: {
      outputDimensionality: env.geminiEmbeddingDimensions,
    },
  });

  const values = response.embeddings?.[0]?.values;

  if (!values?.length) {
    throw new Error("Gemini returned an empty embedding");
  }

  return values;
}
