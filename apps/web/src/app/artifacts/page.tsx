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
      setError(null);
      const result = await fetchWithAuth("/api/miniapp/artifacts", initData);
      setArtifacts(Array.isArray(result) ? result : (result?.data ?? []));
    } catch (err: any) {
      setError(err.message || "Failed to load artifacts");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (artifact: any) => {
    const blob = new Blob([artifact.content || ""], { type: "text/markdown;charset=utf-8" });
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

  const filteredArtifacts = artifacts.filter((a) =>
    searchQuery ? a.name?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <main className="p-4 flex flex-col gap-4 min-h-screen pb-24">
      <header className="mt-2 mb-2">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <FileText size={28} className="text-[#2481cc]" /> Artifacts
        </h1>
      </header>

      {/* Search Input */}
      <div className="relative mb-2">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-[#999999]" />
        </div>
        <input 
          type="text" 
          placeholder="Search artifacts..." 
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

      {/* Artifacts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredArtifacts.length > 0 ? (
          filteredArtifacts.map((a) => (
            <div
              key={a.id}
              className="bg-[#1c1c1d] p-4 rounded-2xl flex flex-col justify-between gap-3 border border-white/5 relative group hover:border-[#2481cc]/40 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedArtifact(a)}
                    className="p-1.5 text-[#999] hover:text-white bg-[#2c2c2e] rounded-lg transition-colors"
                    title="View content"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    onClick={() => handleDownload(a)}
                    className="p-1.5 text-[#999] hover:text-[#2481cc] bg-[#2c2c2e] rounded-lg transition-colors"
                    title="Download file"
                  >
                    <Download size={15} />
                  </button>
                </div>
              </div>

              <div onClick={() => setSelectedArtifact(a)} className="cursor-pointer">
                <p className="text-white text-sm font-semibold line-clamp-2 hover:text-[#2481cc] transition-colors">
                  {a.name}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] uppercase font-bold text-[#999999] bg-white/5 px-2 py-0.5 rounded">
                    {a.type || "DOC"}
                  </span>
                  <span className="text-[11px] text-[#666]">
                    {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-[#999999] py-12 bg-[#1c1c1d]/30 rounded-2xl border border-white/5">
            <p className="text-sm">No artifacts found</p>
            <p className="text-xs text-[#666] mt-1">
              Ask MIND in Telegram to create articles, reports or code files.
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
              <button onClick={() => setSelectedArtifact(null)} className="text-[#999] hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[50vh] p-3 bg-[#121213] rounded-2xl border border-white/5 text-sm text-[#ddd] font-mono whitespace-pre-wrap leading-relaxed">
              {selectedArtifact.content || "Empty document"}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedArtifact(null)}
                className="flex-1 py-2.5 bg-[#2c2c2e] text-white rounded-xl text-sm font-medium"
              >
                Close
              </button>
              <button
                onClick={() => handleDownload(selectedArtifact)}
                className="flex-1 py-2.5 bg-[#2481cc] text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
              >
                <Download size={16} /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
