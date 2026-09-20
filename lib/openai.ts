/**
 * OpenAI API client for LLM and embeddings
 * Models: gpt-4o-mini (chat), text-embedding-3-small (embeddings)
 */

import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY || "";

export const openai = new OpenAI({
  apiKey,
});

/**
 * Validate that OpenAI is properly configured
 */
export function validateOpenAIConfig() {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in environment variables");
  }
}

// System instruction in German for all chat interactions
export const SYSTEM_INSTRUCTION = `Du bist ein Lernassistent. Antworte immer auf Deutsch. Stütze dich ausschließlich auf das bereitgestellte Lernmaterial des Studierenden. Wenn die Information nicht im Material steht, sage das ehrlich. Gib bei jeder Antwort an, auf welchen Teil des Materials du dich stützt.`;

/**
 * Get chat model (gpt-4o-mini - fast and cheap)
 */
export function getChatModel() {
  return "gpt-4o-mini";
}

/**
 * Generate embeddings using text-embedding-3-small (1536 dimensions)
 * Much cheaper and better than Gemini embeddings
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("OpenAI embedding error:", error);
    throw error;
  }
}

/**
 * Generate embeddings in batch
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  console.log(`Generating ${texts.length} embeddings with OpenAI...`);

  try {
    // OpenAI allows batch embedding (up to 2048 inputs at once)
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
      encoding_format: "float",
    });

    const embeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);

    console.log(`✓ Generated ${embeddings.length} embeddings`);
    return embeddings;
  } catch (error) {
    console.error("OpenAI batch embedding error:", error);
    throw error;
  }
}

/**
 * Chat completion with streaming support
 */
export async function createChatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  stream: boolean = false
) {
  return openai.chat.completions.create({
    model: getChatModel(),
    messages,
    stream,
    temperature: 0.7,
    max_tokens: 2000,
  });
}
