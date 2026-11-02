const RECURRENCE_LABELS: Record<string, string> = {
  daily: "каждый день",
  weekly: "каждую неделю",
  monthly: "каждый месяц",
};

export function recurrenceLabel(recurrence?: string | null): string | null {
  return recurrence ? (RECURRENCE_LABELS[recurrence] ?? null) : null;
}

export function pluralize(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Calendar days from today, in the device's timezone. */
export function daysFromToday(date: Date, now: Date = new Date()): number {
  return Math.round((startOfDay(date) - startOfDay(now)) / 86400000);
}

export function formatDeadline(value: string | Date, now: Date = new Date()): string {
  const date = new Date(value);
  const time = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const days = daysFromToday(date, now);
  if (days === 0) return `Сегодня, ${time}`;
  if (days === 1) return `Завтра, ${time}`;
  if (days === -1) return `Вчера, ${time}`;
  const sameYear = date.getFullYear() === now.getFullYear();
  const day = date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
  return `${day.replace(".", "")}, ${time}`;
}

export function formatDate(value: string | Date): string {
  return new Date(value)
    .toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    .replace(".", "");
}

/** Drops the generated timestamp and underscores from a file name. */
export function displayFileName(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/_\d{10,}$/, "")
    .replace(/_+/g, " ")
    .trim();
}
