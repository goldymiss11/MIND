"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "../lib/telegram/useTelegram";
import { fetchWithAuth } from "../lib/api/client";
import { Bell, Search, PlusCircle, FileText } from "lucide-react";

interface HomeData {
  tasksCount: number;
  upcomingDeadline: string | null;
  recentMemories: any[];
  recentArtifacts: any[];
}

export default function HomePage() {
  const { user, initData, isReady } = useTelegram();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isReady && initData) {
      loadData();
    } else if (isReady && !initData) {
      setError("Please open this app inside Telegram");
      setLoading(false);
    }
  }, [isReady, initData]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await fetchWithAuth("/api/miniapp/home", initData);
      setData(result.data);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
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
        <button onClick={loadData} className="px-4 py-2 bg-[#2481cc] text-white rounded-xl">Retry</button>
      </div>
    );
  }

  return (
    <main className="p-4 flex flex-col gap-6">
      <header className="flex justify-between items-center mt-2">
        <div>
          <h1 className="text-xl font-bold">Hello, {user?.first_name || "User"}</h1>
          <p className="text-[#999999] text-sm">Welcome back to MIND</p>
        </div>
        <div className="bg-[#1c1c1d] p-2 rounded-full cursor-pointer">
          <Bell size={20} className="text-[#999999]" />
        </div>
      </header>

      {/* Main Stats Card (Reference design) */}
      <div className="bg-gradient-to-br from-[#1c1c1d] to-[#121213] rounded-3xl p-6 shadow-md border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
        </div>
        <p className="text-[#999999] text-sm mb-1 font-medium">Active Tasks</p>
        <h2 className="text-4xl font-bold text-white mb-2">{data?.tasksCount || 0}</h2>
        {data?.upcomingDeadline ? (
          <p className="text-sm text-[#2481cc] font-medium flex items-center gap-1">
             <span className="w-2 h-2 rounded-full bg-[#2481cc]"></span> Next: {new Date(data.upcomingDeadline).toLocaleDateString()}
          </p>
        ) : (
          <p className="text-sm text-[#999999]">No upcoming deadlines</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between gap-3">
        {[
          { label: "New Task", icon: PlusCircle, color: "bg-[#2481cc]" },
          { label: "Search", icon: Search, color: "bg-[#1c1c1d]" },
        ].map((action, i) => (
          <button key={i} className={`${action.color} flex-1 py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-transform active:scale-95`}>
            <action.icon size={20} className="text-white" />
            <span className="text-xs font-medium text-white">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Recent Memories */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg">Recent Memories</h3>
          <span className="text-[#2481cc] text-sm">See all</span>
        </div>
        <div className="flex flex-col gap-2">
          {data?.recentMemories && data.recentMemories.length > 0 ? (
            data.recentMemories.map((m: any, i: number) => (
              <div key={i} className="bg-[#1c1c1d] p-4 rounded-2xl flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-[#2481cc]/20 flex items-center justify-center text-[#2481cc]">
                   <span className="text-xs font-bold uppercase">{m.type.substring(0,2)}</span>
                 </div>
                 <div className="flex-1 overflow-hidden">
                   <p className="text-white text-sm truncate">{m.content}</p>
                   <p className="text-[#999999] text-xs mt-1">{new Date(m.createdAt).toLocaleDateString()}</p>
                 </div>
              </div>
            ))
          ) : (
            <div className="bg-[#1c1c1d] p-6 rounded-2xl text-center text-[#999999]">
              No recent memories found
            </div>
          )}
        </div>
      </section>

      {/* Recent Artifacts */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg">Recent Artifacts</h3>
          <span className="text-[#2481cc] text-sm">See all</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
          {data?.recentArtifacts && data.recentArtifacts.length > 0 ? (
            data.recentArtifacts.map((a: any, i: number) => (
              <div key={i} className="min-w-[140px] bg-[#1c1c1d] p-4 rounded-2xl snap-start flex flex-col gap-2">
                 <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center">
                    <FileText size={16} />
                 </div>
                 <p className="text-white text-sm font-medium truncate">{a.name}</p>
                 <p className="text-[#999999] text-xs">{a.type}</p>
              </div>
            ))
          ) : (
            <div className="w-full bg-[#1c1c1d] p-6 rounded-2xl text-center text-[#999999]">
              No recent artifacts found
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
