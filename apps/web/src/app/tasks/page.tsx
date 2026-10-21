"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "../../lib/telegram/useTelegram";
import { fetchWithAuth } from "../../lib/api/client";
import { CheckCircle2, Circle, Clock, Plus, Trash2, AlertCircle } from "lucide-react";
import { CardGroup } from "../../components/ui/CardGroup";
import { ModalSheet } from "../../components/ui/ModalSheet";
import { CardGroupSkeleton } from "../../components/ui/LoadingSkeleton";

export default function TasksPage() {
  const { initData, isReady, haptic, confirm: tgConfirm } = useTelegram();
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

    haptic.impact(isCompleted ? "light" : "medium");

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
    haptic.impact("heavy");
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

      haptic.notification("success");
      if (newTask) {
        setTasks((prev) => [newTask, ...prev]);
      }
      setTitle("");
      setDesc("");
      setDeadline("");
      setIsModalOpen(false);
    } catch (err: any) {
      haptic.notification("error");
      alert(err.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

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

  if (!isReady || loading) {
    return (
      <main className="p-4 flex flex-col gap-4 min-h-screen bg-[#000000] text-white">
        <header className="mt-2 mb-1 flex justify-between items-center">
          <div className="h-7 w-28 rounded-md skeleton-shimmer" />
          <div className="h-9 w-32 rounded-2xl skeleton-shimmer" />
        </header>
        <div className="h-10 rounded-2xl skeleton-shimmer" />
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
        <h2 className="text-lg font-bold text-white mb-1">Не удалось загрузить задачи</h2>
        <p className="text-[#8e8e93] mb-5 text-sm max-w-xs">{error}</p>
        <button
          onClick={loadTasks}
          className="px-6 py-3 bg-[#007aff] hover:bg-[#1a8aff] active:scale-95 text-white font-semibold rounded-[18px] text-sm transition-all shadow-[0_4px_16px_rgba(0,122,255,0.3)]"
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <main className="p-4 pb-32 flex flex-col gap-3.5 min-h-screen bg-[#000000] text-white">
      {/* Header */}
      <header className="mt-2 mb-1 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Задачи</h1>
          <p className="text-xs text-[#8e8e93] mt-0.5">
            {tasks.filter((t) => t.status !== "completed").length} активных
          </p>
        </div>
        <button
          onClick={() => {
            haptic.impact("medium");
            setIsModalOpen(true);
          }}
          className="bg-[#007aff] hover:bg-[#1a8aff] text-white py-2 px-3.5 rounded-[18px] flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-[0_4px_16px_rgba(0,122,255,0.35)]"
        >
          <Plus size={16} strokeWidth={2.6} /> Новая задача
        </button>
      </header>

      {/* Segmented Filter Controls (Wallet pill tab bar style) */}
      <div className="bg-[#16171b] p-1 rounded-2xl flex gap-1 border border-white/[0.07] shadow-sm">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                haptic.selection();
                setActiveFilter(tab.id);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 select-none ${
                isActive
                  ? "bg-[#24252c] text-white shadow-sm border border-white/[0.08]"
                  : "text-[#8e8e93] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Task List: Grouped Container */}
      <CardGroup>
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 flex items-start gap-3.5 hover:bg-white/[0.02] transition-colors"
            >
              <button
                onClick={() => toggleTask(task.id, task.status)}
                className="mt-0.5 shrink-0 transition-transform active:scale-90 touch-scale"
                aria-label={task.status === "completed" ? "Отметить невыполненной" : "Отметить выполненной"}
              >
                {task.status === "completed" ? (
                  <CheckCircle2 size={22} className="text-[#30d158]" />
                ) : (
                  <Circle size={22} className="text-[#8e8e93] hover:text-[#007aff] transition-colors" />
                )}
              </button>

              <div className="flex-1 overflow-hidden min-w-0">
                <h3
                  className={`text-[15px] font-semibold leading-snug mb-1 tracking-tight break-words ${
                    task.status === "completed" ? "text-[#8e8e93] line-through" : "text-white"
                  }`}
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-[#8e8e93] text-[13px] line-clamp-2 mb-2 leading-relaxed">
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {task.deadline && (
                    <div className="inline-flex items-center gap-1 text-[#007aff] text-xs font-medium bg-[#007aff]/10 px-2.5 py-0.5 rounded-full">
                      <Clock size={12} />
                      <span>{new Date(task.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  {task.priority === "high" && (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Высокий
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const ok = await tgConfirm(`Удалить задачу «${task.title}»?`);
                  if (ok) {
                    deleteTask(task.id);
                  }
                }}
                className="text-[#8e8e93] hover:text-rose-400 active:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 transition-all shrink-0 touch-scale"
                aria-label="Удалить задачу"
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
                onClick={() => {
                  haptic.selection();
                  setActiveFilter("All");
                }}
                className="text-[#007aff] text-xs font-semibold mt-2 hover:underline"
              >
                Показать все задачи
              </button>
            )}
          </div>
        )}
      </CardGroup>

      {/* New Task Modal */}
      <ModalSheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Новая задача"
        subtitle="Что нужно запланировать или выполнить?"
      >
        <form onSubmit={handleCreateTask} className="flex flex-col gap-3.5">
          <div>
            <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Название *</label>
            <input
              type="text"
              required
              placeholder="Что нужно сделать?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#202127] text-white rounded-[18px] px-4 py-3 text-sm border border-white/[0.07] focus:outline-none focus:border-[#007aff] placeholder-[#707579] transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Описание (необязательно)</label>
            <textarea
              rows={2}
              placeholder="Заметки или контекст..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full bg-[#202127] text-white rounded-[18px] px-4 py-3 text-sm border border-white/[0.07] focus:outline-none focus:border-[#007aff] placeholder-[#707579] resize-none transition-all"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Дедлайн</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-[#202127] text-white rounded-[18px] px-3.5 py-2.5 text-sm border border-white/[0.07] focus:outline-none focus:border-[#007aff]"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Приоритет</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-[#202127] text-white rounded-[18px] px-3.5 py-2.5 text-sm border border-white/[0.07] focus:outline-none focus:border-[#007aff]"
              >
                <option value="normal">Обычный</option>
                <option value="high">Высокий</option>
              </select>
            </div>
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
              disabled={saving || !title.trim()}
              className="flex-1 py-3.5 bg-[#007aff] hover:bg-[#1a8aff] active:scale-[0.98] text-white rounded-[18px] text-sm font-semibold disabled:opacity-50 transition-all shadow-[0_4px_16px_rgba(0,122,255,0.3)]"
            >
              {saving ? "Сохранение..." : "Создать задачу"}
            </button>
          </div>
        </form>
      </ModalSheet>
    </main>
  );
}
