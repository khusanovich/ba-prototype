"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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
    // Placeholder: In the next step, we'll fetch document info from API
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">
            {document?.title}
          </h1>
          <p className="text-sm text-gray-500">Dokument-ID: {docId}</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Workspace</h2>
          <p className="text-gray-600">
            Dein Dokument wurde erfolgreich hochgeladen und verarbeitet.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Features werden in den nächsten Schritten implementiert:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-gray-500 space-y-1">
            <li>Feature B: Context-aware Chat</li>
            <li>Feature C: Shown Reasoning (Quellenangaben)</li>
            <li>Feature A: Adaptive Content (Quiz & Zusammenfassung)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
