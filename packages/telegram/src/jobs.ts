type Job = () => Promise<void>;

/**
 * Runs AI work outside the update handler, so one slow generation does not hold up
 * other users and webhook requests return before Telegram's timeout.
 * Limits how many jobs run at once and keeps each user's messages in order.
 */
export class JobQueue {
  private readonly queues = new Map<string, Job[]>();
  private readonly busy = new Set<string>();

  constructor(private readonly concurrency: number) {}

  add(key: string, job: Job): void {
    const queue = this.queues.get(key) ?? [];
    queue.push(job);
    this.queues.set(key, queue);
    this.drain();
  }

  /** Jobs of this user that are waiting or running. */
  pending(key: string): number {
    return (this.queues.get(key)?.length ?? 0) + (this.busy.has(key) ? 1 : 0);
  }

  private drain(): void {
    for (const [key, queue] of this.queues) {
      if (this.busy.size >= this.concurrency) return;
      if (this.busy.has(key)) continue;

      const job = queue.shift();
      if (queue.length === 0) this.queues.delete(key);
      if (!job) continue;

      this.busy.add(key);
      job()
        .catch((err) => console.error("[JobQueue] Job failed:", err))
        .finally(() => {
          this.busy.delete(key);
          this.drain();
        });
    }
  }
}

export interface RateLimits {
  perMinute: number;
  perDay: number;
}

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * Per-user limits protecting the shared free AI quotas.
 * Counters live in memory, so a restart resets them.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly limits: RateLimits) {}

  /** How many requests this user has left today. */
  remainingToday(key: string, now: number = Date.now()): number {
    const used = (this.hits.get(key) ?? []).filter((t) => now - t < DAY_MS).length;
    return Math.max(0, this.limits.perDay - used);
  }

  /** Records a request. Returns which limit was hit, or null when it is allowed. */
  check(key: string, now: number = Date.now()): "minute" | "day" | null {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < DAY_MS);
    this.hits.set(key, recent);

    if (recent.length >= this.limits.perDay) return "day";
    if (recent.filter((t) => now - t < MINUTE_MS).length >= this.limits.perMinute) return "minute";

    recent.push(now);
    return null;
  }
}
