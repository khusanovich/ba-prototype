/**
 * Text chunking utilities for RAG
 * Splits text into overlapping chunks for embedding
 */

export interface TextChunk {
  content: string;
  pageNumber: number | null;
  chunkIndex: number;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into chunks with overlap
 * @param text - The text to chunk
 * @param pageNumber - Optional page number for source tracking
 * @param targetTokens - Target size in tokens (~500-800 recommended)
 * @param overlapTokens - Overlap between chunks (~100 recommended)
 */
export function chunkText(
  text: string,
  pageNumber: number | null = null,
  targetTokens: number = 600,
  overlapTokens: number = 100
): TextChunk[] {
  const chunks: TextChunk[] = [];

  // Convert token counts to character estimates
  const targetChars = targetTokens * 4;
  const overlapChars = overlapTokens * 4;

  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < text.length) {
    // Calculate end index for this chunk
    let endIndex = startIndex + targetChars;

    // If this is not the last chunk, try to break at a sentence boundary
    if (endIndex < text.length) {
      // Look for sentence endings within the target range
      const searchStart = Math.max(startIndex + targetChars - 200, startIndex);
      const searchEnd = Math.min(startIndex + targetChars + 200, text.length);
      const searchText = text.substring(searchStart, searchEnd);

      // Find the last sentence ending (., !, ?) before the target
      const sentenceEndings = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
      let bestBreak = -1;

      for (const ending of sentenceEndings) {
        const pos = searchText.lastIndexOf(ending, targetChars - (searchStart - startIndex));
        if (pos > bestBreak) {
          bestBreak = pos + ending.length;
        }
      }

      if (bestBreak > 0) {
        endIndex = searchStart + bestBreak;
      }
    }

    // Extract the chunk
    const chunkContent = text.substring(startIndex, Math.min(endIndex, text.length)).trim();

    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        pageNumber,
        chunkIndex,
      });
      chunkIndex++;
    }

    // Move start index forward, accounting for overlap
    startIndex = endIndex - overlapChars;

    // Ensure we make progress
    if (startIndex <= chunks[chunks.length - 1]?.content.length + (chunks.length > 1 ? overlapChars : 0)) {
      startIndex = endIndex;
    }
  }

  return chunks;
}

/**
 * Chunk an entire document with page information
 * @param pages - Array of {pageNumber, text} objects
 */
export function chunkDocument(
  pages: Array<{ pageNumber: number; text: string }>
): TextChunk[] {
  const allChunks: TextChunk[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const pageChunks = chunkText(page.text, page.pageNumber);

    // Update global chunk indices
    for (const chunk of pageChunks) {
      allChunks.push({
        ...chunk,
        chunkIndex: globalChunkIndex++,
      });
    }
  }

  return allChunks;
}
