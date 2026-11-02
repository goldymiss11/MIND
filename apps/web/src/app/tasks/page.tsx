"use client";

import { useState } from "react";
import { AlertTriangle, Check, Circle, CheckCircle2, Plus, Repeat, RotateCcw, Trash2 } from "lucide-react";
import { useApi, useResource } from "../../lib/useApi";
import { daysFromToday, formatDeadline, pluralize, recurrenceLabel } from "../../lib/format";
import { previewTasks } from "../../lib/preview";
import { CardGroup } from "../../components/ui/CardGroup";
import { ModalSheet } from "../../components/ui/ModalSheet";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Segmented } from "../../components/ui/Segmented";
import { SwipeRow } from "../../components/ui/SwipeRow";
import { ListSkeleton } from "../../components/ui/LoadingSkeleton";
import { EmptyState, ErrorState, OutsideTelegram, ScreenHero } from "../../components/ui/States";
import { NewTaskSheet } from "../../components/forms/TaskSheet";

type Tab = "active" | "done";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "active", label: "Активные" },
  { id: "done", label: "Завершённые" },
];

function groupActive(tasks: any[], now: Date) {
  const groups: Array<{ title: string; tasks: any[] }> = [
    { title: "Просрочено", tasks: [] },
    { title: "Сегодня", tasks: [] },
    { title: "Скоро", tasks: [] },
    { title: "Без срока", tasks: [] },
  ];
  for (const task of tasks) {
    const deadline = task.deadline ? new Date(task.deadline) : null;
    if (!deadline) groups[3]!.tasks.push(task);
    else if (deadline.getTime() < now.getTime()) groups[0]!.tasks.push(task);
    else if (daysFromToday(deadline, now) === 0) groups[1]!.tasks.push(task);
    else groups[2]!.tasks.push(task);
  }
  for (const group of groups) {
    group.tasks.sort((a, b) => new Date(a.deadline ?? 0).getTime() - new Date(b.deadline ?? 0).getTime());
  }
  return groups.filter((group) => group.tasks.length > 0);
}

export default function TasksPage() {
  const { request, haptic, confirm, showAlert } = useApi();
  const { data, setData, error, loading, reload, isOutsideTelegram } = useResource<any[]>("/tasks", previewTasks);
  const [tab, setTab] = useState<Tab>("active");
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  if (isOutsideTelegram) return <OutsideTelegram />;
  if (loading && !data) return <ListSkeleton />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={reload} />;

  const tasks = data;
  const now = new Date();

  const setStatus = async (task: any, status: string) => {
    haptic.impact(status === "completed" ? "medium" : "light");
    setSelected(null);
    setData(tasks.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      await request(`/tasks/${task.id}`, "PATCH", { status });
    } catch (err: any) {
      setData(tasks);
      await showAlert(err.message || "Не удалось обновить задачу");
    }
  };

  const remove = async (task: any) => {
    if (!(await confirm(`Удалить задачу «${task.title}»?`))) return;
    haptic.impact("heavy");
    setSelected(null);
    setData(tasks.filter((t) => t.id !== task.id));
    try {
      await request(`/tasks/${task.id}`, "DELETE");
    } catch (err: any) {
      setData(tasks);
      await showAlert(err.message || "Не удалось удалить задачу");
    }
  };

  const active = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const done = tasks.filter((t) => t.status === "completed");

  const renderRow = (task: any) => {
    const isDone = task.status === "completed";
    const isOverdue = !isDone && task.deadline && new Date(task.deadline).getTime() < now.getTime();
    const repeat = recurrenceLabel(task.recurrence);

    return (
      <SwipeRow
        key={task.id}
        left={
          isDone
            ? { icon: <RotateCcw size={20} />, label: "Вернуть", color: "bg-accent", onTrigger: () => setStatus(task, "in_progress") }
            : { icon: <Check size={20} />, label: "Готово", color: "bg-good", onTrigger: () => setStatus(task, "completed") }
        }
        right={{ icon: <Trash2 size={20} />, label: "Удалить", color: "bg-bad", onTrigger: () => remove(task) }}
      >
        <div className="row-press flex min-h-[64px] items-center gap-3.5 bg-card px-4 py-2.5" onClick={() => setSelected(task)}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              void setStatus(task, isDone ? "in_progress" : "completed");
            }}
            aria-label={isDone ? "Вернуть в работу" : "Отметить выполненной"}
            className="-m-2 shrink-0 p-2 active:scale-90"
          >
            {isDone ? (
              <CheckCircle2 size={28} className="text-good" strokeWidth={2} />
            ) : (
              <Circle size={28} className="text-hint/70" strokeWidth={1.8} />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className={`text-[17px] font-semibold leading-[22px] ${isDone ? "text-hint line-through" : ""}`}>{task.title}</p>
            {(task.deadline || repeat) && !isDone && (
              <p className={`mt-0.5 flex items-center gap-1 text-[15px] leading-5 ${isOverdue ? "text-bad" : "text-hint"}`}>
                {repeat && <Repeat size={14} className="shrink-0" />}
                <span className="truncate">{task.deadline ? formatDeadline(task.deadline, now) : repeat}</span>
              </p>
            )}
          </div>
          {task.priority === "high" && !isDone && <AlertTriangle size={18} className="shrink-0 text-warn" />}
        </div>
      </SwipeRow>
    );
  };

  return (
    <main className="screen">
      <ScreenHero emoji="✅" title="Задачи">
        <span className="text-hint">
          {active.length === 0
            ? "Всё сделано. Можно выдохнуть."
            : `${active.length} ${pluralize(active.length, "активная", "активные", "активных")}. Смахните вправо, когда сделаете.`}
        </span>
      </ScreenHero>

      <div className="flex items-center justify-between gap-2">
        <Segmented options={TABS} value={tab} onChange={setTab} />
        <button
          onClick={() => {
            haptic.impact("light");
            setIsNewOpen(true);
          }}
          aria-label="Новая задача"
          className="pressable flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-accent text-white"
        >
          <Plus size={22} strokeWidth={2.6} />
        </button>
      </div>

      {tab === "active" &&
        (active.length > 0 ? (
          groupActive(active, now).map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <SectionHeader title={group.title} aside={group.tasks.length} />
              <CardGroup className="[--separator-inset:58px]">{group.tasks.map(renderRow)}</CardGroup>
            </div>
          ))
        ) : (
          <EmptyState emoji="🎉" title="Активных задач нет" hint="Напишите боту «напомни завтра в 10 позвонить врачу»" />
        ))}

      {tab === "done" &&
        (done.length > 0 ? (
          <CardGroup className="[--separator-inset:58px]">{done.map(renderRow)}</CardGroup>
        ) : (
          <EmptyState emoji="🗂️" title="Здесь будут выполненные задачи" />
        ))}

      <NewTaskSheet isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} onCreated={(task) => setData([task, ...tasks])} />

      <ModalSheet
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title}
        subtitle={selected?.deadline ? formatDeadline(selected.deadline, now) : undefined}
      >
        {selected && (
          <div className="flex flex-col gap-3">
            {selected.description && <p className="text-[17px] leading-[23px]">{selected.description}</p>}
            {selected.recurrence && (
              <p className="flex items-center gap-2 text-[15px] text-hint">
                <Repeat size={16} /> Повторяется {recurrenceLabel(selected.recurrence)}
              </p>
            )}
            <button
              onClick={() => setStatus(selected, selected.status === "completed" ? "in_progress" : "completed")}
              className="btn-primary mt-2"
            >
              {selected.status === "completed" ? "Вернуть в работу" : "Выполнено"}
            </button>
            <button onClick={() => remove(selected)} className="btn-secondary !text-bad">
              Удалить
            </button>
          </div>
        )}
      </ModalSheet>
    </main>
  );
}
