/**
 * RAG (Retrieval-Augmented Generation) utilities
 * Handles query embedding and chunk retrieval
 */

import { generateEmbedding } from "./openai";
import { supabase, type MatchedChunk } from "./supabase";

/**
 * Retrieve relevant chunks for a query using semantic search
 * @param query - The user's question or query
 * @param documentId - The document to search in
 * @param matchCount - Number of top chunks to retrieve (default: 5)
 * @returns Array of matched chunks with similarity scores
 */
export async function retrieveChunks(
  query: string,
  documentId: string,
  matchCount: number = 5
): Promise<MatchedChunk[]> {
  // 1. Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // 2. Call the match_chunks function in Supabase
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_document_id: documentId,
    match_count: matchCount,
  });

  if (error) {
    console.error("Error retrieving chunks:", error);
    throw new Error(`Failed to retrieve chunks: ${error.message}`);
  }

  return data || [];
}

/**
 * Format retrieved chunks as context for LLM prompt
 * @param chunks - Array of matched chunks
 * @returns Formatted context string with sources
 */
export function formatChunksAsContext(chunks: MatchedChunk[]): string {
  if (chunks.length === 0) {
    return "Keine relevanten Informationen im hochgeladenen Material gefunden.";
  }

  let context = "Relevante Ausschnitte aus dem Lernmaterial:\n\n";

  chunks.forEach((chunk, index) => {
    const pageInfo = chunk.page_number
      ? `(Seite ${chunk.page_number})`
      : "(Seite unbekannt)";
    context += `[${index + 1}] ${pageInfo}\n${chunk.content}\n\n`;
  });

  return context;
}

/**
 * Extract page numbers from retrieved chunks for citation
 * @param chunks - Array of matched chunks
 * @returns Array of unique page numbers, sorted
 */
export function extractPageNumbers(chunks: MatchedChunk[]): number[] {
  const pageNumbers = chunks
    .map((chunk) => chunk.page_number)
    .filter((page): page is number => page !== null);

  // Return unique, sorted page numbers
  return [...new Set(pageNumbers)].sort((a, b) => a - b);
}
