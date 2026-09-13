/**
 * Gemini API client for LLM and embeddings
 * Models: gemini-1.5-flash (chat), text-embedding-004 (embeddings)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";

export const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Validate that Gemini is properly configured
 * Call this at runtime before using the client
 */
export function validateGeminiConfig() {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }
}

// System instruction in German for all chat interactions
export const SYSTEM_INSTRUCTION = `Du bist ein Lernassistent. Antworte immer auf Deutsch. Stütze dich ausschließlich auf das bereitgestellte Lernmaterial des Studierenden. Wenn die Information nicht im Material steht, sage das ehrlich. Gib bei jeder Antwort an, auf welchen Teil des Materials du dich stützt.`;

/**
 * Get the chat model (gemini-1.5-flash) with system instruction
 */
export function getChatModel() {
  return genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
  });
}

/**
 * Get the embedding model (text-embedding-004)
 */
export function getEmbeddingModel() {
  return genAI.getGenerativeModel({
    model: "text-embedding-004",
  });
}

/**
 * Generate embeddings for a text
 * Returns a 768-dimensional vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getEmbeddingModel();
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Generate embeddings for multiple texts (batch)
 * More efficient for ingestion
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  const model = getEmbeddingModel();
  const embeddings: number[][] = [];

  // Process in batches to avoid rate limits
  const BATCH_SIZE = 10;
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (text) => {
      const result = await model.embedContent(text);
      return result.embedding.values;
    });
    const batchResults = await Promise.all(batchPromises);
    embeddings.push(...batchResults);

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return embeddings;
}
