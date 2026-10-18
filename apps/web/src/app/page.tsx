"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTelegram } from "../lib/telegram/useTelegram";
import { fetchWithAuth } from "../lib/api/client";
import {
  Bell,
  Search,
  Plus,
  Brain,
  FileText,
  X,
  Check,
  Calendar,
  AlertCircle,
  ChevronRight,
  CheckSquare,
  Clock,
} from "lucide-react";

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

  const formatTasksCount = (count: number) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod100 >= 11 && mod100 <= 14) return `${count} Задач`;
    if (mod10 === 1) return `${count} Задача`;
    if (mod10 >= 2 && mod10 <= 4) return `${count} Задачи`;
    return `${count} Задач`;
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
          onClick={loadData}
          className="px-5 py-2.5 bg-[#007aff] hover:bg-[#007aff]/90 text-white font-medium rounded-2xl text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const filteredMemories =
    data?.recentMemories?.filter((m) =>
      searchQuery ? m.content?.toLowerCase().includes(searchQuery.toLowerCase()) : true
    ) || [];

  return (
    <main className="p-4 flex flex-col gap-2 min-h-screen bg-[#000000] text-white">
      {/* Header */}
      <header className="flex justify-between items-center pt-2 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1c1c1e] border border-white/5 flex items-center justify-center text-sm font-bold text-white">
            {user?.first_name ? user.first_name.charAt(0).toUpperCase() : "M"}
          </div>
          <div>
            <h1 className="text-base font-semibold text-white leading-tight">
              {user?.first_name || "Пользователь"}
            </h1>
            <p className="text-xs text-[#8e8e93]">MIND Personal OS</p>
          </div>
        </div>

        <button
          onClick={() => setIsNotificationsOpen(true)}
          className="bg-[#1c1c1e] text-[#8e8e93] hover:text-white rounded-full p-2.5 transition-colors relative active:scale-95"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {data?.upcomingDeadline && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#007aff] rounded-full"></span>
          )}
        </button>
      </header>

      {/* Hero Balance Section */}
      <section className="py-6 flex flex-col items-center justify-center text-center">
        <p className="text-[#8e8e93] text-sm font-medium mb-1">Активность и задачи</p>
        <h2 className="text-[38px] font-bold text-white tracking-tight leading-tight my-1">
          {formatTasksCount(data?.tasksCount || 0)}
        </h2>
        <div className="mt-2">
          {data?.upcomingDeadline ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#30d158] bg-[#30d158]/10 px-3 py-1 rounded-full font-medium">
              ↑ В фокусе: Есть дедлайн
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#30d158] bg-[#30d158]/10 px-3 py-1 rounded-full font-medium">
              ↑ В фокусе: Все спокойно
            </span>
          )}
        </div>
      </section>

      {/* Quick Action Buttons (4-column row) */}
      <div className="grid grid-cols-4 gap-2.5 my-3">
        <button
          onClick={() => setIsNewTaskOpen(true)}
          className="bg-[#1c1c1e] hover:bg-[#2c2c2e] active:scale-95 h-[68px] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all"
        >
          <div className="w-7 h-7 rounded-full bg-[#007aff]/15 text-[#007aff] flex items-center justify-center">
            <Plus size={16} strokeWidth={2.6} />
          </div>
          <span className="text-[11px] font-semibold text-[#007aff]">Новая задача</span>
        </button>

        <button
          onClick={() => setIsSearchOpen(true)}
          className="bg-[#1c1c1e] hover:bg-[#2c2c2e] active:scale-95 h-[68px] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all"
        >
          <div className="w-7 h-7 rounded-full bg-[#007aff]/15 text-[#007aff] flex items-center justify-center">
            <Search size={15} strokeWidth={2.4} />
          </div>
          <span className="text-[11px] font-semibold text-[#007aff]">Поиск</span>
        </button>

        <Link
          href="/memory"
          className="bg-[#1c1c1e] hover:bg-[#2c2c2e] active:scale-95 h-[68px] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all"
        >
          <div className="w-7 h-7 rounded-full bg-[#007aff]/15 text-[#007aff] flex items-center justify-center">
            <Brain size={16} strokeWidth={2.4} />
          </div>
          <span className="text-[11px] font-semibold text-[#007aff]">Память</span>
        </Link>

        <Link
          href="/artifacts"
          className="bg-[#1c1c1e] hover:bg-[#2c2c2e] active:scale-95 h-[68px] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all"
        >
          <div className="w-7 h-7 rounded-full bg-[#007aff]/15 text-[#007aff] flex items-center justify-center">
            <FileText size={15} strokeWidth={2.4} />
          </div>
          <span className="text-[11px] font-semibold text-[#007aff]">Файлы</span>
        </Link>
      </div>

      {/* Announcement Banner */}
      <div className="bg-gradient-to-r from-[#007aff] to-[#00b4d8] rounded-2xl p-4 text-white shadow-lg my-3">
        <h3 className="font-bold text-base">MIND AI OS</h3>
        <p className="text-xs opacity-90 mt-1 leading-relaxed">
          Голосовые заметки, генерация Word по ГОСТу и код в один клик
        </p>
        <div className="flex items-center gap-1.5 mt-3">
          <span className="w-4 h-1.5 rounded-full bg-white"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
        </div>
      </div>

      {/* Grouped Asset List: Tasks */}
      <section className="mt-2">
        <div className="flex justify-between items-center text-sm font-semibold text-white mb-2.5 px-1">
          <span>Задачи</span>
          <Link href="/tasks" className="text-[#007aff] text-xs font-semibold hover:opacity-80">
            Все &gt;
          </Link>
        </div>
        <div className="bg-[#1c1c1e] rounded-3xl divide-y divide-white/5 overflow-hidden mb-5">
          <Link
            href="/tasks"
            className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#007aff]/20 flex items-center justify-center text-[#007aff] shrink-0">
                <CheckSquare size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-white text-[15px] font-medium truncate">Активные задачи</p>
                <p className="text-xs text-[#8e8e93] mt-0.5">
                  {data?.tasksCount || 0} в списке
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-xs font-medium text-[#8e8e93] bg-white/5 px-2.5 py-1 rounded-full">
                {data?.tasksCount || 0}
              </span>
              <ChevronRight size={16} className="text-[#8e8e93]" />
            </div>
          </Link>

          {data?.upcomingDeadline && (
            <Link
              href="/tasks"
              className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#ff9500]/20 flex items-center justify-center text-[#ff9500] shrink-0">
                  <Clock size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-[15px] font-medium truncate">Ближайший дедлайн</p>
                  <p className="text-xs text-[#8e8e93] mt-0.5">
                    {new Date(data.upcomingDeadline).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="text-xs text-[#30d158] font-medium">В фокусе</span>
                <ChevronRight size={16} className="text-[#8e8e93]" />
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Grouped Asset List: Recent Memories */}
      <section>
        <div className="flex justify-between items-center text-sm font-semibold text-white mb-2.5 px-1">
          <span>Память</span>
          <Link href="/memory" className="text-[#007aff] text-xs font-semibold hover:opacity-80">
            Все &gt;
          </Link>
        </div>
        <div className="bg-[#1c1c1e] rounded-3xl divide-y divide-white/5 overflow-hidden mb-5">
          {data?.recentMemories && data.recentMemories.length > 0 ? (
            data.recentMemories.slice(0, 3).map((m: any, i: number) => (
              <Link
                key={i}
                href="/memory"
                className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#af52de]/20 flex items-center justify-center text-[#af52de] shrink-0">
                    <Brain size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-[15px] font-medium truncate">{m.content}</p>
                    <p className="text-xs text-[#8e8e93] mt-0.5">
                      {m.type ? m.type.toUpperCase() : "MEMORY"}{" "}
                      {m.createdAt ? `• ${new Date(m.createdAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <ChevronRight size={16} className="text-[#8e8e93]" />
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center text-[#8e8e93] py-6 px-4">
              <p className="text-sm">Нет сохраненных воспоминаний</p>
              <Link
                href="/memory"
                className="text-[#007aff] text-xs mt-2 inline-block font-semibold hover:underline"
              >
                + Добавить первое воспоминание
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Grouped Asset List: Artifacts */}
      <section>
        <div className="flex justify-between items-center text-sm font-semibold text-white mb-2.5 px-1">
          <span>Артефакты и документы</span>
          <Link href="/artifacts" className="text-[#007aff] text-xs font-semibold hover:opacity-80">
            Все &gt;
          </Link>
        </div>
        <div className="bg-[#1c1c1e] rounded-3xl divide-y divide-white/5 overflow-hidden mb-5">
          <Link
            href="/artifacts"
            className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#ff9500]/20 text-[#ff9500] flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-white text-[15px] font-medium truncate">Документы и отчеты</p>
                <p className="text-xs text-[#8e8e93] mt-0.5">Сгенерированные файлы DOCX, PDF, код</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <ChevronRight size={16} className="text-[#8e8e93]" />
            </div>
          </Link>
        </div>
      </section>

      {/* Modal: New Task */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[#1c1c1e] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Новая задача</h2>
              <button
                onClick={() => setIsNewTaskOpen(false)}
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
                  placeholder="Например, сдать курсовую или позвонить врачу"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-[#2c2c2e] text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#007aff] placeholder-[#8e8e93]"
                />
              </div>

              <div>
                <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Описание (необязательно)</label>
                <textarea
                  rows={2}
                  placeholder="Дополнительные детали..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full bg-[#2c2c2e] text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#007aff] placeholder-[#8e8e93] resize-none"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Дедлайн</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full bg-[#2c2c2e] text-white rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#007aff]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Приоритет</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
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
                  onClick={() => setIsNewTaskOpen(false)}
                  className="flex-1 py-3 bg-[#2c2c2e] hover:bg-[#38383a] text-white rounded-2xl text-sm font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={creatingTask || !taskTitle.trim()}
                  className="flex-1 py-3 bg-[#007aff] hover:bg-[#007aff]/90 text-white rounded-2xl text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {creatingTask ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Search */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-12 animate-in fade-in">
          <div className="bg-[#1c1c1e] w-full max-w-md rounded-3xl p-5 border border-white/10 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Поиск в MIND</h2>
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery("");
                }}
                className="text-[#8e8e93] hover:text-white p-1 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-3.5 text-[#8e8e93]" />
              <input
                type="text"
                autoFocus
                placeholder="Поиск воспоминаний или задач..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#2c2c2e] text-white rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#007aff] placeholder-[#8e8e93]"
              />
            </div>

            <div className="max-h-60 overflow-y-auto flex flex-col gap-2">
              {filteredMemories.length > 0 ? (
                filteredMemories.map((m: any, i: number) => (
                  <div key={i} className="p-3.5 bg-[#2c2c2e] rounded-2xl text-sm text-white">
                    <span className="text-[10px] text-[#007aff] uppercase font-bold mr-2">
                      {m.type}
                    </span>
                    {m.content}
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-[#8e8e93] py-4">Нет совпадений</p>
              )}
            </div>

            <div className="flex gap-2.5 pt-1">
              <Link
                href="/tasks"
                onClick={() => setIsSearchOpen(false)}
                className="flex-1 py-2.5 bg-[#2c2c2e] hover:bg-[#38383a] text-center text-xs text-[#007aff] font-semibold rounded-2xl transition-colors"
              >
                Перейти в Задачи &rarr;
              </Link>
              <Link
                href="/memory"
                onClick={() => setIsSearchOpen(false)}
                className="flex-1 py-2.5 bg-[#2c2c2e] hover:bg-[#38383a] text-center text-xs text-[#007aff] font-semibold rounded-2xl transition-colors"
              >
                Перейти в Память &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Notifications */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-16 animate-in fade-in">
          <div className="bg-[#1c1c1e] w-full max-w-md rounded-3xl p-5 border border-white/10 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell size={20} className="text-[#007aff]" /> Уведомления
              </h2>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="text-[#8e8e93] hover:text-white p-1 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {data?.upcomingDeadline ? (
                <div className="p-3.5 bg-[#007aff]/15 border border-[#007aff]/30 rounded-2xl flex items-start gap-3">
                  <Calendar size={20} className="text-[#007aff] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white">Приближается дедлайн</p>
                    <p className="text-xs text-[#8e8e93] mt-0.5">
                      Срок выполнения: {new Date(data.upcomingDeadline).toLocaleDateString()}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-[#2c2c2e] rounded-2xl flex items-center gap-3">
                  <Check size={18} className="text-[#30d158] shrink-0" />
                  <p className="text-xs text-[#8e8e93]">Срочных дедлайнов нет.</p>
                </div>
              )}

              <div className="p-3.5 bg-[#2c2c2e] rounded-2xl flex items-center gap-3">
                <AlertCircle size={18} className="text-[#007aff] shrink-0" />
                <p className="text-xs text-white">
                  Активных задач в работе:{" "}
                  <strong className="text-[#007aff]">{data?.tasksCount || 0}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsNotificationsOpen(false)}
              className="w-full py-2.5 bg-[#2c2c2e] hover:bg-[#38383a] text-xs text-white rounded-2xl font-semibold mt-1 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

