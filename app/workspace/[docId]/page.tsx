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
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Neues Dokument
              </button>
              <button
                onClick={toggleDocList}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  showDocList
                    ? "bg-indigo-700 text-white"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                {showDocList ? "Liste ausblenden" : "Alle Dokumente"}
                <span className="text-xs opacity-75">({allDocuments.length})</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 w-full mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 h-[calc(100vh-140px)]">
          {/* PDF Viewer - Left Column */}
          {document?.pdf_url && (
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
          )}

          {/* Content Panel - Middle Column */}
          <div className="overflow-y-auto">
            <AdaptiveContent documentId={docId} />
          </div>

          {/* Chat Panel - Right Column */}
          <div>
            <ChatPanel documentId={docId} />
          </div>
        </div>

        {/* Debug State */}
        <div className="mt-4 p-2 bg-gray-100 text-xs border border-gray-300 rounded">
          DEBUG State: showDocList={String(showDocList)}, allDocuments={allDocuments.length}
        </div>

        {/* Document List Panel - Collapsible at Bottom */}
        {showDocList && (
          <div className="mt-6 bg-white rounded-lg shadow-lg border-2 border-red-500">
            <div className="p-2 bg-yellow-100 text-xs">
              DEBUG: Panel is visible. Documents: {allDocuments.length}
            </div>
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Alle Dokumente ({allDocuments.length})
                </h3>
                <button
                  onClick={() => setShowDocList(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {allDocuments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Keine Dokumente gefunden
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => {
                        router.push(`/workspace/${doc.id}`);
                        setShowDocList(false);
                      }}
                      className={`p-4 text-left rounded-lg border-2 transition-all ${
                        doc.id === docId
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium truncate ${
                            doc.id === docId ? "text-indigo-900" : "text-gray-900"
                          }`}>
                            {doc.title}
                            {doc.id === docId && (
                              <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">
                                Aktiv
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(doc.created_at).toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                            {doc.page_count && (
                              <span className="ml-2">• {doc.page_count} Seiten</span>
                            )}
                          </p>
                        </div>
                        {doc.id !== docId && (
                          <svg
                            className="w-4 h-4 text-gray-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
