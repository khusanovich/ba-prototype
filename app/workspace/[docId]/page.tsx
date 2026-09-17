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
  const [showChat, setShowChat] = useState(false);

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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neues Dokument
              </button>
              <button
                onClick={() => setShowChat(!showChat)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat
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
            <AdaptiveContent documentId={docId} />
          </div>

          {/* Middle Column - PDF Viewer */}
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

          {/* Right Column - Placeholder for future content */}
          <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
            <p className="text-sm">Zukünftige Inhalte</p>
          </div>
        </div>
      </div>

      {/* Chat Slide-in Panel */}
      {showChat && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setShowChat(false)}
          />
          {/* Slide-in Panel */}
          <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-white shadow-2xl z-50 transform transition-transform">
            <ChatPanel documentId={docId} />
            <button
              onClick={() => setShowChat(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
