/**
 * Documents API - List all uploaded documents
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data: documents, error } = await supabase
      .from("documents")
      .select("id, title, created_at, page_count")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      );
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (error) {
    console.error("Documents API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

/**
 * Delete multiple documents
 * Body: { documentIds: string[] } or { deleteAll: true }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentIds, deleteAll } = body;

    if (deleteAll) {
      // Delete all documents
      const { error } = await supabase
        .from("documents")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all (dummy condition)

      if (error) {
        console.error("Error deleting all documents:", error);
        return NextResponse.json(
          { error: "Failed to delete all documents" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "All documents deleted"
      });
    }

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: "documentIds array is required" },
        { status: 400 }
      );
    }

    // Delete selected documents (cascade will delete chunks, summaries, quizzes, quiz_attempts)
    const { error } = await supabase
      .from("documents")
      .delete()
      .in("id", documentIds);

    if (error) {
      console.error("Error deleting documents:", error);
      return NextResponse.json(
        { error: "Failed to delete documents" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: documentIds.length,
      message: `${documentIds.length} document(s) deleted`
    });
  } catch (error) {
    console.error("Delete documents error:", error);
    return NextResponse.json(
      { error: "Failed to delete documents" },
      { status: 500 }
    );
  }
}
