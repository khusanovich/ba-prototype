/**
 * Language-specific prompts for summary, quiz, and chat generation
 */

export function getSummaryPrompt(context: string, language: "de" | "en"): string {
  if (language === "de") {
    return `${context}

Erstelle eine prägnante Zusammenfassung des obigen Lernmaterials auf Deutsch.

Die Zusammenfassung soll:
- Die Hauptthemen und Konzepte hervorheben
- 3-5 Absätze umfassen
- Klar strukturiert sein
- Für Studierende verständlich sein

Zusammenfassung:`;
  } else {
    return `${context}

Create a concise summary of the above learning material in English.

The summary should:
- Highlight the main topics and concepts
- Consist of 3-5 paragraphs
- Be clearly structured
- Be understandable for students

Summary:`;
  }
}

export function getQuizPrompt(
  context: string,
  questionCount: number,
  weakTopics: string[],
  language: "de" | "en"
): string {
  let adaptiveInstructions = "";
  if (weakTopics.length > 0) {
    adaptiveInstructions = language === "de"
      ? `\nDer Studierende hatte Schwierigkeiten bei folgenden Themen: ${weakTopics.join(", ")}.\nKonzentriere dich besonders auf diese Bereiche.`
      : `\nThe student had difficulties with the following topics: ${weakTopics.join(", ")}.\nFocus especially on these areas.`;
  }

  if (language === "de") {
    return `${context}${adaptiveInstructions}

Erstelle ${questionCount} Multiple-Choice-Fragen auf Deutsch basierend auf dem obigen Lernmaterial.

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
  } else {
    return `${context}${adaptiveInstructions}

Create ${questionCount} multiple-choice questions in English based on the above learning material.

Each question should:
- Test an important concept from the material
- Have 4 answer options (A, B, C, D)
- Have exactly one correct answer
- Have a short topic label (2-3 words, e.g. "Machine Learning")

Format (as JSON):
{
  "questions": [
    {
      "topic": "Topic Label",
      "question": "The question?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctIndex": 0,
      "explanation": "Why is this answer correct?"
    }
  ]
}

Return only the JSON, no additional explanations.`;
  }
}

export function getChatSystemInstruction(language: "de" | "en"): string {
  if (language === "de") {
    return `Du bist ein Lernassistent. Antworte immer auf Deutsch. Stütze dich ausschließlich auf das bereitgestellte Lernmaterial des Studierenden. Wenn die Information nicht im Material steht, sage das ehrlich. Gib bei jeder Antwort an, auf welchen Teil des Materials du dich stützt.`;
  } else {
    return `You are a learning assistant. Always answer in English. Base your answers exclusively on the provided learning material of the student. If the information is not in the material, say so honestly. Always indicate which part of the material you're basing your answer on.`;
  }
}

export function getChatPrompt(context: string, message: string, language: "de" | "en"): string {
  if (language === "de") {
    return `${context}

Basierend auf dem obigen Lernmaterial beantworte die folgende Frage des Studierenden:

${message}

Wichtig:
- Beziehe dich ausschließlich auf das bereitgestellte Material
- Gib die Seitenzahlen an, auf die du dich stützt
- Wenn die Information nicht im Material steht, sage das ehrlich
- Antworte auf Deutsch`;
  } else {
    return `${context}

Based on the above learning material, answer the following student question:

${message}

Important:
- Refer exclusively to the provided material
- Provide the page numbers you're basing your answer on
- If the information is not in the material, say so honestly
- Answer in English`;
  }
}

export function getRetrievalQuery(type: "summary" | "quiz", weakTopics: string[], language: "de" | "en"): string {
  if (type === "summary") {
    return language === "de"
      ? "Hauptthemen Zusammenfassung Überblick"
      : "main topics summary overview";
  } else {
    const base = language === "de"
      ? "Konzepte Definitionen wichtige Themen"
      : "concepts definitions important topics";

    if (weakTopics.length > 0) {
      const conceptWord = language === "de" ? "Konzepte Definitionen" : "concepts definitions";
      return `${weakTopics.join(" ")} ${conceptWord}`;
    }
    return base;
  }
}
