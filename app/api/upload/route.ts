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
    const arrayBuffer = await file.arrayBuffer();

    // Clone the arrayBuffer for storage upload (extractText consumes it)
    const arrayBufferForStorage = arrayBuffer.slice(0);

    const { text, totalPages } = await extractText(arrayBuffer);

    // unpdf returns text as an array of page texts
    const fullText = Array.isArray(text) ? text.join("\n\n") : text;

    if (!fullText || fullText.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from PDF" },
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
    const embeddings = await generateEmbeddingsBatch(chunkTexts);

    console.log("Embeddings generated");

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
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}

// Next.js App Router automatically handles multipart/form-data
// File size limits are configured in next.config.ts if needed
