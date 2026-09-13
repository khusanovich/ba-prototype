"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ChatPanel from "./components/ChatPanel";
import AdaptiveContent from "./components/AdaptiveContent";

interface DocumentInfo {
  id: string;
  title: string;
  created_at: string;
}

export default function WorkspacePage() {
  const params = useParams();
  const docId = params.docId as string;
  const [document, setDocument] = useState<DocumentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder: In production, fetch document info from API
    // For now, just show the docId
    setDocument({
      id: docId,
      title: "Dokument geladen",
      created_at: new Date().toISOString(),
    });
    setLoading(false);
  }, [docId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {document?.title}
              </h1>
              <p className="text-sm text-gray-500">Lernassistent Workspace</p>
            </div>
            <a
              href="/"
              className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              ← Neues Dokument hochladen
            </a>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Chat Panel - Feature B (DP2: Responsiveness) */}
          <div className="h-[calc(100vh-200px)]">
            <ChatPanel documentId={docId} />
          </div>

          {/* Content Panel - Features A & C */}
          <div className="h-[calc(100vh-200px)] overflow-y-auto">
            <AdaptiveContent documentId={docId} />
          </div>
        </div>
      </div>
    </div>
  );
}
