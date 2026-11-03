import { eq, and, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db, tasks, users, type MindDb } from "@mind/db";
import { DEFAULT_TIMEZONE, nextOccurrence, type Recurrence } from "@mind/shared";
import { InlineKeyboard } from "grammy";

export interface ReminderJobResult {
  scanned: number;
  reminded: number;
  errors: number;
}

export interface TelegramSender {
  sendMessage(
    chatId: number | string,
    text: string,
    other?: Record<string, unknown>
  ): Promise<unknown>;
}

export const SCAN_REMINDERS_JOB_NAME = "scan-reminders";

/**
 * Sends a reminder for every task whose deadline has arrived and that has not been reminded yet.
 * A repeating task moves on to its next occurrence instead of staying reminded.
 */
export async function scanReminders(
  database: MindDb = db,
  telegramApi?: TelegramSender | null
): Promise<ReminderJobResult> {
  const result: ReminderJobResult = {
    scanned: 0,
    reminded: 0,
    errors: 0,
  };

  const upcomingTasks = await database
    .select({
      id: tasks.id,
      title: tasks.title,
      deadline: tasks.deadline,
      userId: tasks.userId,
      recurrence: tasks.recurrence,
      telegramId: users.telegramId,
      timezone: users.timezone,
    })
    .from(tasks)
    .innerJoin(users, eq(tasks.userId, users.id))
    .where(
      and(
        inArray(tasks.status, ["inbox", "in_progress"]),
        isNotNull(tasks.deadline),
        sql`${tasks.deadline} <= NOW()`,
        isNull(tasks.lastRemindedAt)
      )
    );

  result.scanned = upcomingTasks.length;

  for (const task of upcomingTasks) {
    try {
      if (!telegramApi) {
        console.warn(
          `[Proactive Engine] Telegram API client is not configured; skipping dispatch for task "${task.title}" (${task.id})`
        );
        continue;
      }

      const keyboard = task.recurrence
        ? new InlineKeyboard()
            .text("✅ Сделано", `ack:${task.id}`)
            .text("🛑 Больше не напоминать", `stop:${task.id}`)
        : new InlineKeyboard()
            .text("✅ Выполнено", `done:${task.id}`)
            .text("🔔 +1 час", `snz1:${task.id}`)
            .text("🔔 Завтра", `snzd:${task.id}`);

      await telegramApi.sendMessage(
        task.telegramId,
        `🔔 Напоминание: «${task.title}»`,
        { reply_markup: keyboard }
      );

      await database
        .update(tasks)
        .set(
          task.recurrence && task.deadline
            ? {
                deadline: nextOccurrence(
                  new Date(task.deadline),
                  task.recurrence as Recurrence,
                  task.timezone ?? DEFAULT_TIMEZONE
                ),
                updatedAt: sql`NOW()`,
              }
            : {
                lastRemindedAt: sql`NOW()`,
                updatedAt: sql`NOW()`,
              }
        )
        .where(eq(tasks.id, task.id));

      result.reminded++;
    } catch (error) {
      result.errors++;
      console.error(
        `[Proactive Engine] Failed to send reminder for task "${task.title}" (${task.id}) to telegram user ${task.telegramId}:`,
        error
      );
    }
  }

  return result;
}

/**
 * Backward compatibility alias for scanReminders.
 */
export const checkAndSendReminders = scanReminders;

/**
 * Job processor function called by the BullMQ worker for proactive reminder jobs.
 */
export async function processReminderJob(
  job: { name: string },
  database: MindDb = db,
  telegramApi?: TelegramSender | null
): Promise<ReminderJobResult | null> {
  if (job.name === SCAN_REMINDERS_JOB_NAME) {
    return scanReminders(database, telegramApi);
  }
  return null;
}
