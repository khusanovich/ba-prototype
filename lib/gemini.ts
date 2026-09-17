/**
 * Gemini API client for LLM and embeddings
 * Models: gemini-1.5-flash (chat), embedding-001 (embeddings)
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
 * Get the chat model with system instruction
 * Uses gemini-flash-latest (2025 available model)
 * Falls back to gemini-2.0-flash-exp if primary model has high demand
 */
export function getChatModel(useFallback: boolean = false) {
  const modelName = useFallback ? "gemini-2.0-flash-exp" : "gemini-flash-latest";
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_INSTRUCTION,
  });
}

/**
 * Simple hash-based embedding for prototyping
 * Converts text to a deterministic 768-dim vector
 * Note: This is NOT semantic - just for testing the pipeline
 */
function simpleTextEmbedding(text: string): number[] {
  const embedding = new Array(768).fill(0);

  // Simple deterministic hash-based approach
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const position = (charCode + i) % 768;
    embedding[position] += charCode / 1000;
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
}

/**
 * TEMPORARY: Generate simple embeddings
 * TODO: Replace with proper embedding service when available
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  console.log("⚠️  Using simple text hashing (not semantic embeddings)");
  return simpleTextEmbedding(text);
}

/**
 * TEMPORARY: Generate embeddings in batch
 * TODO: Replace with proper embedding service when available
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  console.log(`⚠️  Generating ${texts.length} simple embeddings (not semantic)...`);
  console.log("Note: This is a fallback for testing. Consider using a proper embedding API.");

  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i++) {
    embeddings.push(simpleTextEmbedding(texts[i]));

    if ((i + 1) % 10 === 0 || i === texts.length - 1) {
      console.log(`Progress: ${i + 1}/${texts.length}`);
    }
  }

  console.log(`✓ Generated ${embeddings.length} embeddings`);
  return embeddings;
}
