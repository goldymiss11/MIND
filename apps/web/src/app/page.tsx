"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTelegram } from "../lib/telegram/useTelegram";
import { fetchWithAuth } from "../lib/api/client";
import { Bell, Search, PlusCircle, FileText, X, Check, Calendar, AlertCircle } from "lucide-react";

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

  // Modals state
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // New task form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskPriority, setTaskPriority] = useState<"normal" | "high">("normal");
  const [creatingTask, setCreatingTask] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

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
      setError(null);
      const result = await fetchWithAuth("/api/miniapp/home", initData);
      setData(result?.data ?? result);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      setCreatingTask(true);
      await fetchWithAuth("/api/miniapp/tasks", initData, {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDesc.trim() || undefined,
          deadline: taskDeadline ? new Date(taskDeadline).toISOString() : undefined,
          priority: taskPriority,
        }),
      });

      setTaskTitle("");
      setTaskDesc("");
      setTaskDeadline("");
      setIsNewTaskOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create task");
    } finally {
      setCreatingTask(false);
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

  const filteredMemories = data?.recentMemories?.filter((m) =>
    searchQuery ? m.content?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  ) || [];

  return (
    <main className="p-4 flex flex-col gap-6">
      <header className="flex justify-between items-center mt-2">
        <div>
          <h1 className="text-xl font-bold">Hello, {user?.first_name || "User"}</h1>
          <p className="text-[#999999] text-sm">Welcome back to MIND</p>
        </div>
        <button
          onClick={() => setIsNotificationsOpen(true)}
          className="bg-[#1c1c1d] p-2 rounded-full cursor-pointer hover:bg-[#2c2c2e] transition-colors relative"
          aria-label="Notifications"
        >
          <Bell size={20} className="text-[#999999]" />
          {data?.upcomingDeadline && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#2481cc] rounded-full"></span>
          )}
        </button>
      </header>

      {/* Main Stats Card */}
      <Link href="/tasks">
        <div className="bg-gradient-to-br from-[#1c1c1d] to-[#121213] rounded-3xl p-6 shadow-md border border-white/5 relative overflow-hidden transition-transform active:scale-[0.99] cursor-pointer">
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
      </Link>

      {/* Action Buttons */}
      <div className="flex justify-between gap-3">
        <button
          onClick={() => setIsNewTaskOpen(true)}
          className="bg-[#2481cc] flex-1 py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-transform active:scale-95"
        >
          <PlusCircle size={20} className="text-white" />
          <span className="text-xs font-medium text-white">New Task</span>
        </button>

        <button
          onClick={() => setIsSearchOpen(true)}
          className="bg-[#1c1c1d] flex-1 py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 hover:bg-[#2c2c2e]"
        >
          <Search size={20} className="text-white" />
          <span className="text-xs font-medium text-white">Search</span>
        </button>
      </div>

      {/* Recent Memories */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg">Recent Memories</h3>
          <Link href="/memory" className="text-[#2481cc] text-sm hover:underline">
            See all
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {data?.recentMemories && data.recentMemories.length > 0 ? (
            data.recentMemories.map((m: any, i: number) => (
              <div key={i} className="bg-[#1c1c1d] p-4 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2481cc]/20 flex items-center justify-center text-[#2481cc] shrink-0">
                  <span className="text-xs font-bold uppercase">{m.type ? m.type.substring(0, 2) : "ME"}</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-white text-sm truncate">{m.content}</p>
                  <p className="text-[#999999] text-xs mt-0.5">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-[#999999] py-6 bg-[#1c1c1d]/40 rounded-2xl border border-white/5">
              <p className="text-sm">No memories recorded yet</p>
              <Link href="/memory" className="text-[#2481cc] text-xs mt-2 inline-block font-medium">
                + Add first memory
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Quick Navigation to Artifacts */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg">Artifacts & Files</h3>
          <Link href="/artifacts" className="text-[#2481cc] text-sm hover:underline">
            Open
          </Link>
        </div>
        <Link href="/artifacts">
          <div className="bg-[#1c1c1d] p-4 rounded-2xl flex items-center justify-between border border-white/5 hover:bg-[#252528] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Documents & Reports</p>
                <p className="text-[#999999] text-xs">Generated files and articles</p>
              </div>
            </div>
            <span className="text-[#999999] text-xs">&rarr;</span>
          </div>
        </Link>
      </section>

      {/* Modal: New Task */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[#1c1c1e] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Create New Task</h2>
              <button onClick={() => setIsNewTaskOpen(false)} className="text-[#999] hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-[#999] mb-1 block">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Finish report or call doctor"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-[#2c2c2e] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#2481cc]"
                />
              </div>

              <div>
                <label className="text-xs text-[#999] mb-1 block">Description (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional details..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full bg-[#2c2c2e] text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2481cc] resize-none"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-[#999] mb-1 block">Deadline</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full bg-[#2c2c2e] text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2481cc]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-[#999] mb-1 block">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full bg-[#2c2c2e] text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2481cc]"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="flex-1 py-2.5 bg-[#2c2c2e] text-white rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask || !taskTitle.trim()}
                  className="flex-1 py-2.5 bg-[#2481cc] text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {creatingTask ? "Creating..." : "Save Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Search */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-12 animate-in fade-in">
          <div className="bg-[#1c1c1e] w-full max-w-md rounded-3xl p-5 border border-white/10 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Search MIND</h2>
              <button onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }} className="text-[#999] hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-[#999]" />
              <input
                type="text"
                autoFocus
                placeholder="Search memories or tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#2c2c2e] text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#2481cc]"
              />
            </div>

            <div className="max-h-60 overflow-y-auto flex flex-col gap-2">
              {filteredMemories.length > 0 ? (
                filteredMemories.map((m: any, i: number) => (
                  <div key={i} className="p-3 bg-[#2c2c2e] rounded-xl text-sm text-white">
                    <span className="text-[10px] text-[#2481cc] uppercase font-bold mr-2">{m.type}</span>
                    {m.content}
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-[#999] py-4">No matching records</p>
              )}
            </div>

            <div className="flex gap-2">
              <Link
                href="/tasks"
                onClick={() => setIsSearchOpen(false)}
                className="flex-1 py-2 bg-[#2c2c2e] text-center text-xs text-[#2481cc] font-medium rounded-xl hover:bg-[#38383a]"
              >
                Go to Tasks &rarr;
              </Link>
              <Link
                href="/memory"
                onClick={() => setIsSearchOpen(false)}
                className="flex-1 py-2 bg-[#2c2c2e] text-center text-xs text-[#2481cc] font-medium rounded-xl hover:bg-[#38383a]"
              >
                Go to Memory &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Notifications */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-16 animate-in fade-in">
          <div className="bg-[#1c1c1e] w-full max-w-md rounded-3xl p-5 border border-white/10 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell size={20} className="text-[#2481cc]" /> Notifications
              </h2>
              <button onClick={() => setIsNotificationsOpen(false)} className="text-[#999] hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {data?.upcomingDeadline ? (
                <div className="p-3 bg-[#2481cc]/15 border border-[#2481cc]/30 rounded-2xl flex items-start gap-3">
                  <Calendar size={20} className="text-[#2481cc] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white">Upcoming Deadline</p>
                    <p className="text-xs text-[#999] mt-0.5">
                      You have an active deadline due on {new Date(data.upcomingDeadline).toLocaleDateString()}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#2c2c2e] rounded-2xl flex items-center gap-3">
                  <Check size={18} className="text-emerald-400 shrink-0" />
                  <p className="text-xs text-[#999]">No pressing deadlines right now.</p>
                </div>
              )}

              <div className="p-3 bg-[#2c2c2e] rounded-2xl flex items-center gap-3">
                <AlertCircle size={18} className="text-[#2481cc] shrink-0" />
                <p className="text-xs text-white">
                  Active tasks in progress: <strong className="text-[#2481cc]">{data?.tasksCount || 0}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsNotificationsOpen(false)}
              className="w-full py-2 bg-[#2c2c2e] text-xs text-white rounded-xl font-medium mt-1"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
