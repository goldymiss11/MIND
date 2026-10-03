import { eq, and, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db, tasks, users, type MindDb } from "@mind/db";

export interface ReminderJobResult {
  scanned: number;
  reminded: number;
  errors: number;
}

export interface TelegramSender {
  sendMessage(
    chatId: number | string,
    text: string
  ): Promise<unknown>;
}

/**
 * Scans for tasks with an approaching deadline (< 4 hours from now)
 * that have not yet been reminded (lastRemindedAt IS NULL),
 * sends a proactive reminder to the user via Telegram,
 * and records lastRemindedAt = NOW().
 */
export async function checkAndSendReminders(
  database: MindDb = db,
  telegramApi?: TelegramSender | null
): Promise<ReminderJobResult> {
  const result: ReminderJobResult = {
    scanned: 0,
    reminded: 0,
    errors: 0,
  };

  // Find tasks where:
  // - status IN ('inbox', 'in_progress')
  // - deadline IS NOT NULL
  // - deadline < NOW() + INTERVAL '4 hours'
  // - lastRemindedAt IS NULL
  const upcomingTasks = await database
    .select({
      id: tasks.id,
      title: tasks.title,
      deadline: tasks.deadline,
      userId: tasks.userId,
      telegramId: users.telegramId,
    })
    .from(tasks)
    .innerJoin(users, eq(tasks.userId, users.id))
    .where(
      and(
        inArray(tasks.status, ["inbox", "in_progress"]),
        isNotNull(tasks.deadline),
        sql`${tasks.deadline} < NOW() + INTERVAL '4 hours'`,
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

      await telegramApi.sendMessage(
        task.telegramId,
        `🔔 Напоминание: Приближается дедлайн по задаче «${task.title}»`
      );

      await database
        .update(tasks)
        .set({
          lastRemindedAt: sql`NOW()`,
          updatedAt: sql`NOW()`,
        })
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
