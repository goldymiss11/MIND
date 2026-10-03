"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "../../lib/telegram/useTelegram";
import { fetchWithAuth } from "../../lib/api/client";
import { CheckCircle2, Circle, Clock, Plus, Trash2, X } from "lucide-react";

export default function TasksPage() {
  const { initData, isReady } = useTelegram();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"All" | "Today" | "Upcoming" | "Completed">("All");

  // New task modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"normal" | "high">("normal");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isReady && initData) {
      loadTasks();
    } else if (isReady && !initData) {
      setError("Please open this app inside Telegram");
      setLoading(false);
    }
  }, [isReady, initData]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchWithAuth("/api/miniapp/tasks", initData);
      setTasks(Array.isArray(result) ? result : (result?.data ?? []));
    } catch (err: any) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: string, currentStatus: string) => {
    const isCompleted = currentStatus === "completed";
    const newStatus = isCompleted ? "in_progress" : "completed";
    
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await fetchWithAuth(`/api/miniapp/tasks/${taskId}`, initData, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err: any) {
      console.error("Failed to update task status:", err);
      // Revert if failed
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus } : t))
      );
    }
  };

  const deleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await fetchWithAuth(`/api/miniapp/tasks/${taskId}`, initData, {
        method: "DELETE",
      });
    } catch (err: any) {
      console.error("Failed to delete task:", err);
      await loadTasks();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);
      const newTask = await fetchWithAuth("/api/miniapp/tasks", initData, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim() || undefined,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          priority,
        }),
      });

      if (newTask) {
        setTasks((prev) => [newTask, ...prev]);
      }
      setTitle("");
      setDesc("");
      setDeadline("");
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to create task");
    } finally {
      setSaving(false);
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
        <button onClick={loadTasks} className="px-4 py-2 bg-[#2481cc] text-white rounded-xl">Retry</button>
      </div>
    );
  }

  // Filter tasks logic
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === "Completed") {
      return t.status === "completed";
    }
    if (activeFilter === "All") {
      return true;
    }
    if (!t.deadline) return false;
    const taskDate = new Date(t.deadline);
    if (activeFilter === "Today") {
      return taskDate >= startOfToday && taskDate <= endOfToday;
    }
    if (activeFilter === "Upcoming") {
      return taskDate > endOfToday && t.status !== "completed";
    }
    return true;
  });

  return (
    <main className="p-4 flex flex-col gap-4 min-h-screen pb-24">
      <header className="mt-2 mb-2 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Tasks</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#2481cc] text-white p-2 rounded-2xl flex items-center gap-1.5 px-3.5 text-xs font-semibold active:scale-95 transition-transform"
        >
          <Plus size={16} /> New Task
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar">
        {(["All", "Today", "Upcoming", "Completed"] as const).map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-[#2481cc] text-white font-medium"
                  : "bg-[#1c1c1d] text-[#999999] hover:text-white"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div key={task.id} className="bg-[#1c1c1d] p-4 rounded-2xl flex items-start gap-3 border border-white/5">
              <button
                onClick={() => toggleTask(task.id, task.status)}
                className="mt-0.5 shrink-0 transition-transform active:scale-90"
              >
                {task.status === "completed" ? (
                  <CheckCircle2 size={24} className="text-[#2481cc]" />
                ) : (
                  <Circle size={24} className="text-[#999999] hover:text-white" />
                )}
              </button>
              <div className="flex-1 overflow-hidden">
                <h3
                  className={`text-[15px] font-medium leading-tight mb-1 ${
                    task.status === "completed" ? "text-[#999999] line-through" : "text-white"
                  }`}
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-[#999999] text-xs line-clamp-2 mb-2">{task.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  {task.deadline && (
                    <div className="flex items-center gap-1 text-[#2481cc] text-xs font-medium">
                      <Clock size={12} />
                      <span>{new Date(task.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  {task.priority === "high" && (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                      High
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Удалить задачу «${task.title}»?`)) {
                    deleteTask(task.id);
                  }
                }}
                className="text-[#888] hover:text-rose-400 active:text-rose-400 p-2.5 rounded-xl hover:bg-rose-500/10 active:bg-rose-500/20 transition-all shrink-0 -mr-1"
                aria-label="Delete task"
                title="Удалить задачу"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center text-[#999999] py-12 bg-[#1c1c1d]/30 rounded-2xl border border-white/5">
            <p className="text-sm">No tasks in this view</p>
            {activeFilter !== "All" && (
              <button
                onClick={() => setActiveFilter("All")}
                className="text-[#2481cc] text-xs font-medium mt-2"
              >
                Show all tasks
              </button>
            )}
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[#1c1c1e] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">New Task</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#999] hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-[#999] mb-1 block">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="What needs to be done?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#2c2c2e] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#2481cc]"
                />
              </div>

              <div>
                <label className="text-xs text-[#999] mb-1 block">Description</label>
                <textarea
                  rows={2}
                  placeholder="Notes or context..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-[#2c2c2e] text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2481cc] resize-none"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-[#999] mb-1 block">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-[#2c2c2e] text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2481cc]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-[#999] mb-1 block">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
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
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#2c2c2e] text-white rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="flex-1 py-2.5 bg-[#2481cc] text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
