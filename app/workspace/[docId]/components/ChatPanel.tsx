"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  pageNumbers?: number[];
}

interface ChatPanelProps {
  documentId: string;
}

export default function ChatPanel({ documentId }: ChatPanelProps) {
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
          content: "Entschuldigung, es gab einen Fehler bei der Verarbeitung deiner Nachricht.",
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
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
        <p className="text-sm text-gray-500">
          Stelle Fragen zu deinem Lernmaterial
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p>Stelle eine Frage, um zu beginnen!</p>
            <p className="text-sm mt-2">
              Beispiel: &quot;Was sind die Hauptthemen in diesem Material?&quot;
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
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.pageNumbers && message.pageNumbers.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-300 text-sm opacity-75">
                  <span className="font-medium">Quellen:</span> Seite{" "}
                  {message.pageNumbers.join(", ")}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Stelle eine Frage..."
            className="flex-1 resize-none border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Senden
          </button>
        </div>
      </div>
    </div>
  );
}
