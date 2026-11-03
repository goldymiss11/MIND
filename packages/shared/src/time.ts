export const DEFAULT_TIMEZONE = "Europe/Moscow";

export type Recurrence = "daily" | "weekly" | "monthly";

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export interface WallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Reads an instant as the calendar date and time shown in the given timezone. */
export function toWallClock(date: Date, timezone: string): WallClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/**
 * Converts a calendar date and time in the given timezone to an instant.
 * Out-of-range fields roll over (day 32 becomes the next month), as with Date.UTC.
 */
export function fromWallClock(clock: WallClock, timezone: string): Date {
  const asUtc = Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute, clock.second);
  const offsetAt = (instant: number) => {
    const c = toWallClock(new Date(instant), timezone);
    return Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second) - instant;
  };
  // A second pass settles the result when the first guess lands across a DST change.
  const first = asUtc - offsetAt(asUtc);
  return new Date(asUtc - offsetAt(first));
}

/** Next occurrence after `from`, keeping the wall-clock time across DST changes. */
export function nextOccurrence(from: Date, recurrence: Recurrence, timezone: string, now: Date = new Date()): Date {
  const clock = toWallClock(from, timezone);
  const startDay = clock.day;
  let next = from;
  for (let step = 1; next.getTime() <= now.getTime(); step++) {
    if (recurrence === "monthly") {
      // Clamp to the month's last day so a reminder on the 31st does not skip short months.
      const lastDay = new Date(Date.UTC(clock.year, clock.month - 1 + step + 1, 0)).getUTCDate();
      next = fromWallClock({ ...clock, month: clock.month + step, day: Math.min(startDay, lastDay) }, timezone);
    } else {
      const days = recurrence === "daily" ? step : step * 7;
      next = fromWallClock({ ...clock, day: clock.day + days }, timezone);
    }
  }
  return next;
}

/**
 * Parses a deadline from the AI: an ISO timestamp or a Russian/English relative phrase.
 * An ISO timestamp without an offset, and any named time of day, are read in the user's timezone.
 */
export function parseDeadline(
  rawDeadline: string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE,
  nowDate: Date = new Date()
): Date | null {
  if (!rawDeadline || typeof rawDeadline !== "string") return null;
  const trimmed = rawDeadline.trim();
  if (!trimmed) return null;

  const naiveIso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?$/);
  if (naiveIso) {
    const hasTime = naiveIso[4] !== undefined;
    return fromWallClock(
      {
        year: Number(naiveIso[1]),
        month: Number(naiveIso[2]),
        day: Number(naiveIso[3]),
        hour: hasTime ? Number(naiveIso[4]) : 9,
        minute: hasTime ? Number(naiveIso[5]) : 0,
        second: Number(naiveIso[6] ?? 0),
      },
      timezone
    );
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const iso = new Date(trimmed);
    return isNaN(iso.getTime()) ? null : iso;
  }

  const now = nowDate.getTime();
  const lower = trimmed.toLowerCase();

  const minMatch = lower.match(/(?:через|in)\s+(\d+)\s*(?:минут|мин|minutes?|mins?)/i);
  if (minMatch?.[1]) return new Date(now + Number(minMatch[1]) * 60 * 1000);

  const hourMatch = lower.match(/(?:через|in)\s+(\d+)\s*(?:час|ч(?![а-я])|hours?|hrs?)/i);
  if (hourMatch?.[1]) return new Date(now + Number(hourMatch[1]) * 3600 * 1000);

  const dayMatch = lower.match(/(?:через|in)\s+(\d+)\s*(?:дн|ден|days?)/i);
  if (dayMatch?.[1]) return new Date(now + Number(dayMatch[1]) * 86400 * 1000);

  const timeMatch = lower.match(/(?:в|at)\s+(\d{1,2})(?:[:.](\d{2}))?(?!\d)/i);
  const dayShift = lower.includes("послезавтра")
    ? 2
    : lower.includes("завтра") || lower.includes("tomorrow")
      ? 1
      : lower.includes("сегодня") || lower.includes("today")
        ? 0
        : null;

  if (timeMatch?.[1] && (timeMatch[2] !== undefined || dayShift !== null)) {
    const today = toWallClock(nowDate, timezone);
    const at = (shift: number) =>
      fromWallClock(
        { ...today, day: today.day + shift, hour: Number(timeMatch[1]), minute: Number(timeMatch[2] ?? 0), second: 0 },
        timezone
      );
    if (dayShift !== null) return at(dayShift);
    const sameDay = at(0);
    return sameDay.getTime() < now ? at(1) : sameDay;
  }

  if (dayShift === 2) return new Date(now + 2 * 86400 * 1000);
  if (dayShift === 1) return new Date(now + 86400 * 1000);

  const fallback = new Date(trimmed);
  return !/^\d+$/.test(trimmed) && !isNaN(fallback.getTime()) ? fallback : null;
}
