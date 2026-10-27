/**
 * PDF Upload and RAG Ingestion API
 *
 * Flow:
 * 1. Receive PDF file
 * 2. Parse PDF to extract text per page
 * 3. Chunk text with overlap
 * 4. Generate embeddings for each chunk
 * 5. Store in Supabase (document + chunks with embeddings)
 * 6. Return document ID
 */

import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import { supabase } from "@/lib/supabase";
import { chunkDocument } from "@/lib/chunking";
import { generateEmbeddingsBatch } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    // 0. Validate environment variables first
    console.log("Validating environment variables...");
    const missingVars = [];
    if (!process.env.OPENAI_API_KEY) missingVars.push("OPENAI_API_KEY");
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");

    if (missingVars.length > 0) {
      console.error("Missing environment variables:", missingVars);
      return NextResponse.json(
        {
          error: "Server configuration error",
          details: `Missing environment variables: ${missingVars.join(", ")}`,
          debugInfo: "Please check Vercel environment variables settings"
        },
        { status: 500 }
      );
    }
    console.log("Environment variables OK");

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    // 1. Parse PDF
    console.log("Parsing PDF:", file.name);
    let arrayBuffer: ArrayBuffer;
    let text: string | string[];
    let totalPages: number;

    try {
      arrayBuffer = await file.arrayBuffer();
      console.log(`PDF file size: ${arrayBuffer.byteLength} bytes`);
    } catch (error) {
      console.error("Error reading PDF file:", error);
      throw new Error("Failed to read PDF file: " + (error instanceof Error ? error.message : "Unknown error"));
    }

    // Clone the arrayBuffer for storage upload (extractText consumes it)
    const arrayBufferForStorage = arrayBuffer.slice(0);

    try {
      const result = await extractText(arrayBuffer);
      text = result.text;
      totalPages = result.totalPages;
      console.log(`Extracted text from ${totalPages} pages`);
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      throw new Error("Failed to extract text from PDF. The file might be corrupted or password-protected: " + (error instanceof Error ? error.message : "Unknown error"));
    }

    // unpdf returns text as an array of page texts
    const fullText = Array.isArray(text) ? text.join("\n\n") : text;

    if (!fullText || fullText.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from PDF", details: "The PDF appears to be empty or contains only images without text" },
        { status: 400 }
      );
    }

    // Extract text per page
    const pages: Array<{ pageNumber: number; text: string }> = [];

    // If unpdf gave us page-by-page text, use it directly
    if (Array.isArray(text)) {
      text.forEach((pageText, index) => {
        if (pageText && pageText.trim().length > 0) {
          pages.push({
            pageNumber: index + 1,
            text: pageText,
          });
        }
      });
    } else {
      // Otherwise, approximate pages by splitting text
      const CHARS_PER_PAGE = 2000;
      let currentPage = 1;
      for (let i = 0; i < fullText.length; i += CHARS_PER_PAGE) {
        const pageText = fullText.substring(i, i + CHARS_PER_PAGE);
        if (pageText.trim().length > 0) {
          pages.push({
            pageNumber: currentPage++,
            text: pageText,
          });
        }
      }
    }

    console.log(`Extracted ${pages.length} pages from PDF`);

    // 2. Upload PDF to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(fileName, arrayBufferForStorage, {
        contentType: "application/pdf",
        cacheControl: "3600",
      });

    let pdfUrl = null;
    if (!uploadError && uploadData) {
      // Get public URL
      const { data: urlData } = supabase.storage
        .from("pdfs")
        .getPublicUrl(fileName);
      pdfUrl = urlData.publicUrl;
      console.log("PDF uploaded to storage:", pdfUrl);
    } else {
      console.warn("PDF upload to storage failed, continuing without URL:", uploadError);
    }

    // 3. Create document record
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        title: file.name.replace(".pdf", ""),
        pdf_url: pdfUrl,
        page_count: totalPages,
      })
      .select()
      .single();

    if (docError || !document) {
      console.error("Error creating document:", docError);
      return NextResponse.json(
        { error: "Failed to create document record" },
        { status: 500 }
      );
    }

    console.log("Created document:", document.id);

    // 3. Chunk the document
    const chunks = chunkDocument(pages);
    console.log(`Created ${chunks.length} chunks`);

    // 4. Generate embeddings for all chunks
    console.log("Generating embeddings...");
    const chunkTexts = chunks.map((c) => c.content);
    let embeddings: number[][];

    try {
      embeddings = await generateEmbeddingsBatch(chunkTexts);
      console.log("Embeddings generated successfully");
    } catch (error) {
      console.error("Error generating embeddings:", error);
      // Clean up document if embedding generation fails
      await supabase.from("documents").delete().eq("id", document.id);
      throw new Error("Failed to generate embeddings. Check OpenAI API key and quota: " + (error instanceof Error ? error.message : "Unknown error"));
    }

    // 5. Insert chunks with embeddings into database
    const chunksToInsert = chunks.map((chunk, index) => ({
      document_id: document.id,
      content: chunk.content,
      page_number: chunk.pageNumber,
      chunk_index: chunk.chunkIndex,
      embedding: embeddings[index],
    }));

    const { error: chunksError } = await supabase
      .from("chunks")
      .insert(chunksToInsert);

    if (chunksError) {
      console.error("Error inserting chunks:", chunksError);
      // Clean up document if chunk insertion fails
      await supabase.from("documents").delete().eq("id", document.id);
      return NextResponse.json(
        { error: "Failed to store document chunks" },
        { status: 500 }
      );
    }

    console.log("Chunks stored successfully");

    return NextResponse.json({
      documentId: document.id,
      title: document.title,
      chunksCount: chunks.length,
      pagesCount: pages.length,
    });
  } catch (error) {
    console.error("Upload error:", error);

    // Provide more detailed error information
    let errorMessage = "Failed to process PDF";
    let errorDetails = "Unknown error occurred";

    if (error instanceof Error) {
      errorDetails = error.message;

      // Provide context-specific messages
      if (error.message.includes("OPENAI_API_KEY")) {
        errorMessage = "OpenAI API configuration error";
      } else if (error.message.includes("Supabase") || error.message.includes("supabase")) {
        errorMessage = "Database connection error";
      } else if (error.message.includes("PDF") || error.message.includes("extract")) {
        errorMessage = "PDF parsing error";
      } else if (error.message.includes("embedding")) {
        errorMessage = "Embedding generation error";
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Next.js App Router automatically handles multipart/form-data
// File size limits are configured in next.config.ts if needed
