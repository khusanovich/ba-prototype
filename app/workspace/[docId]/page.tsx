"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ChatPanel from "./components/ChatPanel";
import AdaptiveContent from "./components/AdaptiveContent";

interface DocumentInfo {
  id: string;
  title: string;
  created_at: string;
  pdf_url?: string;
  page_count?: number;
}

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.docId as string;
  const [document, setDocument] = useState<DocumentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDocList, setShowDocList] = useState(false);
  const [allDocuments, setAllDocuments] = useState<DocumentInfo[]>([]);
  const [language, setLanguage] = useState<"de" | "en">("de");

  useEffect(() => {
    // Fetch document info from API
    const loadDocument = async () => {
      try {
        const response = await fetch(`/api/documents/${docId}`);
        if (response.ok) {
          const data = await response.json();
          setDocument(data.document);
        }
      } catch (error) {
        console.error("Failed to load document:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDocument();
  }, [docId]);

  const loadAllDocuments = async () => {
    try {
      console.log("Loading all documents...");
      const response = await fetch("/api/documents");
      console.log("Response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("Loaded documents:", data.documents?.length);
        setAllDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to load documents:", error);
    }
  };

  const toggleDocList = async () => {
    console.log("toggleDocList called, current showDocList:", showDocList);
    if (!showDocList) {
      console.log("Loading documents...");
      await loadAllDocuments();
    }
    const newValue = !showDocList;
    console.log("Setting showDocList to:", newValue);
    setShowDocList(newValue);
  };

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
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">
                {document?.title}
              </h1>
              <p className="text-sm text-gray-500">Lernassistent Workspace</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Language Switcher */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setLanguage("de")}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    language === "de"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  DE
                </button>
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    language === "en"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  EN
                </button>
              </div>

              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neues Dokument
              </button>
              <div className="relative">
                <button
                  onClick={toggleDocList}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Alle Dokumente
                  <svg className={`w-4 h-4 transition-transform ${showDocList ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {/* Dropdown Menu */}
                {showDocList && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                      <p className="text-sm font-medium text-gray-700">
                        Dokumente ({allDocuments.length})
                      </p>
                    </div>
                    {allDocuments.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500 text-center">Keine Dokumente</p>
                    ) : (
                      <div className="p-2">
                        {allDocuments.map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => {
                              router.push(`/workspace/${doc.id}`);
                              setShowDocList(false);
                            }}
                            className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                              doc.id === docId
                                ? "bg-indigo-50 border border-indigo-200"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <p className={`text-sm font-medium truncate ${
                              doc.id === docId ? "text-indigo-900" : "text-gray-900"
                            }`}>
                              {doc.title}
                              {doc.id === docId && (
                                <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">
                                  Aktiv
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(doc.created_at).toLocaleDateString("de-DE")}
                              {doc.page_count && ` • ${doc.page_count} Seiten`}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 w-full mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-140px)]">
          {/* Left Column - Summary */}
          <div className="overflow-y-auto">
            <AdaptiveContent documentId={docId} mode="summary" language={language} />
          </div>

          {/* Middle Column - Quiz + Chat */}
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Quiz Section - takes 60% of height */}
            <div className="h-[55%] overflow-y-auto">
              <AdaptiveContent documentId={docId} mode="quiz" language={language} />
            </div>

            {/* Chat Section - takes 40% of height, always visible */}
            <div className="h-[45%] overflow-hidden">
              <ChatPanel documentId={docId} language={language} />
            </div>
          </div>

          {/* Right Column - PDF Viewer */}
          {document?.pdf_url ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b">
                <h3 className="text-sm font-medium text-gray-700">
                  PDF Dokument
                  {document.page_count && (
                    <span className="ml-2 text-gray-500">
                      ({document.page_count} Seiten)
                    </span>
                  )}
                </h3>
              </div>
              <div className="h-[calc(100%-44px)]">
                <iframe
                  src={document.pdf_url}
                  className="w-full h-full"
                  title="PDF Viewer"
                />
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
              <p className="text-sm">Kein PDF verfügbar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
