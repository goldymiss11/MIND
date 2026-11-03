"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2, X } from "lucide-react";
import { useApi, useResource } from "../../lib/useApi";
import { formatDate, pluralize } from "../../lib/format";
import { memoryCategory, type Category } from "../../lib/categories";
import { previewMemories } from "../../lib/preview";
import { CardGroup } from "../../components/ui/CardGroup";
import { RowItem } from "../../components/ui/RowItem";
import { IconCircle } from "../../components/ui/IconCircle";
import { ModalSheet } from "../../components/ui/ModalSheet";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { SwipeRow } from "../../components/ui/SwipeRow";
import { ListSkeleton } from "../../components/ui/LoadingSkeleton";
import { EmptyState, ErrorState, OutsideTelegram, ScreenHero } from "../../components/ui/States";
import { NewMemorySheet } from "../../components/forms/MemorySheet";

/** Tiles that grow with the number of records, like the market heat map in Wallet. */
function TopicMap({
  topics,
  active,
  onSelect,
}: {
  topics: Array<{ category: Category; count: number }>;
  active: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {topics.map(({ category, count }) => {
        const isActive = active === category.id;
        return (
          <button
            key={category.id}
            onClick={() => {
              window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
              onSelect(isActive ? null : category.id);
            }}
            aria-pressed={isActive}
            style={{ flexGrow: count, flexBasis: `${Math.min(30 + count * 8, 62)}%` }}
            className={`pressable flex h-[76px] min-w-[96px] flex-col items-center justify-center rounded-[16px] text-white ${category.solid} ${
              active && !isActive ? "opacity-40" : ""
            }`}
          >
            <span className="text-[17px] font-bold leading-5">{category.label}</span>
            <span className="text-[14px] font-semibold text-white/85">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function MemoryPage() {
  const { request, haptic, confirm, showAlert } = useApi();
  const { data, setData, error, loading, reload, isOutsideTelegram } = useResource<any[]>("/memories", previewMemories);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const topics = useMemo(() => {
    const counts = new Map<string, { category: Category; count: number }>();
    for (const memory of data ?? []) {
      const category = memoryCategory(memory.type);
      const entry = counts.get(category.id) ?? { category, count: 0 };
      entry.count++;
      counts.set(category.id, entry);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  }, [data]);

  if (isOutsideTelegram) return <OutsideTelegram />;
  if (loading && !data) return <ListSkeleton />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={reload} />;

  const memories = data;

  const remove = async (memory: any) => {
    if (!(await confirm("Забыть это?"))) return;
    haptic.impact("heavy");
    setSelected(null);
    setData(memories.filter((m) => m.id !== memory.id));
    try {
      await request(`/memories/${memory.id}`, "DELETE");
    } catch (err: any) {
      setData(memories);
      await showAlert(err.message || "Не удалось удалить");
    }
  };

  const visible = memories.filter(
    (m) =>
      (!query || m.content?.toLowerCase().includes(query.toLowerCase())) &&
      (!topic || memoryCategory(m.type).id === topic)
  );

  return (
    <main className="screen">
      <ScreenHero emoji="🧠" title="Память">
        <span className="text-hint">
          {memories.length > 0
            ? `${memories.length} ${pluralize(memories.length, "запись", "записи", "записей")} о вас. MIND учитывает их в ответах.`
            : "Расскажите боту о себе, и он будет это учитывать."}
        </span>
      </ScreenHero>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-hint" />
          <input
            aria-label="Поиск в памяти"
            placeholder="Поиск"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="field !bg-card !py-[11px] pl-11 pr-10"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Очистить"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-hint"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            haptic.impact("light");
            setIsNewOpen(true);
          }}
          aria-label="Запомнить"
          className="pressable flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-accent text-white"
        >
          <Plus size={24} strokeWidth={2.6} />
        </button>
      </div>

      {topics.length > 1 && (
        <>
          <SectionHeader title="Темы" />
          <TopicMap topics={topics} active={topic} onSelect={setTopic} />
        </>
      )}

      {visible.length > 0 ? (
        <>
          <SectionHeader title="Записи" aside={`Всего: ${visible.length}`} />
          <CardGroup>
            {visible.map((memory) => {
              const category = memoryCategory(memory.type);
              return (
                <SwipeRow
                  key={memory.id}
                  right={{ icon: <Trash2 size={20} />, label: "Забыть", color: "bg-bad", onTrigger: () => remove(memory) }}
                >
                  <RowItem
                    onClick={() => setSelected(memory)}
                    icon={<IconCircle icon={category.icon} color={category.solid} />}
                    title={memory.content}
                    subtitle={category.label}
                  />
                </SwipeRow>
              );
            })}
          </CardGroup>
        </>
      ) : (
        <EmptyState
          emoji={memories.length > 0 ? "🔍" : "💭"}
          title={memories.length > 0 ? "Ничего не нашлось" : "Пока пусто"}
          hint={memories.length > 0 ? undefined : "Например, напишите боту: «я учусь на 3 курсе»"}
        />
      )}

      <NewMemorySheet
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        // Near-duplicates merge on the server, so the returned record may already be in the list.
        onCreated={(memory) => setData([memory, ...memories.filter((m) => m.id !== memory.id)])}
      />

      <ModalSheet
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? memoryCategory(selected.type).label : undefined}
        subtitle={selected?.createdAt ? formatDate(selected.createdAt) : undefined}
      >
        {selected && (
          <div className="flex flex-col gap-3">
            <p className="break-words text-[17px] leading-[23px]">{selected.content}</p>
            <button onClick={() => remove(selected)} className="btn-secondary mt-3 !text-bad">
              Забыть
            </button>
          </div>
        )}
      </ModalSheet>
    </main>
  );
}
