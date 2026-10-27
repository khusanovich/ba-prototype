"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  pageNumbers?: number[];
}

interface ChatPanelProps {
  documentId: string;
  language?: "de" | "en";
}

export default function ChatPanel({ documentId, language = "de" }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Prepare conversation history (exclude metadata from previous messages)
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          message: input,
          history,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let assistantMessage = "";
      let metadata: { pageNumbers?: number[] } = {};

      // Create a temporary assistant message
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", pageNumbers: [] },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Check for metadata delimiter
        if (chunk.includes("__METADATA__")) {
          const parts = chunk.split("__METADATA__");
          assistantMessage += parts[0];

          try {
            metadata = JSON.parse(parts[1]);
          } catch (e) {
            console.error("Failed to parse metadata:", e);
          }
        } else {
          assistantMessage += chunk;
        }

        // Update the last message (assistant's response) with streaming text
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: "assistant",
            content: assistantMessage,
            pageNumbers: metadata.pageNumbers,
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            language === "de"
              ? "Entschuldigung, es gab einen Fehler bei der Verarbeitung deiner Nachricht."
              : "Sorry, there was an error processing your message.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Compact Header */}
      <div className="px-4 py-2 border-b bg-gradient-to-r from-green-50 to-green-100">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h2 className="text-base font-semibold text-gray-900">
            {language === "de" ? "Chat-Assistent" : "Chat Assistant"}
          </h2>
        </div>
        <p className="text-xs text-gray-600 mt-0.5">
          {language === "de"
            ? "Stelle Fragen zu Quiz, Zusammenfassung oder Material"
            : "Ask questions about quiz, summary or material"}
        </p>
      </div>

      {/* Messages - more compact */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-4">
            <p className="text-sm">
              {language === "de"
                ? "💬 Stelle eine Frage zum Material!"
                : "💬 Ask a question about the material!"}
            </p>
            <p className="text-xs mt-1 text-gray-400">
              {language === "de"
                ? 'z.B. "Erkläre mir diese Quiz-Frage"'
                : 'e.g. "Explain this quiz question"'}
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                message.role === "user"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              {message.pageNumbers && message.pageNumbers.length > 0 && (
                <div className="mt-1.5 pt-1.5 border-t border-gray-300 text-xs opacity-75">
                  <span className="font-medium">
                    {language === "de" ? "📄 Quellen:" : "📄 Sources:"}
                  </span>{" "}
                  {language === "de" ? "Seite" : "Page"}{" "}
                  {message.pageNumbers.join(", ")}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <div className="flex space-x-1.5">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Compact Input */}
      <div className="p-3 border-t bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              language === "de" ? "Frage eingeben..." : "Enter question..."
            }
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            {language === "de" ? "Senden" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
