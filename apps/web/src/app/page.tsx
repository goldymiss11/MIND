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
  Check,
  Calendar,
  AlertCircle,
  CheckSquare,
  Clock,
  Sparkles,
  Heart,
  Briefcase,
  GraduationCap,
  Code2,
  FileSpreadsheet,
  Presentation,
} from "lucide-react";
import { CardGroup } from "../components/ui/CardGroup";
import { RowItem } from "../components/ui/RowItem";
import { SectionHeader } from "../components/ui/SectionHeader";
import { ModalSheet } from "../components/ui/ModalSheet";
import { HomeSkeleton } from "../components/ui/LoadingSkeleton";

interface HomeData {
  tasksCount: number;
  upcomingDeadline: string | null;
  recentMemories: any[];
  recentArtifacts: any[];
}

const getMemoryBadge = (type?: string) => {
  const t = (type || "").toLowerCase();
  if (t === "preference") return { icon: <Heart size={20} />, bg: "bg-rose-500/15", text: "text-rose-400" };
  if (t === "project") return { icon: <Briefcase size={20} />, bg: "bg-[#007aff]/15", text: "text-[#007aff]" };
  if (t === "educational" || t === "education") return { icon: <GraduationCap size={20} />, bg: "bg-[#30d158]/15", text: "text-[#30d158]" };
  if (t === "professional") return { icon: <Code2 size={20} />, bg: "bg-[#ff9500]/15", text: "text-[#ff9500]" };
  return { icon: <Brain size={20} />, bg: "bg-[#af52de]/15", text: "text-[#af52de]" };
};

const getArtifactBadge = (type?: string) => {
  const t = (type || "").toLowerCase();
  if (t === "docx" || t === "doc") return { icon: <FileText size={20} />, bg: "bg-[#007aff]/15", text: "text-[#007aff]" };
  if (t === "xlsx" || t === "csv") return { icon: <FileSpreadsheet size={20} />, bg: "bg-[#30d158]/15", text: "text-[#30d158]" };
  if (t === "pptx" || t === "ppt") return { icon: <Presentation size={20} />, bg: "bg-[#ff9500]/15", text: "text-[#ff9500]" };
  if (t === "code" || t === "ts" || t === "js" || t === "py") return { icon: <Code2 size={20} />, bg: "bg-[#af52de]/15", text: "text-[#af52de]" };
  return { icon: <FileText size={20} />, bg: "bg-rose-500/15", text: "text-rose-400" };
};


export default function HomePage() {
  const { user, initData, isReady, haptic } = useTelegram();
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
    if (isReady) {
      loadData();
    }
  }, [isReady, initData]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (initData) {
        const result = await fetchWithAuth("/api/miniapp/home", initData);
        setData(result?.data ?? result);
      } else {
        // Fallback preview data for inspection and development
        setData({
          tasksCount: 3,
          upcomingDeadline: new Date(Date.now() + 86400000 * 2).toISOString(),
          recentMemories: [
            { id: "1", type: "preference", content: "Любит краткие сводки без шаблонных вступительных фраз", createdAt: new Date().toISOString() },
            { id: "2", type: "project", content: "MIND: Личная ИИ операционная система в Telegram", createdAt: new Date(Date.now() - 86400000).toISOString() },
            { id: "3", type: "education", content: "Дискретная математика: алгоритмы на графах и автоматы", createdAt: new Date(Date.now() - 172800000).toISOString() },
          ],
          recentArtifacts: [
            { id: "1", name: "Отчет_по_проекту_MIND.docx", type: "docx", createdAt: new Date().toISOString() },
          ],
        });
      }
    } catch (err: any) {
      if (!initData) {
        setData({
          tasksCount: 3,
          upcomingDeadline: new Date(Date.now() + 86400000 * 2).toISOString(),
          recentMemories: [
            { id: "1", type: "preference", content: "Любит краткие сводки без шаблонных вступительных фраз", createdAt: new Date().toISOString() },
            { id: "2", type: "project", content: "MIND: Личная ИИ операционная система в Telegram", createdAt: new Date(Date.now() - 86400000).toISOString() },
            { id: "3", type: "education", content: "Дискретная математика: алгоритмы на графах и автоматы", createdAt: new Date(Date.now() - 172800000).toISOString() },
          ],
          recentArtifacts: [
            { id: "1", name: "Отчет_по_проекту_MIND.docx", type: "docx", createdAt: new Date().toISOString() },
          ],
        });
      } else {
        setError(err.message || "Failed to load data");
      }
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

      haptic.notification("success");
      setTaskTitle("");
      setTaskDesc("");
      setTaskDeadline("");
      setIsNewTaskOpen(false);
      await loadData();
    } catch (err: any) {
      haptic.notification("error");
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
    return <HomeSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#000000]">
        <div className="w-14 h-14 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center mb-3">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Не удалось загрузить данные</h2>
        <p className="text-[#8e8e93] mb-5 text-sm max-w-xs">{error}</p>
        <button
          onClick={loadData}
          className="px-6 py-3 bg-[#007aff] hover:bg-[#1a8aff] active:scale-95 text-white font-semibold rounded-[18px] text-sm transition-all shadow-[0_4px_16px_rgba(0,122,255,0.3)]"
        >
          Повторить
        </button>
      </div>
    );
  }

  const filteredMemories =
    data?.recentMemories?.filter((m) =>
      searchQuery ? m.content?.toLowerCase().includes(searchQuery.toLowerCase()) : true
    ) || [];

  return (
    <main className="p-4 pb-32 flex flex-col gap-3.5 min-h-screen bg-[#000000] text-white">
      {/* Top Header (Telegram Wallet style) */}
      <header className="flex justify-between items-center pt-2 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#007aff] to-[#30d158] p-[1.5px] shadow-sm shrink-0">
            <div className="w-full h-full rounded-full bg-[#16171b] flex items-center justify-center text-sm font-bold text-white">
              {user?.first_name ? user.first_name.charAt(0).toUpperCase() : "А"}
            </div>
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-white leading-tight tracking-tight">
              {user?.first_name || "Александр"}
            </h1>
            <p className="text-[12px] text-[#8e8e93] leading-tight">MIND Personal OS</p>
          </div>
        </div>

        <button
          onClick={() => {
            haptic.impact("light");
            setIsNotificationsOpen(true);
          }}
          className="w-10 h-10 rounded-full bg-[#16171b] border border-white/[0.08] text-[#8e8e93] hover:text-white flex items-center justify-center transition-all relative touch-scale"
          aria-label="Уведомления"
        >
          <Bell size={19} />
          {data?.upcomingDeadline && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#ff9500] rounded-full ring-2 ring-[#16171b]" />
          )}
        </button>
      </header>

      {/* Ask MIND Interactive Action Bar */}
      <div
        onClick={() => {
          haptic.impact("light");
          setIsSearchOpen(true);
        }}
        className="cursor-pointer bg-[#16171b] hover:bg-[#1c1d22] border border-white/[0.07] hover:border-white/[0.14] rounded-[20px] px-3.5 py-2.5 flex items-center justify-between transition-all touch-subtle shadow-sm my-0.5 group"
      >
        <div className="flex items-center gap-2.5 text-[#8e8e93] group-hover:text-white transition-colors">
          <div className="w-7 h-7 rounded-xl bg-[#007aff]/15 text-[#007aff] flex items-center justify-center">
            <Sparkles size={15} />
          </div>
          <span className="text-[13px] font-medium">Спросить MIND или найти...</span>
        </div>
        <kbd className="text-[11px] font-medium text-[#8e8e93] bg-white/[0.06] border border-white/[0.08] px-2.5 py-0.5 rounded-lg">
          Поиск
        </kbd>
      </div>

      {/* Hero Focus Section (Wallet balance display style) */}
      <section className="py-4 flex flex-col items-center justify-center text-center">
        <p className="text-[#8e8e93] text-[13px] font-medium tracking-normal mb-1">
          Активность и задачи
        </p>
        <h2 className="text-[42px] font-extrabold text-white tracking-tight leading-none my-1">
          {formatTasksCount(data?.tasksCount || 0)}
        </h2>
        <div className="mt-2">
          {data?.upcomingDeadline ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#ff9500] bg-[#ff9500]/12 border border-[#ff9500]/25 px-3.5 py-1 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff9500] animate-pulse" />
              В фокусе: Есть дедлайн
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#30d158] bg-[#30d158]/12 border border-[#30d158]/25 px-3.5 py-1 rounded-full font-semibold">
              <Check size={13} strokeWidth={2.5} />
              В фокусе: Все спокойно
            </span>
          )}
        </div>
      </section>

      {/* Quick Action Buttons (Telegram Wallet circular 4-button style) */}
      <div className="grid grid-cols-4 gap-2 my-2">
        <button
          onClick={() => {
            haptic.impact("medium");
            setIsNewTaskOpen(true);
          }}
          className="flex flex-col items-center justify-center group select-none touch-scale"
        >
          <div className="w-[54px] h-[54px] rounded-full bg-[#007aff] text-white flex items-center justify-center shadow-[0_4px_20px_rgba(0,122,255,0.35)] group-hover:bg-[#1a8aff] transition-all">
            <Plus size={24} strokeWidth={2.6} />
          </div>
          <span className="text-[11px] font-medium text-white/90 tracking-tight mt-1.5">
            Задача
          </span>
        </button>

        <button
          onClick={() => {
            haptic.impact("light");
            setIsSearchOpen(true);
          }}
          className="flex flex-col items-center justify-center group select-none touch-scale"
        >
          <div className="w-[54px] h-[54px] rounded-full bg-[#16171b] text-[#007aff] border border-white/[0.08] flex items-center justify-center shadow-sm group-hover:bg-[#1c1d22] transition-all">
            <Search size={22} strokeWidth={2.2} />
          </div>
          <span className="text-[11px] font-medium text-white/90 tracking-tight mt-1.5">
            Поиск
          </span>
        </button>

        <Link
          href="/memory"
          onClick={() => haptic.selection()}
          className="flex flex-col items-center justify-center group select-none touch-scale"
        >
          <div className="w-[54px] h-[54px] rounded-full bg-[#16171b] text-[#007aff] border border-white/[0.08] flex items-center justify-center shadow-sm group-hover:bg-[#1c1d22] transition-all">
            <Brain size={22} strokeWidth={2.2} />
          </div>
          <span className="text-[11px] font-medium text-white/90 tracking-tight mt-1.5">
            Память
          </span>
        </Link>

        <Link
          href="/artifacts"
          onClick={() => haptic.selection()}
          className="flex flex-col items-center justify-center group select-none touch-scale"
        >
          <div className="w-[54px] h-[54px] rounded-full bg-[#16171b] text-[#007aff] border border-white/[0.08] flex items-center justify-center shadow-sm group-hover:bg-[#1c1d22] transition-all">
            <FileText size={22} strokeWidth={2.2} />
          </div>
          <span className="text-[11px] font-medium text-white/90 tracking-tight mt-1.5">
            Файлы
          </span>
        </Link>
      </div>

      {/* Proactive AI Engine Card (Telegram Wallet dark surface style) */}
      <div className="bg-[#16171b] border border-white/[0.07] rounded-[24px] p-4 flex items-center justify-between gap-3.5 my-1 shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-full bg-[#007aff]/15 text-[#007aff] flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[15px] text-white tracking-tight">MIND AI OS</h3>
              <span className="text-[10px] font-bold text-[#30d158] bg-[#30d158]/15 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <p className="text-[13px] text-[#8e8e93] mt-0.5 leading-snug">
              Голосовые заметки, генерация Word по ГОСТу и автоматические действия
            </p>
          </div>
        </div>
      </div>

      {/* Grouped Section: Tasks */}
      <section className="mt-1">
        <SectionHeader title="Задачи" actionHref="/tasks" />
        <CardGroup>
          <Link href="/tasks" onClick={() => haptic.selection()} className="block">
            <RowItem
              icon={<CheckSquare size={20} />}
              iconBg="bg-[#007aff]/15"
              iconColor="text-[#007aff]"
              title="Активные задачи"
              subtitle={`${data?.tasksCount || 0} в списке`}
              right={
                <span className="text-xs font-semibold text-[#8e8e93] bg-white/[0.06] px-2.5 py-1 rounded-full">
                  {data?.tasksCount || 0}
                </span>
              }
              showChevron
            />
          </Link>

          {data?.upcomingDeadline && (
            <Link href="/tasks" onClick={() => haptic.selection()} className="block">
              <RowItem
                icon={<Clock size={20} />}
                iconBg="bg-[#ff9500]/15"
                iconColor="text-[#ff9500]"
                title="Ближайший дедлайн"
                subtitle={new Date(data.upcomingDeadline).toLocaleDateString()}
                right={
                  <span className="text-xs text-[#ff9500] font-semibold">В фокусе</span>
                }
                showChevron
              />
            </Link>
          )}
        </CardGroup>
      </section>

      {/* Grouped Section: Recent Memories */}
      <section className="mt-1">
        <SectionHeader title="Память" actionHref="/memory" />
        <CardGroup>
          {data?.recentMemories && data.recentMemories.length > 0 ? (
            data.recentMemories.slice(0, 3).map((m: any, i: number) => {
              const badge = getMemoryBadge(m.type);
              return (
                <Link key={m.id || i} href="/memory" onClick={() => haptic.selection()} className="block">
                  <RowItem
                    icon={badge.icon}
                    iconBg={badge.bg}
                    iconColor={badge.text}
                    title={m.content}
                    subtitle={`${m.type ? m.type.toUpperCase() : "MEMORY"}${
                      m.createdAt ? ` • ${new Date(m.createdAt).toLocaleDateString()}` : ""
                    }`}
                    showChevron
                  />
                </Link>
              );
            })
          ) : (
            <div className="text-center text-[#8e8e93] py-6 px-4">
              <p className="text-sm">Нет сохраненных воспоминаний</p>
              <Link
                href="/memory"
                onClick={() => haptic.selection()}
                className="text-[#007aff] text-xs mt-2 inline-block font-semibold hover:underline"
              >
                + Добавить первое воспоминание
              </Link>
            </div>
          )}
        </CardGroup>
      </section>

      {/* Grouped Section: Artifacts */}
      <section className="mt-1">
        <SectionHeader title="Артефакты и документы" actionHref="/artifacts" />
        <CardGroup>
          {data?.recentArtifacts && data.recentArtifacts.length > 0 ? (
            data.recentArtifacts.slice(0, 3).map((art: any, i: number) => {
              const badge = getArtifactBadge(art.type);
              return (
                <Link key={art.id || i} href="/artifacts" onClick={() => haptic.selection()} className="block">
                  <RowItem
                    icon={badge.icon}
                    iconBg={badge.bg}
                    iconColor={badge.text}
                    title={art.name}
                    subtitle={`${(art.type || "DOC").toUpperCase()}${
                      art.createdAt ? ` • ${new Date(art.createdAt).toLocaleDateString()}` : ""
                    }`}
                    showChevron
                  />
                </Link>
              );
            })
          ) : (
            <Link href="/artifacts" onClick={() => haptic.selection()} className="block">
              <RowItem
                icon={<FileText size={20} />}
                iconBg="bg-[#007aff]/15"
                iconColor="text-[#007aff]"
                title="Документы и отчеты"
                subtitle="Сгенерированные файлы DOCX, PDF, код"
                showChevron
              />
            </Link>
          )}
        </CardGroup>
      </section>


      {/* Modal: New Task */}
      <ModalSheet
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        title="Новая задача"
        subtitle="Добавьте задачу в личный список MIND"
      >
        <form onSubmit={handleCreateTask} className="flex flex-col gap-3.5">
          <div>
            <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Название *</label>
            <input
              type="text"
              required
              placeholder="Например, сдать курсовую или позвонить врачу"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full bg-[#202127] text-white rounded-[18px] px-4 py-3 text-sm border border-white/[0.07] focus:outline-none focus:border-[#007aff] placeholder-[#707579] transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">
              Описание (необязательно)
            </label>
            <textarea
              rows={2}
              placeholder="Дополнительные детали..."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="w-full bg-[#202127] text-white rounded-[18px] px-4 py-3 text-sm border border-white/[0.07] focus:outline-none focus:border-[#007aff] placeholder-[#707579] resize-none transition-all"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Дедлайн</label>
              <input
                type="date"
                value={taskDeadline}
                onChange={(e) => setTaskDeadline(e.target.value)}
                className="w-full bg-[#202127] text-white rounded-[18px] px-3.5 py-2.5 text-sm border border-white/[0.07] focus:outline-none focus:border-[#007aff]"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-[#8e8e93] mb-1.5 block font-medium">Приоритет</label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as any)}
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
              onClick={() => setIsNewTaskOpen(false)}
              className="flex-1 py-3.5 bg-[#202127] hover:bg-[#26272e] active:scale-[0.98] text-white rounded-[18px] text-sm font-medium transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={creatingTask || !taskTitle.trim()}
              className="flex-1 py-3.5 bg-[#007aff] hover:bg-[#1a8aff] active:scale-[0.98] text-white rounded-[18px] text-sm font-semibold disabled:opacity-50 transition-all shadow-[0_4px_16px_rgba(0,122,255,0.3)]"
            >
              {creatingTask ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </ModalSheet>

      {/* Modal: Search */}
      <ModalSheet
        isOpen={isSearchOpen}
        onClose={() => {
          setIsSearchOpen(false);
          setSearchQuery("");
        }}
        title="Поиск в MIND"
        subtitle="Ищите по сохраненным воспоминаниям и заметкам"
      >
        <div className="flex flex-col gap-3.5">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-3.5 text-[#8e8e93]" />
            <input
              type="text"
              autoFocus
              placeholder="Поиск воспоминаний..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#202127] text-white rounded-[18px] pl-10 pr-4 py-3 text-sm border border-white/[0.07] focus:outline-none focus:border-[#007aff] placeholder-[#707579]"
            />
          </div>

          <div className="max-h-60 overflow-y-auto flex flex-col gap-2">
            {filteredMemories.length > 0 ? (
              filteredMemories.map((m: any, i: number) => (
                <div
                  key={m.id || i}
                  className="p-3.5 bg-[#202127] border border-white/[0.06] rounded-[18px] text-sm text-white"
                >
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
              onClick={() => {
                haptic.selection();
                setIsSearchOpen(false);
              }}
              className="flex-1 py-3 bg-[#202127] hover:bg-[#26272e] text-center text-xs text-[#007aff] font-semibold rounded-[18px] transition-colors"
            >
              Перейти в Задачи &rarr;
            </Link>
            <Link
              href="/memory"
              onClick={() => {
                haptic.selection();
                setIsSearchOpen(false);
              }}
              className="flex-1 py-3 bg-[#202127] hover:bg-[#26272e] text-center text-xs text-[#007aff] font-semibold rounded-[18px] transition-colors"
            >
              Перейти в Память &rarr;
            </Link>
          </div>
        </div>
      </ModalSheet>

      {/* Modal: Notifications */}
      <ModalSheet
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        title="Уведомления"
        subtitle="События и активные напоминания"
      >
        <div className="flex flex-col gap-3">
          {data?.upcomingDeadline ? (
            <div className="p-4 bg-[#007aff]/12 border border-[#007aff]/30 rounded-[20px] flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-full bg-[#007aff]/20 text-[#007aff] flex items-center justify-center shrink-0">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Приближается дедлайн</p>
                <p className="text-xs text-[#8e8e93] mt-0.5">
                  Срок выполнения: {new Date(data.upcomingDeadline).toLocaleDateString()}.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#202127] border border-white/[0.06] rounded-[20px] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#30d158]/15 text-[#30d158] flex items-center justify-center shrink-0">
                <Check size={16} strokeWidth={2.5} />
              </div>
              <p className="text-xs text-[#8e8e93]">Срочных дедлайнов нет.</p>
            </div>
          )}

          <div className="p-4 bg-[#202127] border border-white/[0.06] rounded-[20px] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#007aff]/15 text-[#007aff] flex items-center justify-center shrink-0">
              <AlertCircle size={16} />
            </div>
            <p className="text-xs text-white">
              Активных задач в работе:{" "}
              <strong className="text-[#007aff]">{data?.tasksCount || 0}</strong>
            </p>
          </div>

          <button
            onClick={() => setIsNotificationsOpen(false)}
            className="w-full py-3.5 bg-[#202127] hover:bg-[#26272e] text-xs text-white rounded-[18px] font-semibold mt-1 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </ModalSheet>
    </main>
  );
}
