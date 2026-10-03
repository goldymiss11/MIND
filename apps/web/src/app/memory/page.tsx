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
      const result = await fetchWithAuth("/api/miniapp/memories", initData);
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
      const newMemory = await fetchWithAuth("/api/miniapp/memories", initData, {
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
      await fetchWithAuth(`/api/miniapp/memories/${memoryId}`, initData, {
        method: "DELETE",
      });
    } catch (err: any) {
      console.error("Failed to delete memory:", err);
      await loadMemories();
    }
  };

  if (!isReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#2481cc] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={loadMemories} className="px-4 py-2 bg-[#2481cc] text-white rounded-xl">Retry</button>
      </div>
    );
  }

  const filteredMemories = memories.filter((m) =>
    searchQuery ? m.content?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <main className="p-4 flex flex-col gap-4 min-h-screen pb-24">
      <header className="mt-2 mb-2 flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <Brain size={28} className="text-[#2481cc]" /> Memory
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#2481cc] text-white p-2 rounded-2xl flex items-center gap-1.5 px-3.5 text-xs font-semibold active:scale-95 transition-transform"
        >
          <Plus size={16} /> Add Memory
        </button>
      </header>

      {/* Search Input */}
      <div className="relative mb-2">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-[#999999]" />
        </div>
        <input 
          type="text" 
          placeholder="Search memories..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#1c1c1d] text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#2481cc] transition-shadow placeholder:text-[#999999] text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#999] hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Memories List */}
      <div className="flex flex-col gap-3">
        {filteredMemories.length > 0 ? (
          filteredMemories.map((m) => (
            <div key={m.id} className="bg-[#1c1c1d] p-4 rounded-2xl flex flex-col gap-2 border border-white/5 relative group">
              <div className="flex justify-between items-start">
                 <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white/80 uppercase">
                   {m.type}
                 </span>
                 <div className="flex items-center gap-2">
                   <span className="text-xs text-[#999999]">
                     {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""}
                   </span>
                   <button
                     onClick={() => deleteMemory(m.id)}
                     className="text-[#666] hover:text-rose-400 p-0.5 transition-colors"
                     aria-label="Delete memory"
                   >
                     <Trash2 size={15} />
                   </button>
                 </div>
              </div>
              <p className="text-white text-[15px] leading-relaxed mt-1">{m.content}</p>
            </div>
          ))
        ) : (
          <div className="text-center text-[#999999] py-12 bg-[#1c1c1d]/30 rounded-2xl border border-white/5">
            <p className="text-sm">No memories found</p>
            <p className="text-xs text-[#666] mt-1">
              Add facts, preferences, or important notes about yourself
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3 text-xs bg-[#2481cc] text-white px-3 py-1.5 rounded-xl font-medium inline-flex items-center gap-1"
            >
              <Plus size={14} /> Add First Memory
            </button>
          </div>
        )}
      </div>

      {/* Add Memory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[#1c1c1e] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Remember Something</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#999] hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMemory} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-[#999] mb-1 block">Memory Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-[#2c2c2e] text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2481cc]"
                >
                  <option value="semantic">Semantic (General fact)</option>
                  <option value="preference">Preference (Favorites, dislikes)</option>
                  <option value="professional">Professional (Work, skills)</option>
                  <option value="educational">Educational (Study, courses)</option>
                  <option value="task">Task-related</option>
                  <option value="project">Project</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[#999] mb-1 block">Content *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. My preferred coding language is TypeScript, or I prefer concise explanations"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-[#2c2c2e] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#2481cc] resize-none"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#2c2c2e] text-white rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !content.trim()}
                  className="flex-1 py-2.5 bg-[#2481cc] text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Memory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
