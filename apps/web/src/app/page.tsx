"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Brain,
  CheckCircle2,
  FolderClosed,
  MessageCircle,
  Plus,
  Repeat,
  Search,
  Sparkles,
} from "lucide-react";
import { useApi, useResource } from "../lib/useApi";
import { readStored, writeStored } from "../lib/storage";
import { formatDeadline, pluralize, recurrenceLabel } from "../lib/format";
import { memoryCategory } from "../lib/categories";
import { previewHome } from "../lib/preview";
import { CardGroup } from "../components/ui/CardGroup";
import { RowItem } from "../components/ui/RowItem";
import { IconCircle } from "../components/ui/IconCircle";
import { SectionHeader } from "../components/ui/SectionHeader";
import { HomeSkeleton } from "../components/ui/LoadingSkeleton";
import { ErrorState, OutsideTelegram } from "../components/ui/States";
import { NewTaskSheet } from "../components/forms/TaskSheet";
import { NewMemorySheet } from "../components/forms/MemorySheet";
import { SearchSheet } from "../components/SearchSheet";
import { Onboarding } from "../components/Onboarding";
import { PromoCarousel } from "../components/PromoCarousel";

type Sheet = "task" | "memory" | "search" | "onboarding" | null;

export default function HomePage() {
  const { user, haptic, close } = useApi();
  const { data, error, loading, reload, isOutsideTelegram } = useResource("/home", previewHome);
  const [sheet, setSheet] = useState<Sheet>(null);

  useEffect(() => {
    if (readStored("onboarded") !== "1") {
      writeStored("onboarded", "1");
      setSheet("onboarding");
    }
  }, []);

  if (isOutsideTelegram) return <OutsideTelegram />;
  if (loading && !data) return <HomeSkeleton />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={reload} />;

  const open = (next: Sheet) => {
    haptic.impact("light");
    setSheet(next);
  };

  const actions = [
    { label: "Задача", icon: Plus, onClick: () => open("task") },
    { label: "Запомнить", icon: Sparkles, onClick: () => open("memory") },
    { label: "Поиск", icon: Search, onClick: () => open("search") },
    {
      label: "В чат",
      icon: MessageCircle,
      onClick: () => {
        haptic.impact("light");
        close();
      },
    },
  ];

  return (
    <main className="screen">
      <header className="flex items-center justify-between">
        <Link href="/settings" aria-label="Настройки" className="pressable" onClick={() => haptic.selection()}>
          {user?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photo_url} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-[17px] font-bold">
              {user?.first_name?.charAt(0).toUpperCase() ?? "?"}
            </span>
          )}
        </Link>
        <Link
          href="/tasks"
          aria-label="Ближайшие напоминания"
          onClick={() => haptic.selection()}
          className="pressable relative flex h-11 w-11 items-center justify-center rounded-full bg-card"
        >
          <Bell size={22} strokeWidth={2} />
          {data.upcomingTasks.length > 0 && (
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent" />
          )}
        </Link>
      </header>

      <section className="flex flex-col items-center pb-7 pt-3 text-center">
        <p className="text-[17px] font-semibold">Активные задачи</p>
        <p className="mt-1 text-[76px] font-extrabold leading-[84px] tracking-tight tabular-nums">
          {data.tasksCount}
        </p>
        <p className="mt-1 flex items-center gap-2 text-[15px] font-semibold">
          {data.completedThisWeek > 0 ? (
            <>
              <span className="text-good">+{data.completedThisWeek}</span>
              <span className="rounded-full bg-good/15 px-2.5 py-0.5 text-good">
                {pluralize(data.completedThisWeek, "выполнена", "выполнено", "выполнено")}
              </span>
              <span className="text-hint">за неделю</span>
            </>
          ) : (
            <span className="text-hint">На этой неделе пока ничего не закрыто</span>
          )}
        </p>
      </section>

      <div className="grid grid-cols-4 gap-2.5">
        {actions.map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="pressable flex h-[84px] flex-col items-center justify-center gap-1.5 rounded-[20px] bg-card text-accent"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white">
              <Icon size={19} strokeWidth={2.6} />
            </span>
            <span className="text-[13px] font-semibold leading-none">{label}</span>
          </button>
        ))}
      </div>

      <PromoCarousel onMore={() => open("onboarding")} />

      {data.upcomingTasks.length > 0 && (
        <>
          <SectionHeader title="Скоро" actionHref="/tasks" />
          <CardGroup>
            {data.upcomingTasks.map((task: any) => (
              <Link key={task.id} href="/tasks" onClick={() => haptic.selection()} className="block">
                <RowItem
                  onClick={() => {}}
                  icon={<IconCircle icon={task.recurrence ? Repeat : CheckCircle2} color="bg-accent" />}
                  title={task.title}
                  subtitle={recurrenceLabel(task.recurrence) ?? formatDeadline(task.deadline)}
                />
              </Link>
            ))}
          </CardGroup>
        </>
      )}

      {data.recentMemories.length > 0 && (
        <>
          <SectionHeader title="Память" aside={`Всего: ${data.memoriesCount}`} />
          <CardGroup>
            {data.recentMemories.slice(0, 3).map((memory: any) => {
              const category = memoryCategory(memory.type);
              return (
                <Link key={memory.id} href="/memory" onClick={() => haptic.selection()} className="block">
                  <RowItem
                    onClick={() => {}}
                    icon={<IconCircle icon={category.icon} color={category.solid} />}
                    title={memory.content}
                    subtitle={category.label}
                  />
                </Link>
              );
            })}
          </CardGroup>
        </>
      )}

      <div className="mt-2 flex flex-col gap-3">
        <Link href="/memory" onClick={() => haptic.selection()} className="group-card block">
          <RowItem
            onClick={() => {}}
            icon={<IconCircle icon={Brain} color="bg-purple" />}
            title="Что я о вас знаю"
            subtitle={`${data.memoriesCount} ${pluralize(data.memoriesCount, "запись", "записи", "записей")}`}
            showChevron
          />
        </Link>
        <Link href="/artifacts" onClick={() => haptic.selection()} className="group-card block">
          <RowItem
            onClick={() => {}}
            icon={<IconCircle icon={FolderClosed} color="bg-accent" />}
            title="Мои файлы"
            subtitle={`${data.artifactsCount} ${pluralize(data.artifactsCount, "файл", "файла", "файлов")}`}
            showChevron
          />
        </Link>
      </div>

      <NewTaskSheet isOpen={sheet === "task"} onClose={() => setSheet(null)} onCreated={() => void reload()} />
      <NewMemorySheet isOpen={sheet === "memory"} onClose={() => setSheet(null)} onCreated={() => void reload()} />
      <SearchSheet isOpen={sheet === "search"} onClose={() => setSheet(null)} />
      <Onboarding isOpen={sheet === "onboarding"} onClose={() => setSheet(null)} />
    </main>
  );
}
