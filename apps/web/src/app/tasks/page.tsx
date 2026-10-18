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
    if (isReady) {
      loadTasks();
    }
  }, [isReady, initData]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      if (initData) {
        const result = await fetchWithAuth("/api/tasks?all=true");
        setTasks(Array.isArray(result) ? result : (result?.data ?? []));
      } else {
        // Fallback preview tasks
        setTasks([
          {
            id: "1",
            title: "Сдать курсовую по дискретной математике",
            description: "Оформить список литературы по ГОСТу и прикрепить титульный лист",
            deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
            priority: "high",
            status: "in_progress",
          },
          {
            id: "2",
            title: "Подготовить презентацию для демо-дня",
            description: "Слайды 1-10 с архитектурой агентов и памятью",
            deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
            priority: "normal",
            status: "in_progress",
          },
          {
            id: "3",
            title: "Обсудить рефакторинг Fastify API",
            description: "Согласовать структуру пакетов и схемы валидации",
            deadline: new Date().toISOString(),
            priority: "normal",
            status: "in_progress",
          },
          {
            id: "4",
            title: "Купить авиабилеты на конференцию",
            description: "Проверить прямые рейсы",
            deadline: null,
            priority: "normal",
            status: "completed",
          },
        ]);
      }
    } catch (err: any) {
      if (!initData) {
        setTasks([
          {
            id: "1",
            title: "Сдать курсовую по дискретной математике",
            description: "Оформить список литературы по ГОСТу и прикрепить титульный лист",
            deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
            priority: "high",
            status: "in_progress",
          },
          {
            id: "2",
            title: "Подготовить презентацию для демо-дня",
            description: "Слайды 1-10 с архитектурой агентов и памятью",
            deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
            priority: "normal",
            status: "in_progress",
          },
          {
            id: "3",
            title: "Обсудить рефакторинг Fastify API",
            description: "Согласовать структуру пакетов и схемы валидации",
            deadline: new Date().toISOString(),
            priority: "normal",
            status: "in_progress",
          },
          {
            id: "4",
            title: "Купить авиабилеты на конференцию",
            description: "Проверить прямые рейсы",
            deadline: null,
            priority: "normal",
            status: "completed",
          },
        ]);
      } else {
        setError(err.message || "Failed to load tasks");
      }
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
      await fetchWithAuth(`/api/tasks/${taskId}`, {
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
      await fetchWithAuth(`/api/tasks/${taskId}`, {
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
      const newTask = await fetchWithAuth("/api/tasks", {
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
          onClick={loadTasks}
          className="px-5 py-2.5 bg-[#007aff] hover:bg-[#007aff]/90 text-white font-medium rounded-2xl text-sm"
        >
          Retry
        </button>
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

  const filterTabs: Array<{ id: "All" | "Today" | "Upcoming" | "Completed"; label: string }> = [
    { id: "All", label: "Все" },
    { id: "Today", label: "Сегодня" },
    { id: "Upcoming", label: "Скоро" },
    { id: "Completed", label: "Готово" },
  ];

  return (
    <main className="p-4 flex flex-col gap-4 min-h-screen bg-[#000000] text-white pb-24">
      <header className="mt-2 mb-1 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white tracking-tight">Задачи</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#007aff] hover:bg-[#007aff]/90 text-white py-2 px-3.5 rounded-2xl flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-sm"
        >
          <Plus size={16} strokeWidth={2.5} /> Новая задача
        </button>
      </header>

      {/* Segmented Filter Controls */}
      <div className="bg-[#1c1c1e] p-1 rounded-2xl flex gap-1 border border-white/5 shadow-sm">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                isActive
                  ? "bg-[#2c2c2e] text-white shadow-sm border border-white/5"
                  : "text-[#8e8e93] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Task List: Grouped Container */}
      <div className="bg-[#1c1c1e] rounded-3xl divide-y divide-white/5 overflow-hidden border border-white/5 shadow-sm">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 flex items-start gap-3 hover:bg-white/[0.02] transition-colors"
            >
              <button
                onClick={() => toggleTask(task.id, task.status)}
                className="mt-0.5 shrink-0 transition-transform active:scale-90"
              >
                {task.status === "completed" ? (
                  <CheckCircle2 size={22} className="text-[#30d158]" />
                ) : (
                  <Circle size={22} className="text-[#8e8e93] hover:text-[#007aff]" />
                )}
              </button>
              <div className="flex-1 overflow-hidden">
                <h3
                  className={`text-[15px] font-medium leading-tight mb-1 ${
                    task.status === "completed" ? "text-[#8e8e93] line-through" : "text-white"
                  }`}
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-[#8e8e93] text-xs line-clamp-2 mb-2 leading-relaxed">
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-2.5 mt-1.5">
                  {task.deadline && (
                    <div className="flex items-center gap-1 text-[#007aff] text-xs font-medium">
                      <Clock size={12} />
                      <span>{new Date(task.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  {task.priority === "high" && (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-full">
                      Высокий
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
                className="text-[#8e8e93] hover:text-rose-400 active:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 transition-all shrink-0"
                aria-label="Delete task"
                title="Удалить задачу"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center text-[#8e8e93] py-12 px-4">
            <p className="text-sm font-medium">В этом списке нет задач</p>
            {activeFilter !== "All" && (
              <button
                onClick={() => setActiveFilter("All")}
                className="text-[#007aff] text-xs font-semibold mt-2 hover:underline"
              >
                Показать все задачи
              </button>
            )}
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[#1c1c1e] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Новая задача</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8e8e93] hover:text-white p-1 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Название *</label>
                <input
                  type="text"
                  required
                  placeholder="Что нужно сделать?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#2c2c2e] text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#007aff] placeholder-[#8e8e93]"
                />
              </div>

              <div>
                <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Описание (необязательно)</label>
                <textarea
                  rows={2}
                  placeholder="Заметки или контекст..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-[#2c2c2e] text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#007aff] placeholder-[#8e8e93] resize-none"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Дедлайн</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-[#2c2c2e] text-white rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#007aff]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Приоритет</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-[#2c2c2e] text-white rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#007aff]"
                  >
                    <option value="normal">Обычный</option>
                    <option value="high">Высокий</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 mt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-[#2c2c2e] hover:bg-[#38383a] text-white rounded-2xl text-sm font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="flex-1 py-3 bg-[#007aff] hover:bg-[#007aff]/90 text-white rounded-2xl text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {saving ? "Сохранение..." : "Создать задачу"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

