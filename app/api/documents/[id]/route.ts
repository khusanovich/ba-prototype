/**
 * Single Document API - Get details of a specific document
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data: document, error } = await supabase
      .from("documents")
      .select("id, title, created_at")
      .eq("id", id)
      .single();

    if (error || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Also get chunk count
    const { count } = await supabase
      .from("chunks")
      .select("*", { count: "exact", head: true })
      .eq("document_id", id);

    return NextResponse.json({
      document: {
        ...document,
        chunksCount: count || 0,
      },
    });
  } catch (error) {
    console.error("Document API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}
