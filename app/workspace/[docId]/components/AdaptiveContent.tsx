"use client";

import { useState, useEffect } from "react";

interface QuizQuestion {
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface AdaptiveContentProps {
  documentId: string;
  mode?: "summary" | "quiz";
}

export default function AdaptiveContent({ documentId, mode = "summary" }: AdaptiveContentProps) {
  const [summary, setSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryPageNumbers, setSummaryPageNumbers] = useState<number[]>([]);
  const [summaryCached, setSummaryCached] = useState(false);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [adaptedTo, setAdaptedTo] = useState<string>("");
  const [quizCached, setQuizCached] = useState(false);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    // Auto-generate based on mode
    if (mode === "summary") {
      loadSummary();
    } else if (mode === "quiz") {
      loadQuiz();
    }
  }, [documentId, mode]);

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, type: "summary" }),
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setSummaryPageNumbers(data.pageNumbers || []);
        setSummaryCached(data.cached || false);
      }
    } catch (error) {
      console.error("Failed to load summary:", error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadQuiz = async () => {
    setQuizLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, type: "quiz" }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
        setWeakTopics(data.weakTopics || []);
        setAdaptedTo(data.adaptedTo || "");
        setQuizCached(data.cached || false);
      }
    } catch (error) {
      console.error("Failed to load quiz:", error);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAnswer = async (answerIndex: number) => {
    if (answered) return;

    setSelectedAnswer(answerIndex);
    setAnswered(true);

    const currentQuestion = questions[currentQuestionIndex];
    const wasCorrect = answerIndex === currentQuestion.correctIndex;

    // Record the result
    try {
      await fetch("/api/quiz-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          topic: currentQuestion.topic,
          wasCorrect,
        }),
      });
    } catch (error) {
      console.error("Failed to record quiz result:", error);
    }

    // Show explanation after a brief delay
    setTimeout(() => {
      setShowExplanation(true);
    }, 500);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setAnswered(false);
    } else {
      // Reload quiz to get adaptive questions based on new results
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setAnswered(false);
      loadQuiz();
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  // Render only summary or only quiz based on mode
  if (mode === "summary") {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Zusammenfassung
          </h2>
          {summaryCached && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              Gespeichert
            </span>
          )}
        </div>

        {summaryLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        ) : summary ? (
          <div>
            <p className="text-gray-700 whitespace-pre-wrap">{summary}</p>
            {summaryPageNumbers.length > 0 && (
              <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                <span className="font-medium">Quellen:</span> Seite{" "}
                {summaryPageNumbers.join(", ")}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm mb-4">
              Noch keine Zusammenfassung erstellt.
            </p>
            <button
              onClick={loadSummary}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Zusammenfassung generieren
            </button>
          </div>
        )}
      </div>
    );
  }

  // mode === "quiz"
  return (
    <div className="bg-white rounded-lg shadow p-6 h-full overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Quiz</h2>
            {quizCached && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                Gespeichert
              </span>
            )}
          </div>
          {questions.length > 0 && (
            <span className="text-sm text-gray-500">
              Frage {currentQuestionIndex + 1} von {questions.length}
            </span>
          )}
        </div>

        {weakTopics.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <p className="font-medium text-yellow-900">
              Schwerpunkt auf Schwachstellen:
            </p>
            <p className="text-yellow-700 mt-1">
              {weakTopics.join(", ")}
            </p>
          </div>
        )}

        {quizLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ) : questions.length > 0 && currentQuestion ? (
          <div className="space-y-4">
            <div className="mb-4">
              <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">
                {currentQuestion.topic}
              </span>
            </div>

            <p className="font-medium text-gray-900">
              {currentQuestion.question}
            </p>

            <div className="space-y-2">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === currentQuestion.correctIndex;
                const showResult = answered;

                let buttonClass =
                  "w-full text-left p-3 rounded border-2 transition-colors text-gray-900 ";

                if (!showResult) {
                  buttonClass += "border-gray-300 hover:border-indigo-500 hover:bg-indigo-50";
                } else if (isCorrect) {
                  buttonClass += "border-green-500 bg-green-50 text-green-900";
                } else if (isSelected && !isCorrect) {
                  buttonClass += "border-red-500 bg-red-50 text-red-900";
                } else {
                  buttonClass += "border-gray-300";
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    disabled={answered}
                    className={buttonClass}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {showExplanation && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="font-medium text-blue-900 mb-2">Erklärung:</p>
                <p className="text-blue-800 text-sm">
                  {currentQuestion.explanation}
                </p>
              </div>
            )}

            {answered && (
              <button
                onClick={nextQuestion}
                className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition-colors"
              >
                {currentQuestionIndex < questions.length - 1
                  ? "Nächste Frage"
                  : "Quiz neu laden (adaptiv)"}
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm mb-4">
              Noch kein Quiz erstellt.
            </p>
            <button
              onClick={loadQuiz}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Quiz generieren
            </button>
          </div>
        )}
    </div>
  );
}
