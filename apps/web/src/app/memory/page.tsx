"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "../../lib/telegram/useTelegram";
import { fetchWithAuth } from "../../lib/api/client";
import { Brain, Search, Plus, Trash2, X } from "lucide-react";

export default function MemoryPage() {
  const { initData, isReady } = useTelegram();
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Add memory modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState("");
  const [type, setType] = useState("semantic");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isReady && initData) {
      loadMemories();
    } else if (isReady && !initData) {
      setError("Please open this app inside Telegram");
      setLoading(false);
    }
  }, [isReady, initData]);

  const loadMemories = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchWithAuth("/api/memories");
      setMemories(Array.isArray(result) ? result : (result?.data ?? []));
    } catch (err: any) {
      setError(err.message || "Failed to load memories");
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

      if (newMemory) {
        setMemories((prev) => [newMemory, ...prev]);
      }
      setContent("");
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to save memory");
    } finally {
      setSaving(false);
    }
  };

  const deleteMemory = async (memoryId: string) => {
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
          onClick={loadMemories}
          className="px-5 py-2.5 bg-[#007aff] hover:bg-[#007aff]/90 text-white font-medium rounded-2xl text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const filteredMemories = memories.filter((m) =>
    searchQuery ? m.content?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <main className="p-4 flex flex-col gap-4 min-h-screen bg-[#000000] text-white pb-24">
      <header className="mt-2 mb-1 flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white tracking-tight">
          <Brain size={26} className="text-[#007aff]" /> Память
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#007aff] hover:bg-[#007aff]/90 text-white py-2 px-3.5 rounded-2xl flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-sm"
        >
          <Plus size={16} strokeWidth={2.5} /> Запомнить
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
          className="w-full bg-[#1c1c1e] text-white placeholder-[#8e8e93] rounded-2xl pl-10 pr-10 py-3 border-none focus:outline-none focus:ring-1 focus:ring-[#007aff] text-sm transition-shadow"
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

      {/* Memories List: Grouped Container */}
      <div className="bg-[#1c1c1e] rounded-3xl divide-y divide-white/5 overflow-hidden">
        {filteredMemories.length > 0 ? (
          filteredMemories.map((m) => (
            <div
              key={m.id}
              className="p-4 flex items-start justify-between gap-3 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-[#af52de]/20 flex items-center justify-center text-[#af52de] shrink-0 mt-0.5">
                  <Brain size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-[#af52de] uppercase tracking-wider">
                      {m.type}
                    </span>
                    <span className="text-xs text-[#8e8e93]">
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <p className="text-white text-[15px] leading-relaxed break-words">{m.content}</p>
                </div>
              </div>
              <button
                onClick={() => deleteMemory(m.id)}
                className="text-[#8e8e93] hover:text-rose-400 active:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 transition-colors shrink-0"
                aria-label="Delete memory"
                title="Удалить воспоминание"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center text-[#8e8e93] py-12 px-4">
            <p className="text-sm font-medium">Воспоминания не найдены</p>
            <p className="text-xs text-[#8e8e93]/80 mt-1">
              Сохраняйте факты, предпочтения или важные заметки
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3.5 text-xs bg-[#007aff] hover:bg-[#007aff]/90 text-white px-3.5 py-2 rounded-2xl font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} strokeWidth={2.5} /> Добавить воспоминание
            </button>
          </div>
        )}
      </div>

      {/* Add Memory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[#1c1c1e] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Запомнить</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8e8e93] hover:text-white p-1 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMemory} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Тип памяти</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-[#2c2c2e] text-white rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#007aff]"
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
                  placeholder="Например: Мой любимый язык TypeScript, или напоминать мне пить воду каждые 2 часа"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-[#2c2c2e] text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#007aff] placeholder-[#8e8e93] resize-none"
                />
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-[#2c2c2e] hover:bg-[#38383a] text-white rounded-2xl text-sm font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving || !content.trim()}
                  className="flex-1 py-3 bg-[#007aff] hover:bg-[#007aff]/90 text-white rounded-2xl text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

