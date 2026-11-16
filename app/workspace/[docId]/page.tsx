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

  // Panel collapse states - all open by default
  const [panels, setPanels] = useState({
    summary: true,
    quiz: true,
    chat: true,
    pdf: true
  });

  // Load panel states from localStorage on mount
  useEffect(() => {
    const savedPanels = localStorage.getItem('workspace-panels');
    if (savedPanels) {
      try {
        setPanels(JSON.parse(savedPanels));
      } catch (e) {
        console.error('Failed to parse saved panel states:', e);
      }
    }
  }, []);

  // Save panel states to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('workspace-panels', JSON.stringify(panels));
  }, [panels]);

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

  const togglePanel = (panelName: keyof typeof panels) => {
    setPanels(prev => ({
      ...prev,
      [panelName]: !prev[panelName]
    }));
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
        <div className="flex gap-4 h-[calc(100vh-140px)]">
          {/* Left Column - Summary */}
          <div
            className={`transition-all duration-300 overflow-hidden ${
              panels.summary ? 'flex-1 min-w-[250px]' : 'w-12'
            }`}
          >
            <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
                <h3 className={`text-sm font-medium text-gray-700 ${!panels.summary && 'sr-only'}`}>
                  Zusammenfassung
                </h3>
                <button
                  onClick={() => togglePanel('summary')}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded p-1 transition-colors"
                  title={panels.summary ? 'Zuklappen' : 'Aufklappen'}
                >
                  <svg className={`w-4 h-4 transition-transform ${!panels.summary && 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
              {panels.summary && (
                <div className="overflow-y-auto flex-1 p-4">
                  <AdaptiveContent documentId={docId} mode="summary" language={language} />
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Quiz + Chat */}
          <div className="transition-all duration-300 flex flex-col gap-4 flex-1 min-w-[250px]">
            {/* Quiz Section */}
            <div
              className={`transition-all duration-300 bg-white rounded-lg border border-gray-200 overflow-hidden ${
                panels.quiz ? 'flex-1' : 'h-12'
              }`}
            >
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center">
                <h3 className={`text-sm font-medium text-gray-700 flex-1 ${!panels.quiz && 'invisible'}`}>
                  Quiz
                </h3>
                <button
                  onClick={() => togglePanel('quiz')}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded p-1 transition-colors flex-shrink-0"
                  title={panels.quiz ? 'Zuklappen' : 'Aufklappen'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>
              {panels.quiz && (
                <div className="overflow-y-auto h-[calc(100%-44px)] p-4">
                  <AdaptiveContent documentId={docId} mode="quiz" language={language} />
                </div>
              )}
            </div>

            {/* Chat Section */}
            <div
              className={`transition-all duration-300 bg-white rounded-lg border border-gray-200 overflow-hidden ${
                panels.chat ? 'flex-1' : 'h-12'
              }`}
            >
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center">
                <h3 className={`text-sm font-medium text-gray-700 flex-1 ${!panels.chat && 'invisible'}`}>
                  Chat
                </h3>
                <button
                  onClick={() => togglePanel('chat')}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded p-1 transition-colors flex-shrink-0"
                  title={panels.chat ? 'Zuklappen' : 'Aufklappen'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>
              {panels.chat && (
                <div className="h-[calc(100%-44px)] overflow-hidden">
                  <ChatPanel documentId={docId} language={language} />
                </div>
              )}
            </div>
          </div>

          {/* Right Column - PDF Viewer */}
          <div
            className={`transition-all duration-300 overflow-hidden ${
              panels.pdf ? 'flex-1 min-w-[250px]' : 'w-12'
            }`}
          >
            <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
                <h3 className={`text-sm font-medium text-gray-700 ${!panels.pdf && 'sr-only'}`}>
                  PDF Dokument
                  {document?.page_count && panels.pdf && (
                    <span className="ml-2 text-gray-500 text-xs">
                      ({document.page_count} Seiten)
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => togglePanel('pdf')}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded p-1 transition-colors"
                  title={panels.pdf ? 'Zuklappen' : 'Aufklappen'}
                >
                  <svg className={`w-4 h-4 transition-transform ${!panels.pdf && 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              {panels.pdf && (
                document?.pdf_url ? (
                  <div className="flex-1 overflow-hidden">
                    <iframe
                      src={document.pdf_url}
                      className="w-full h-full"
                      title="PDF Viewer"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <p className="text-sm">Kein PDF verfügbar</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
