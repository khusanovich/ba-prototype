/**
 * Quiz Result API - Feature A (DP1: Personalization)
 *
 * Records student answers to enable adaptive learning:
 * - Stores which topics were answered correctly/incorrectly
 * - Enables future quiz generation to focus on weak topics
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { documentId, topic, wasCorrect } = await request.json();

    if (!documentId || !topic || typeof wasCorrect !== "boolean") {
      return NextResponse.json(
        { error: "documentId, topic, and wasCorrect are required" },
        { status: 400 }
      );
    }

    // Insert quiz attempt
    const { error } = await supabase
      .from("quiz_attempts")
      .insert({
        document_id: documentId,
        topic,
        was_correct: wasCorrect,
      });

    if (error) {
      console.error("Failed to record quiz attempt:", error);
      return NextResponse.json(
        { error: "Failed to record quiz result" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Quiz result recorded",
    });
  } catch (error) {
    console.error("Quiz result error:", error);
    return NextResponse.json(
      {
        error: "Failed to record quiz result",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
