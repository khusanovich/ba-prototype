/**
 * Test API to verify RAG retrieval works
 * Call this with a documentId and query to test the vector search
 */

import { NextRequest, NextResponse } from "next/server";
import { retrieveChunks, formatChunksAsContext, extractPageNumbers } from "@/lib/rag";

export async function POST(request: NextRequest) {
  try {
    const { documentId, query } = await request.json();

    if (!documentId || !query) {
      return NextResponse.json(
        { error: "documentId and query are required" },
        { status: 400 }
      );
    }

    console.log("Testing retrieval for:", { documentId, query });

    // Retrieve relevant chunks
    const chunks = await retrieveChunks(query, documentId, 5);

    // Format as context
    const context = formatChunksAsContext(chunks);

    // Extract page numbers
    const pageNumbers = extractPageNumbers(chunks);

    return NextResponse.json({
      success: true,
      query,
      chunksFound: chunks.length,
      pageNumbers,
      chunks: chunks.map(chunk => ({
        id: chunk.id,
        content: chunk.content.substring(0, 200) + "...", // Preview
        pageNumber: chunk.page_number,
        similarity: chunk.similarity,
      })),
      formattedContext: context.substring(0, 500) + "...", // Preview
    });
  } catch (error) {
    console.error("Test retrieval error:", error);
    return NextResponse.json(
      {
        error: "Failed to test retrieval",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
