/**
 * Chat API with RAG and Streaming
 *
 * Implements Feature B (DP2: Responsiveness)
 * - Context-aware chat grounded in student's material
 * - Streaming responses for immediate feedback
 * - Multi-turn conversation support
 */

import { NextRequest } from "next/server";
import { getChatModel } from "@/lib/gemini";
import { retrieveChunks, formatChunksAsContext } from "@/lib/rag";

export async function POST(request: NextRequest) {
  try {
    const { documentId, message, history } = await request.json();

    if (!documentId || !message) {
      return new Response(
        JSON.stringify({ error: "documentId and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Retrieve relevant chunks using RAG
    const chunks = await retrieveChunks(message, documentId, 5);

    // 2. Format chunks as context
    const context = formatChunksAsContext(chunks);

    // 3. Build conversation history
    const conversationHistory = history || [];

    // 4. Create the chat model
    const model = getChatModel();

    // 5. Build the prompt with context
    const prompt = `${context}

Basierend auf dem obigen Lernmaterial beantworte die folgende Frage des Studierenden:

${message}

Wichtig:
- Beziehe dich ausschließlich auf das bereitgestellte Material
- Gib die Seitenzahlen an, auf die du dich stützt
- Wenn die Information nicht im Material steht, sage das ehrlich
- Antworte auf Deutsch`;

    // 6. Start chat session
    const chat = model.startChat({
      history: conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
    });

    // 7. Send message and stream response
    const result = await chat.sendMessageStream(prompt);

    // 8. Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream the text chunks
          for await (const chunk of result.stream) {
            const text = chunk.text();
            controller.enqueue(encoder.encode(text));
          }

          // Send metadata about sources at the end
          const metadata = {
            pageNumbers: chunks
              .map(c => c.page_number)
              .filter((p): p is number => p !== null)
              .filter((p, i, arr) => arr.indexOf(p) === i) // unique
              .sort((a, b) => a - b),
            chunksUsed: chunks.length,
          };

          // Send a special delimiter and metadata
          controller.enqueue(encoder.encode(`\n\n__METADATA__${JSON.stringify(metadata)}`));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat message",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
