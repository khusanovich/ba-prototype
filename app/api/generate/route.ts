/**
 * Generate API - Feature A (DP1: Personalization)
 *
 * Generates adaptive content:
 * - Summary of the uploaded material
 * - Quiz questions tailored to the material
 * - Adaptive focus on topics the student got wrong
 */

import { NextRequest, NextResponse } from "next/server";
import { getChatModel } from "@/lib/gemini";
import { retrieveChunks, formatChunksAsContext } from "@/lib/rag";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { documentId, type } = await request.json();

    if (!documentId || !type) {
      return NextResponse.json(
        { error: "documentId and type are required" },
        { status: 400 }
      );
    }

    if (type === "summary") {
      return await generateSummary(documentId);
    } else if (type === "quiz") {
      return await generateQuiz(documentId);
    } else {
      return NextResponse.json(
        { error: "Invalid type. Must be 'summary' or 'quiz'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate content",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a summary of the uploaded material
 */
async function generateSummary(documentId: string) {
  // Check if summary already exists
  const { data: existingSummary } = await supabase
    .from("summaries")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingSummary) {
    return NextResponse.json({
      summary: existingSummary.content,
      pageNumbers: existingSummary.page_numbers || [],
      chunksUsed: 0,
      cached: true,
    });
  }

  // Retrieve representative chunks (using a broad query)
  const chunks = await retrieveChunks(
    "Hauptthemen Zusammenfassung Überblick",
    documentId,
    10
  );

  const context = formatChunksAsContext(chunks);

  const model = getChatModel();
  const prompt = `${context}

Erstelle eine prägnante Zusammenfassung des obigen Lernmaterials auf Deutsch.

Die Zusammenfassung soll:
- Die Hauptthemen und Konzepte hervorheben
- 3-5 Absätze umfassen
- Klar strukturiert sein
- Für Studierende verständlich sein

Zusammenfassung:`;

  const result = await model.generateContent(prompt);
  const summary = result.response.text();

  const pageNumbers = chunks
    .map(c => c.page_number)
    .filter((p): p is number => p !== null)
    .filter((p, i, arr) => arr.indexOf(p) === i)
    .sort((a, b) => a - b);

  // Save summary to database
  await supabase.from("summaries").insert({
    document_id: documentId,
    content: summary,
    page_numbers: pageNumbers,
  });

  return NextResponse.json({
    summary,
    pageNumbers,
    chunksUsed: chunks.length,
    cached: false,
  });
}

/**
 * Generate quiz questions, adaptive to previous attempts
 */
async function generateQuiz(documentId: string) {
  // 1. Fetch quiz attempts to identify weak topics
  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  // 2. Analyze weak topics (topics with more wrong answers)
  const topicStats: Record<string, { correct: number; wrong: number }> = {};

  attempts?.forEach((attempt) => {
    if (!topicStats[attempt.topic]) {
      topicStats[attempt.topic] = { correct: 0, wrong: 0 };
    }
    if (attempt.was_correct) {
      topicStats[attempt.topic].correct++;
    } else {
      topicStats[attempt.topic].wrong++;
    }
  });

  const weakTopics = Object.entries(topicStats)
    .filter(([_, stats]) => stats.wrong > stats.correct)
    .map(([topic, _]) => topic);

  // Check if quiz already exists for these weak topics
  const { data: existingQuizzes } = await supabase
    .from("quizzes")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(3);

  // If we have recent quizzes with the same weak topics, return them
  if (existingQuizzes && existingQuizzes.length > 0) {
    const firstQuiz = existingQuizzes[0];
    const sameWeakTopics =
      JSON.stringify(firstQuiz.weak_topics?.sort()) === JSON.stringify(weakTopics.sort());

    if (sameWeakTopics || weakTopics.length === 0) {
      const questions = existingQuizzes.map(q => ({
        topic: q.topic,
        question: q.question,
        options: q.options as string[],
        correctIndex: q.correct_index,
        explanation: q.explanation,
      }));

      return NextResponse.json({
        questions,
        weakTopics,
        adaptedTo: weakTopics.length > 0 ? "weak topics" : "general material",
        cached: true,
      });
    }
  }

  // 3. Retrieve relevant chunks
  let query = "Konzepte Definitionen wichtige Themen";
  if (weakTopics.length > 0) {
    query = `${weakTopics.join(" ")} Konzepte Definitionen`;
  }

  const chunks = await retrieveChunks(query, documentId, 8);
  const context = formatChunksAsContext(chunks);

  // 4. Build adaptive prompt
  let adaptiveInstructions = "";
  if (weakTopics.length > 0) {
    adaptiveInstructions = `\nDer Studierende hatte Schwierigkeiten bei folgenden Themen: ${weakTopics.join(", ")}.
Konzentriere dich besonders auf diese Bereiche.`;
  }

  const model = getChatModel();
  const prompt = `${context}${adaptiveInstructions}

Erstelle 3 Multiple-Choice-Fragen auf Deutsch basierend auf dem obigen Lernmaterial.

Jede Frage soll:
- Ein wichtiges Konzept aus dem Material testen
- 4 Antwortmöglichkeiten haben (A, B, C, D)
- Genau eine richtige Antwort haben
- Einen kurzen Topic-Label haben (2-3 Wörter, z.B. "Maschinelles Lernen")

Format (als JSON):
{
  "questions": [
    {
      "topic": "Topic Label",
      "question": "Die Frage?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctIndex": 0,
      "explanation": "Warum ist diese Antwort richtig?"
    }
  ]
}

Nur das JSON zurückgeben, keine zusätzlichen Erklärungen.`;

  const result = await model.generateContent(prompt);
  let responseText = result.response.text();

  // Clean up markdown code blocks if present
  responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const quizData = JSON.parse(responseText);

    // Save quiz questions to database
    const quizzesToInsert = quizData.questions.map((q: any) => ({
      document_id: documentId,
      topic: q.topic,
      question: q.question,
      options: q.options,
      correct_index: q.correctIndex,
      explanation: q.explanation,
      weak_topics: weakTopics.length > 0 ? weakTopics : null,
    }));

    await supabase.from("quizzes").insert(quizzesToInsert);

    return NextResponse.json({
      questions: quizData.questions,
      weakTopics,
      adaptedTo: weakTopics.length > 0 ? "weak topics" : "general material",
      cached: false,
    });
  } catch (parseError) {
    console.error("Failed to parse quiz JSON:", responseText);
    throw new Error("Failed to parse quiz response");
  }
}
