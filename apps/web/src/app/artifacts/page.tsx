"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useApi, useResource } from "../../lib/useApi";
import { displayFileName, formatDate, pluralize } from "../../lib/format";
import { FILE_CATEGORIES, fileCategory } from "../../lib/categories";
import { previewArtifacts } from "../../lib/preview";
import { IconCircle } from "../../components/ui/IconCircle";
import { ModalSheet } from "../../components/ui/ModalSheet";
import { Segmented } from "../../components/ui/Segmented";
import { ListSkeleton } from "../../components/ui/LoadingSkeleton";
import { EmptyState, ErrorState, OutsideTelegram, ScreenHero } from "../../components/ui/States";

function fileExtension(file: any): string {
  return file.name?.match(/\.([^.]+)$/)?.[1]?.toUpperCase() ?? String(file.type ?? "").toUpperCase();
}

/** Pptx and xlsx keep JSON as their source. Shows it as readable text; a cut-off preview falls back to null. */
function readablePreview(file: any): string | null {
  const content: string | null = file.content;
  if (!content) return null;
  if (file.type !== "pptx" && file.type !== "xlsx") return content;
  try {
    const parsed = JSON.parse(content);
    if (file.type === "pptx") {
      return (parsed.slides ?? []).map((slide: any, i: number) => `${i + 1}. ${slide.title}`).join("\n");
    }
    const header = (parsed.columns ?? []).map((c: any) => c.header ?? c).join(" · ");
    return `${header}\nСтрок: ${(parsed.rows ?? []).length}`;
  } catch {
    return null;
  }
}

export default function ArtifactsPage() {
  const { request, haptic, confirm, showAlert } = useApi();
  const { data, setData, error, loading, reload, isOutsideTelegram } = useResource<any[]>("/artifacts", previewArtifacts);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [sending, setSending] = useState(false);

  if (isOutsideTelegram) return <OutsideTelegram />;
  if (loading && !data) return <ListSkeleton />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={reload} />;

  const files = data;

  const send = async (file: any) => {
    haptic.impact("light");
    try {
      setSending(true);
      await request(`/artifacts/${file.id}/send`, "POST");
      haptic.notification("success");
      setSelected(null);
      await showAlert("Файл отправлен в чат с ботом.");
    } catch (err: any) {
      haptic.notification("error");
      await showAlert(err.message || "Не удалось отправить файл.");
    } finally {
      setSending(false);
    }
  };

  const remove = async (file: any) => {
    if (!(await confirm(`Удалить «${displayFileName(file.name)}»?`))) return;
    haptic.impact("heavy");
    setSelected(null);
    setData(files.filter((f) => f.id !== file.id));
    try {
      await request(`/artifacts/${file.id}`, "DELETE");
    } catch (err: any) {
      setData(files);
      await showAlert(err.message || "Не удалось удалить файл");
    }
  };

  const present = FILE_CATEGORIES.filter((c) => files.some((f) => fileCategory(f.type).id === c.id));
  const options = [{ id: "all", label: "Все" }, ...present.map((c) => ({ id: c.id, label: c.label }))];
  const visible = filter === "all" ? files : files.filter((f) => fileCategory(f.type).id === filter);
  const preview = selected ? readablePreview(selected) : null;

  return (
    <main className="screen">
      <ScreenHero emoji="🗂️" title="Файлы">
        <span className="text-hint">
          {files.length > 0
            ? `${files.length} ${pluralize(files.length, "файл", "файла", "файлов")}. Попросите бота дополнить любой из них.`
            : "Здесь будет всё, что создаст MIND и что вы ему пришлёте."}
        </span>
      </ScreenHero>

      {present.length > 1 && <Segmented options={options} value={filter} onChange={setFilter} />}

      {visible.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {visible.map((file) => {
            const category = fileCategory(file.type);
            return (
              <button
                key={file.id}
                onClick={() => {
                  haptic.impact("light");
                  setSelected(file);
                }}
                className="pressable relative flex min-h-[172px] flex-col items-center overflow-hidden rounded-[22px] bg-card px-3 pb-3.5 pt-5 text-center"
              >
                <span className={`ribbon ${category.solid}`}>{fileExtension(file)}</span>
                <IconCircle icon={category.icon} color={category.solid} size={54} />
                <span className="mt-3 line-clamp-3 break-words text-[15px] font-semibold leading-5">
                  {displayFileName(file.name)}
                </span>
                <span className="mt-auto pt-1.5 text-[13px] text-hint">{file.createdAt ? formatDate(file.createdAt) : ""}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState emoji="📭" title="Файлов пока нет" hint="Напишите боту: «сделай реферат про графы по ГОСТу»" />
      )}

      <ModalSheet
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? displayFileName(selected.name) : undefined}
        subtitle={selected ? `${fileExtension(selected)}${selected.createdAt ? ` · ${formatDate(selected.createdAt)}` : ""}` : undefined}
      >
        {selected && (
          <div className="flex flex-col gap-3">
            {preview && (
              <div className="no-scrollbar max-h-[40dvh] overflow-y-auto whitespace-pre-wrap break-words rounded-2xl bg-ink/[0.06] p-4 text-[15px] leading-[21px]">
                {preview}
              </div>
            )}
            <button onClick={() => send(selected)} disabled={sending} className="btn-primary mt-1">
              <Send size={20} />
              {sending ? "Отправляю…" : "Отправить в чат"}
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
