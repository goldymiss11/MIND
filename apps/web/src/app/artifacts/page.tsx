"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "../../lib/telegram/useTelegram";
import { fetchWithAuth } from "../../lib/api/client";
import { FileText, Search, Download, Eye, X } from "lucide-react";

export default function ArtifactsPage() {
  const { initData, isReady } = useTelegram();
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArtifact, setSelectedArtifact] = useState<any | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    if (isReady) {
      loadArtifacts();
    }
  }, [isReady, initData]);

  const loadArtifacts = async () => {
    try {
      setLoading(true);
      setError(null);
      if (initData) {
        const result = await fetchWithAuth("/api/miniapp/artifacts", initData);
        setArtifacts(Array.isArray(result) ? result : (result?.data ?? []));
      } else {
        // Fallback preview artifacts
        setArtifacts([
          {
            id: "1",
            name: "Отчет_по_проекту_MIND.docx",
            type: "docx",
            createdAt: new Date().toISOString(),
            content: "# Отчет по проекту MIND\n\nПерсональная операционная система ИИ в Telegram.",
          },
          {
            id: "2",
            name: "Презентация_MIND_OS.pptx",
            type: "pptx",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            content: null,
          },
          {
            id: "3",
            name: "План_расходов_Q4.xlsx",
            type: "xlsx",
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            content: null,
          },
          {
            id: "4",
            name: "Курсовая_дискретная_математика.pdf",
            type: "pdf",
            createdAt: new Date(Date.now() - 259200000).toISOString(),
            content: null,
          },
          {
            id: "5",
            name: "orchestrator_schema.ts",
            type: "code",
            createdAt: new Date(Date.now() - 345600000).toISOString(),
            content: "export interface OrchestratorPlan {\n  goal: string;\n  tasks: Task[];\n}",
          },
        ]);
      }
    } catch (err: any) {
      if (!initData) {
        setArtifacts([
          {
            id: "1",
            name: "Отчет_по_проекту_MIND.docx",
            type: "docx",
            createdAt: new Date().toISOString(),
            content: "# Отчет по проекту MIND\n\nПерсональная операционная система ИИ в Telegram.",
          },
          {
            id: "2",
            name: "Презентация_MIND_OS.pptx",
            type: "pptx",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            content: null,
          },
          {
            id: "3",
            name: "План_расходов_Q4.xlsx",
            type: "xlsx",
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            content: null,
          },
        ]);
      } else {
        setError(err.message || "Failed to load artifacts");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (artifact: any) => {
    if (!artifact.content) {
      alert(`Файл «${artifact.name}» доступен для скачивания в вашем диалоге с Telegram-ботом.`);
      return;
    }
    const blob = new Blob([artifact.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = artifact.name || "document.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#000000]">
        <div className="w-8 h-8 border-3 border-[#007aff] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-[#000000]">
        <p className="text-rose-400 mb-4 text-sm">{error}</p>
        <button
          onClick={loadArtifacts}
          className="px-5 py-2.5 bg-[#007aff] hover:bg-[#007aff]/90 text-white font-medium rounded-2xl text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const categories = [
    { id: "all", label: "Все" },
    { id: "docx", label: "DOCX" },
    { id: "pptx", label: "PPTX" },
    { id: "xlsx", label: "XLSX" },
    { id: "pdf", label: "PDF" },
    { id: "code", label: "Код" },
  ];

  const filteredArtifacts = artifacts.filter((a) => {
    const matchesSearch = searchQuery
      ? a.name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCategory =
      activeCategory === "all" ? true : a.type?.toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const getFormatBadge = (type?: string) => {
    const t = (type || "doc").toLowerCase();
    if (t === "docx" || t === "doc") return { bg: "bg-[#007aff]/15", text: "text-[#007aff]" };
    if (t === "xlsx" || t === "csv") return { bg: "bg-[#30d158]/15", text: "text-[#30d158]" };
    if (t === "pptx" || t === "ppt") return { bg: "bg-[#ff9500]/15", text: "text-[#ff9500]" };
    if (t === "pdf") return { bg: "bg-rose-500/15", text: "text-rose-400" };
    return { bg: "bg-[#af52de]/15", text: "text-[#af52de]" };
  };

  return (
    <main className="p-4 flex flex-col gap-4 min-h-screen bg-[#000000] text-white pb-24">
      <header className="mt-2 mb-1">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white tracking-tight">
          <FileText size={26} className="text-[#007aff]" /> Артефакты и файлы
        </h1>
      </header>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search size={18} className="text-[#8e8e93]" />
        </div>
        <input 
          type="text" 
          placeholder="Поиск файлов и отчетов..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#1c1c1e] text-white placeholder-[#8e8e93] rounded-2xl pl-10 pr-10 py-3 border border-white/5 focus:outline-none focus:ring-1 focus:ring-[#007aff] text-sm transition-shadow shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8e8e93] hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Category Pills (Horizontal Scroll) */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-[#007aff] text-white shadow-sm"
                  : "bg-[#1c1c1e] text-[#8e8e93] hover:text-white border border-white/5"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Artifacts List: Grouped Container */}
      <div className="bg-[#1c1c1e] rounded-3xl divide-y divide-white/5 overflow-hidden border border-white/5 shadow-sm">
        {filteredArtifacts.length > 0 ? (
          filteredArtifacts.map((a) => {
            const badge = getFormatBadge(a.type);
            return (
              <div
                key={a.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <div
                  onClick={() => setSelectedArtifact(a)}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-full ${badge.bg} ${badge.text} flex items-center justify-center shrink-0`}>
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-[15px] font-medium truncate hover:text-[#007aff] transition-colors">
                      {a.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold uppercase ${badge.bg} ${badge.text} px-2 py-0.5 rounded-full`}>
                        {a.type || "DOC"}
                      </span>
                      <span className="text-xs text-[#8e8e93]">
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>
                </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  onClick={() => setSelectedArtifact(a)}
                  className="p-2 text-[#8e8e93] hover:text-white bg-[#2c2c2e] hover:bg-[#38383a] rounded-xl transition-colors"
                  title="Просмотр"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => handleDownload(a)}
                  className="p-2 text-[#8e8e93] hover:text-[#007aff] bg-[#2c2c2e] hover:bg-[#38383a] rounded-xl transition-colors"
                  title="Скачать"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
          )})
        ) : (
          <div className="text-center text-[#8e8e93] py-12 px-4">
            <p className="text-sm font-medium">Файлы пока не созданы</p>
            <p className="text-xs text-[#8e8e93]/80 mt-1">
              Попросите MIND в Telegram создать отчет, реферат, презентацию или код.
            </p>
          </div>
        )}
      </div>

      {/* Artifact Viewer Modal */}
      {selectedArtifact && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#1c1c1e] w-full max-w-lg max-h-[85vh] rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white truncate max-w-[280px]">
                {selectedArtifact.name}
              </h2>
              <button
                onClick={() => setSelectedArtifact(null)}
                className="text-[#8e8e93] hover:text-white p-1 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[50vh] p-4 bg-[#000000] rounded-2xl border border-white/5 text-sm text-[#ddd] font-mono whitespace-pre-wrap leading-relaxed">
              {selectedArtifact.content || "Бинарный файл (DOCX/PPTX/XLSX) был отправлен вам в Telegram-чат."}
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setSelectedArtifact(null)}
                className="flex-1 py-3 bg-[#2c2c2e] hover:bg-[#38383a] text-white rounded-2xl text-sm font-medium transition-colors"
              >
                Закрыть
              </button>
              <button
                onClick={() => handleDownload(selectedArtifact)}
                className="flex-1 py-3 bg-[#007aff] hover:bg-[#007aff]/90 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download size={16} /> Скачать
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

