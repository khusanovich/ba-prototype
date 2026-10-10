/**
 * Generate API - Feature A (DP1: Personalization)
 *
 * Generates adaptive content:
 * - Summary of the uploaded material
 * - Quiz questions tailored to the material
 * - Adaptive focus on topics the student got wrong
 */

import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { retrieveChunks, formatChunksAsContext } from "@/lib/rag";
import { supabase } from "@/lib/supabase";
import { getSummaryPrompt, getQuizPrompt, getRetrievalQuery } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    const { documentId, type, language = "de" } = await request.json();

    if (!documentId || !type) {
      return NextResponse.json(
        { error: "documentId and type are required" },
        { status: 400 }
      );
    }

    if (type === "summary") {
      return await generateSummary(documentId, language);
    } else if (type === "quiz") {
      return await generateQuiz(documentId, language);
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
async function generateSummary(documentId: string, language: "de" | "en" = "de") {
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
  const query = getRetrievalQuery("summary", [], language);
  const chunks = await retrieveChunks(query, documentId, 10);
  const context = formatChunksAsContext(chunks);
  const prompt = getSummaryPrompt(context, language);

  // Generate summary using OpenAI
  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const summary = result.choices[0]?.message?.content || "";

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
async function generateQuiz(documentId: string, language: "de" | "en" = "de") {
  // 1. Get document info to determine quiz size
  const { data: documentData } = await supabase
    .from("documents")
    .select("page_count")
    .eq("id", documentId)
    .single();

  // Determine number of questions based on document size
  const pageCount = documentData?.page_count || 0;
  let questionCount = 3; // Default for small docs
  if (pageCount >= 20) {
    questionCount = 10;
  } else if (pageCount >= 10) {
    questionCount = 6;
  }

  console.log(`Generating ${questionCount} questions for ${pageCount}-page document`);

  // 2. Fetch quiz attempts to identify weak topics
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
    .limit(questionCount);

  // If we have recent quizzes with the same weak topics and question count, return them
  if (existingQuizzes && existingQuizzes.length === questionCount) {
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
  const query = getRetrievalQuery("quiz", weakTopics, language);
  const chunks = await retrieveChunks(query, documentId, 8);
  const context = formatChunksAsContext(chunks);
  const prompt = getQuizPrompt(context, questionCount, weakTopics, language);

  // Generate quiz using OpenAI
  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 2000,
  });

  let responseText = result.choices[0]?.message?.content || "";

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
