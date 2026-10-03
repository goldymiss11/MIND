"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "../../lib/telegram/useTelegram";
import { fetchWithAuth } from "../../lib/api/client";
import { FileText, Search, Download } from "lucide-react";

export default function ArtifactsPage() {
  const { initData, isReady } = useTelegram();
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && initData) {
      loadArtifacts();
    } else if (isReady && !initData) {
      setError("Please open this app inside Telegram");
      setLoading(false);
    }
  }, [isReady, initData]);

  const loadArtifacts = async () => {
    try {
      setLoading(true);
      const result = await fetchWithAuth("/api/miniapp/artifacts", initData);
      setArtifacts(result.data);
    } catch (err: any) {
      setError(err.message || "Failed to load artifacts");
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
        <button onClick={loadArtifacts} className="px-4 py-2 bg-[#2481cc] text-white rounded-xl">Retry</button>
      </div>
    );
  }

  return (
    <main className="p-4 flex flex-col gap-4 min-h-screen pb-24">
      <header className="mt-2 mb-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText size={28} className="text-[#2481cc]" /> Artifacts
        </h1>
      </header>

      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-[#999999]" />
        </div>
        <input 
          type="text" 
          placeholder="Search artifacts..." 
          className="w-full bg-[#1c1c1d] text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#2481cc] transition-shadow placeholder:text-[#999999]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {artifacts.length > 0 ? (
          artifacts.map((a) => (
            <div key={a.id} className="bg-[#1c1c1d] p-4 rounded-2xl flex flex-col gap-3 relative group">
              <div className="absolute top-3 right-3 text-[#999999] opacity-0 group-hover:opacity-100 transition-opacity">
                 <Download size={16} />
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center mb-1">
                 <FileText size={20} />
              </div>
              <div>
                 <p className="text-white text-sm font-medium line-clamp-2">{a.name}</p>
                 <p className="text-[#999999] text-xs mt-1 uppercase">{a.type}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center text-[#999999] mt-10">
            No artifacts found
          </div>
        )}
      </div>
    </main>
  );
}
