"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "../../lib/telegram/useTelegram";
import { fetchWithAuth } from "../../lib/api/client";
import {
  Brain,
  Search,
  Plus,
  Trash2,
  X,
  AlertCircle,
  Heart,
  Briefcase,
  GraduationCap,
  Code2,
} from "lucide-react";
import { CardGroup } from "../../components/ui/CardGroup";
import { ModalSheet } from "../../components/ui/ModalSheet";
import { CardGroupSkeleton } from "../../components/ui/LoadingSkeleton";

const getMemoryBadge = (type?: string) => {
  const t = (type || "").toLowerCase();
  if (t === "preference")
    return { icon: <Heart size={20} />, bg: "bg-rose-500/15", text: "text-rose-400" };
  if (t === "project")
    return { icon: <Briefcase size={20} />, bg: "bg-[#007aff]/15", text: "text-[#007aff]" };
  if (t === "educational" || t === "education")
    return { icon: <GraduationCap size={20} />, bg: "bg-[#30d158]/15", text: "text-[#30d158]" };
  if (t === "professional")
    return { icon: <Code2 size={20} />, bg: "bg-[#ff9500]/15", text: "text-[#ff9500]" };
  return { icon: <Brain size={20} />, bg: "bg-[#af52de]/15", text: "text-[#af52de]" };
};

export default function MemoryPage() {
  const { initData, isReady, haptic, confirm: tgConfirm } = useTelegram();
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Add memory modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState("");
  const [type, setType] = useState("semantic");
  const [saving, setSaving] = useState(false);

  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    if (isReady) {
      loadMemories();
    }
  }, [isReady, initData]);

  const loadMemories = async () => {
    try {
      setLoading(true);
      setError(null);
      if (initData) {
        const result = await fetchWithAuth("/api/memories");
        setMemories(Array.isArray(result) ? result : (result?.data ?? []));
      } else {
        // Fallback preview memories
        setMemories([
          {
            id: "1",
            type: "preference",
            content: "Любит краткие сводки без лишних вступительных фраз и вежливых клише.",
            createdAt: new Date().toISOString(),
          },
          {
            id: "2",
            type: "project",
            content: "MIND: Личная ИИ операционная система в Telegram с единым оркестратором.",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: "3",
            type: "educational",
            content: "Курс дискретной математики: алгоритмы на графах, автоматы и машина Тьюринга.",
            createdAt: new Date(Date.now() - 172800000).toISOString(),
          },
          {
            id: "4",
            type: "professional",
            content: "Стек разработки: TypeScript, Next.js, Fastify, PostgreSQL pgvector, BullMQ.",
            createdAt: new Date(Date.now() - 259200000).toISOString(),
          },
          {
            id: "5",
            type: "preference",
            content: "Все документы DOCX генерировать со строгим соблюдением требований ГОСТ.",
            createdAt: new Date(Date.now() - 345600000).toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      if (!initData) {
        setMemories([
          {
            id: "1",
            type: "preference",
            content: "Любит краткие сводки без лишних вступительных фраз и вежливых клише.",
            createdAt: new Date().toISOString(),
          },
          {
            id: "2",
            type: "project",
            content: "MIND: Личная ИИ операционная система в Telegram с единым оркестратором.",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: "3",
            type: "educational",
            content: "Курс дискретной математики: алгоритмы на графах, автоматы и машина Тьюринга.",
            createdAt: new Date(Date.now() - 172800000).toISOString(),
          },
        ]);
      } else {
        setError(err.message || "Failed to load memories");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setSaving(true);
      const newMemory = await fetchWithAuth("/api/memories", {
        method: "POST",
        body: JSON.stringify({
          content: content.trim(),
          type,
          importance: 0.8,
        }),
      });

      haptic.notification("success");
      if (newMemory) {
        setMemories((prev) => [newMemory, ...prev]);
      }
      setContent("");
      setIsModalOpen(false);
    } catch (err: any) {
      haptic.notification("error");
      alert(err.message || "Failed to save memory");
    } finally {
      setSaving(false);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    haptic.impact("heavy");
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    try {
      await fetchWithAuth(`/api/memories/${memoryId}`, {
        method: "DELETE",
      });
    } catch (err: any) {
      console.error("Failed to delete memory:", err);
      await loadMemories();
    }
  };

  if (!isReady || loading) {
    return (
      <main className="p-4 flex flex-col gap-4 min-h-screen bg-[#000000] text-white">
        <header className="mt-2 mb-1 flex justify-between items-center">
          <div className="h-7 w-28 rounded-md skeleton-shimmer" />
          <div className="h-9 w-32 rounded-2xl skeleton-shimmer" />
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
        <h2 className="text-lg font-bold text-white mb-1">Не удалось загрузить память</h2>
        <p className="text-[#8e8e93] mb-5 text-sm max-w-xs">{error}</p>
        <button
          onClick={loadMemories}
          className="px-6 py-3 bg-[#007aff] hover:bg-[#1a8aff] active:scale-95 text-white font-semibold rounded-[18px] text-sm transition-all shadow-[0_4px_16px_rgba(0,122,255,0.3)]"
        >
          Повторить
        </button>
      </div>
    );
  }

  const categories = [
    { id: "all", label: "Все" },
    { id: "preference", label: "Предпочтения" },
    { id: "project", label: "Проекты" },
    { id: "educational", label: "Учеба" },
    { id: "professional", label: "Работа" },
    { id: "semantic", label: "Факты" },
  ];

  const filteredMemories = memories.filter((m) => {
    const matchesSearch = searchQuery
      ? m.content?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCategory =
      activeCategory === "all" ? true : m.type?.toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="p-4 pb-32 flex flex-col gap-3.5 min-h-screen bg-[#000000] text-white">
      {/* Header */}
      <header className="mt-2 mb-1 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white tracking-tight">
            Память
          </h1>
          <p className="text-xs text-[#8e8e93] mt-0.5">
            {memories.length} записей в базе знаний
          </p>
        </div>
        <button
          onClick={() => {
            haptic.impact("medium");
            setIsModalOpen(true);
          }}
          className="bg-[#007aff] hover:bg-[#1a8aff] text-white py-2 px-3.5 rounded-[18px] flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-[0_4px_16px_rgba(0,122,255,0.35)]"
        >
          <Plus size={16} strokeWidth={2.6} /> Запомнить
        </button>
      </header>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search size={18} className="text-[#8e8e93]" />
        </div>
        <input
          type="text"
          placeholder="Поиск воспоминаний..."
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

      {/* Memories List: Grouped Container */}
      <CardGroup>
        {filteredMemories.length > 0 ? (
          filteredMemories.map((m) => {
            const badge = getMemoryBadge(m.type);
            return (
              <div
                key={m.id}
                className="p-4 flex items-start justify-between gap-3.5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-11 h-11 rounded-full ${badge.bg} flex items-center justify-center ${badge.text} shrink-0 mt-0.5 shadow-sm`}
                  >
                    {badge.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/[0.08] ${badge.text} uppercase tracking-wider`}
                      >
                        {m.type}
                      </span>
                      <span className="text-xs text-[#8e8e93]">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <p className="text-white text-[15px] leading-relaxed break-words font-medium">
                      {m.content}
                    </p>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    const ok = await tgConfirm("Удалить это воспоминание?");
                    if (ok) {
                      deleteMemory(m.id);
                    }
                  }}
                  className="text-[#8e8e93] hover:text-rose-400 active:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 transition-colors shrink-0 touch-scale"
                  aria-label="Удалить воспоминание"
                  title="Удалить воспоминание"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })

        ) : (
          <div className="text-center text-[#8e8e93] py-12 px-4">
            <p className="text-sm font-medium">Воспоминания не найдены</p>
            <p className="text-xs text-[#8e8e93]/80 mt-1">
              Сохраняйте факты, предпочтения или важные заметки
            </p>
            <button
              onClick={() => {
                haptic.impact("medium");
                setIsModalOpen(true);
              }}
              className="mt-3.5 text-xs bg-[#007aff] hover:bg-[#1a8aff] text-white px-4 py-2.5 rounded-[18px] font-semibold inline-flex items-center gap-1.5 transition-all shadow-[0_4px_16px_rgba(0,122,255,0.3)] active:scale-95"
            >
              <Plus size={14} strokeWidth={2.6} /> Добавить воспоминание
            </button>
          </div>
        )}
      </CardGroup>

      {/* Add Memory Modal */}
      <ModalSheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Запомнить"
        subtitle="Сохраните новую информацию в долгосрочную память MIND"
      >
        <form onSubmit={handleAddMemory} className="flex flex-col gap-3.5">
          <div>
            <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Тип памяти</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-[#202127] text-white rounded-[18px] px-3.5 py-3 text-sm border border-white/[0.07] focus:outline-none focus:border-[#007aff]"
            >
              <option value="semantic">Семантическая (Общий факт)</option>
              <option value="preference">Предпочтение (Вкусы, привычки)</option>
              <option value="professional">Профессиональная (Работа, навыки)</option>
              <option value="educational">Учебная (Учеба, курсы)</option>
              <option value="task">Связанная с задачами</option>
              <option value="project">Проектная</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Содержание *</label>
            <textarea
              rows={3}
              required
              placeholder="Например: Люблю краткие ответы без вступлений, или курс дискретной математики..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-[#202127] text-white rounded-[18px] px-4 py-3 text-sm border border-white/[0.07] focus:outline-none focus:border-[#007aff] placeholder-[#707579] resize-none transition-all"
            />
          </div>

          <div className="flex gap-2.5 mt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-3.5 bg-[#202127] hover:bg-[#26272e] active:scale-[0.98] text-white rounded-[18px] text-sm font-medium transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="flex-1 py-3.5 bg-[#007aff] hover:bg-[#1a8aff] active:scale-[0.98] text-white rounded-[18px] text-sm font-semibold disabled:opacity-50 transition-all shadow-[0_4px_16px_rgba(0,122,255,0.3)]"
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </ModalSheet>
    </main>
  );
}
