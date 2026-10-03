"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "../../lib/telegram/useTelegram";
import { fetchWithAuth } from "../../lib/api/client";
import { Brain, Search } from "lucide-react";

export default function MemoryPage() {
  const { initData, isReady } = useTelegram();
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const result = await fetchWithAuth("/api/miniapp/memories", initData);
      setMemories(result.data);
    } catch (err: any) {
      setError(err.message || "Failed to load memories");
    } finally {
      setLoading(false);
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

  return (
    <main className="p-4 flex flex-col gap-4 min-h-screen pb-24">
      <header className="mt-2 mb-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain size={28} className="text-[#2481cc]" /> Memory
        </h1>
      </header>

      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-[#999999]" />
        </div>
        <input 
          type="text" 
          placeholder="Search memories..." 
          className="w-full bg-[#1c1c1d] text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#2481cc] transition-shadow placeholder:text-[#999999]"
        />
      </div>

      <div className="flex flex-col gap-3">
        {memories.length > 0 ? (
          memories.map((m) => (
            <div key={m.id} className="bg-[#1c1c1d] p-4 rounded-2xl flex flex-col gap-2">
              <div className="flex justify-between items-start">
                 <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white/80">
                   {m.type}
                 </span>
                 <span className="text-xs text-[#999999]">{new Date(m.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-white text-[15px] leading-relaxed mt-1">{m.content}</p>
            </div>
          ))
        ) : (
          <div className="text-center text-[#999999] mt-10">
            No memories found
          </div>
        )}
      </div>
    </main>
  );
}
