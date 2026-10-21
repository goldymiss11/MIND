"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "../../lib/telegram/useTelegram";
import { fetchWithAuth } from "../../lib/api/client";
import {
  FileText,
  Search,
  Download,
  X,
  AlertCircle,
  FileSpreadsheet,
  Presentation,
  Code2,
} from "lucide-react";
import { CardGroup } from "../../components/ui/CardGroup";
import { ModalSheet } from "../../components/ui/ModalSheet";
import { CardGroupSkeleton } from "../../components/ui/LoadingSkeleton";

export default function ArtifactsPage() {
  const { initData, isReady, haptic, showAlert: tgAlert } = useTelegram();
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

  const handleDownload = async (artifact: any) => {
    haptic.impact("light");
    if (!artifact.content) {
      await tgAlert(`Файл «${artifact.name}» доступен для скачивания в вашем диалоге с Telegram-ботом.`);
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
    haptic.notification("success");
  };

  if (!isReady || loading) {
    return (
      <main className="p-4 flex flex-col gap-4 min-h-screen bg-[#000000] text-white">
        <header className="mt-2 mb-1 flex justify-between items-center">
          <div className="h-7 w-48 rounded-md skeleton-shimmer" />
        </header>
        <div className="h-11 rounded-[20px] skeleton-shimmer" />
        <div className="h-8 rounded-full skeleton-shimmer w-4/5" />
        <CardGroupSkeleton rows={4} />
      </main>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#000000]">
        <div className="w-14 h-14 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center mb-3">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Не удалось загрузить файлы</h2>
        <p className="text-[#8e8e93] mb-5 text-sm max-w-xs">{error}</p>
        <button
          onClick={loadArtifacts}
          className="px-6 py-3 bg-[#007aff] hover:bg-[#1a8aff] active:scale-95 text-white font-semibold rounded-[18px] text-sm transition-all shadow-[0_4px_16px_rgba(0,122,255,0.3)]"
        >
          Повторить
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
    if (t === "docx" || t === "doc")
      return { icon: <FileText size={20} />, bg: "bg-[#007aff]/15", text: "text-[#007aff]" };
    if (t === "xlsx" || t === "csv")
      return { icon: <FileSpreadsheet size={20} />, bg: "bg-[#30d158]/15", text: "text-[#30d158]" };
    if (t === "pptx" || t === "ppt")
      return { icon: <Presentation size={20} />, bg: "bg-[#ff9500]/15", text: "text-[#ff9500]" };
    if (t === "pdf")
      return { icon: <FileText size={20} />, bg: "bg-rose-500/15", text: "text-rose-400" };
    return { icon: <Code2 size={20} />, bg: "bg-[#af52de]/15", text: "text-[#af52de]" };
  };

  return (
    <main className="p-4 pb-32 flex flex-col gap-3.5 min-h-screen bg-[#000000] text-white">
      {/* Header */}
      <header className="mt-2 mb-1">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white tracking-tight">
          Артефакты и файлы
        </h1>
        <p className="text-xs text-[#8e8e93] mt-0.5">
          {artifacts.length} сгенерированных документов и материалов
        </p>
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
          className="w-full bg-[#16171b] text-white placeholder-[#707579] rounded-[20px] pl-10 pr-10 py-3 border border-white/[0.07] focus:outline-none focus:border-[#007aff] text-sm transition-all shadow-sm"
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
              onClick={() => {
                haptic.selection();
                setActiveCategory(cat.id);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 select-none ${
                isActive
                  ? "bg-[#007aff] text-white shadow-[0_2px_10px_rgba(0,122,255,0.35)]"
                  : "bg-[#16171b] text-[#8e8e93] hover:text-white border border-white/[0.07]"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Artifacts List: Grouped Container */}
      <CardGroup>
        {filteredArtifacts.length > 0 ? (
          filteredArtifacts.map((a) => {
            const badge = getFormatBadge(a.type);
            return (
              <div
                key={a.id}
                onClick={() => {
                  haptic.impact("light");
                  setSelectedArtifact(a);
                }}
                className="p-4 flex items-center justify-between gap-3.5 hover:bg-white/[0.02] cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-11 h-11 rounded-full ${badge.bg} ${badge.text} flex items-center justify-center shrink-0 shadow-sm`}
                  >
                    {badge.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-[15px] font-semibold truncate hover:text-[#007aff] transition-colors tracking-tight">
                      {a.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-[10px] font-bold uppercase ${badge.bg} ${badge.text} px-2 py-0.5 rounded-full`}
                      >
                        {a.type || "DOC"}
                      </span>
                      <span className="text-xs text-[#8e8e93]">
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(a);
                  }}
                  className="p-2.5 text-[#8e8e93] hover:text-[#007aff] bg-[#202127] hover:bg-[#26272e] rounded-[14px] transition-all touch-scale shrink-0"
                  title="Скачать"
                  aria-label="Скачать файл"
                >
                  <Download size={16} />
                </button>
              </div>
            );
          })
        ) : (
          <div className="text-center text-[#8e8e93] py-12 px-4">
            <p className="text-sm font-medium">Файлы пока не созданы</p>
            <p className="text-xs text-[#8e8e93]/80 mt-1">
              Попросите MIND в Telegram создать отчет, реферат, презентацию или код.
            </p>
          </div>
        )}
      </CardGroup>

      {/* Artifact Viewer Modal */}
      <ModalSheet
        isOpen={Boolean(selectedArtifact)}
        onClose={() => setSelectedArtifact(null)}
        title={selectedArtifact?.name || "Просмотр файла"}
        subtitle={
          selectedArtifact?.createdAt
            ? `Создан ${new Date(selectedArtifact.createdAt).toLocaleDateString()}`
            : undefined
        }
      >
        {selectedArtifact && (
          <div className="flex flex-col gap-4">
            <div className="max-h-[50vh] overflow-y-auto p-4 bg-[#0a0a0c] rounded-[20px] border border-white/[0.06] text-xs text-[#ddd] font-mono whitespace-pre-wrap leading-relaxed">
              {selectedArtifact.content || "Бинарный файл (DOCX/PPTX/XLSX) был отправлен вам в Telegram-чат."}
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setSelectedArtifact(null)}
                className="flex-1 py-3.5 bg-[#202127] hover:bg-[#26272e] active:scale-[0.98] text-white rounded-[18px] text-sm font-medium transition-all"
              >
                Закрыть
              </button>
              <button
                onClick={() => handleDownload(selectedArtifact)}
                className="flex-1 py-3.5 bg-[#007aff] hover:bg-[#1a8aff] active:scale-[0.98] text-white rounded-[18px] text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-[0_4px_16px_rgba(0,122,255,0.3)]"
              >
                <Download size={16} /> Скачать
              </button>
            </div>
          </div>
        )}
      </ModalSheet>
    </main>
  );
}
