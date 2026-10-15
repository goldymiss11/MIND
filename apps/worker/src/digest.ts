import { eq, and, or, inArray, gte } from "drizzle-orm";
import { db, tasks, users, messages, conversations, type MindDb, type Task, type User } from "@mind/db";
import { AiService } from "@mind/ai";
import { InlineKeyboard } from "grammy";
import type { TelegramSender } from "./reminder.js";

export const DAILY_DIGEST_JOB_NAME = "daily-digest";

export interface DigestJobResult {
  scanned: number;
  sent: number;
  skipped: number;
  errors: number;
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[\]])/g, "\\$1");
}

function formatDigestTask(task: Task, index: number, now: Date): string {
  const num = index + 1;
  const escapedTitle = escapeMarkdown(task.title);

  let statusEmoji = "⏳";
  let deadlineText = "";

  if (task.deadline) {
    const dl = new Date(task.deadline);
    const timeStr = dl.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const isToday =
      dl.getDate() === now.getDate() &&
      dl.getMonth() === now.getMonth() &&
      dl.getFullYear() === now.getFullYear();

    if (dl.getTime() < now.getTime()) {
      statusEmoji = "⚠️";
      if (isToday) {
        deadlineText = ` _(просрочено, было до ${timeStr})_`;
      } else {
        const dateStr = dl.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
        deadlineText = ` _(просрочено с ${dateStr})_`;
      }
    } else if (isToday) {
      deadlineText = ` _(до ${timeStr})_`;
    } else {
      const dateStr = dl.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
      deadlineText = ` _(до ${dateStr} ${timeStr})_`;
    }
  } else {
    if (task.priority === "urgent") {
      statusEmoji = "🔥";
      deadlineText = ` _(срочно)_`;
    } else if (task.priority === "high") {
      statusEmoji = "⚡";
      deadlineText = ` _(высокий приоритет)_`;
    }
  }

  return `${num}. ${statusEmoji} *${escapedTitle}*${deadlineText}`;
}

/**
 * Checks whether user had activity within the last 14 days:
 * - user creation within 14 days
 * - task update or creation within 14 days
 * - message in user conversation within 14 days
 */
export async function isUserActive(
  database: MindDb,
  user: User,
  fourteenDaysAgo: Date
): Promise<boolean> {
  if (user.createdAt && new Date(user.createdAt).getTime() >= fourteenDaysAgo.getTime()) {
    return true;
  }

  const recentTask = await database
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, user.id),
        or(
          gte(tasks.updatedAt, fourteenDaysAgo),
          gte(tasks.createdAt, fourteenDaysAgo)
        )
      )
    )
    .limit(1);

  if (recentTask.length > 0) {
    return true;
  }

  const recentMessage = await database
    .select({ id: messages.id })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.userId, user.id),
        gte(messages.createdAt, fourteenDaysAgo)
      )
    )
    .limit(1);

  return recentMessage.length > 0;
}

/**
 * Generates and dispatches daily morning briefings to active users with pressing tasks.
 * Strictly avoids spamming users without actionable items or users on cooldown.
 */
export async function generateDailyDigest(
  database: MindDb = db,
  telegramApi?: TelegramSender | null,
  ai: AiService = new AiService()
): Promise<DigestJobResult> {
  const result: DigestJobResult = {
    scanned: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
  };

  const allUsers = await database.select().from(users);
  result.scanned = allUsers.length;

  const now = new Date();
  const twentyHoursMs = 20 * 60 * 60 * 1000;
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const nowMs = now.getTime();
  const in24hMs = nowMs + 24 * 60 * 60 * 1000;
  const in48hMs = nowMs + 48 * 60 * 60 * 1000;

  for (const user of allUsers) {
    try {
      // Condition 1 (Opt-in check): user.digestEnabled !== false
      if (user.digestEnabled === false) {
        result.skipped++;
        continue;
      }

      // Condition 2 (Cooldown check): NOW() - lastDigestSentAt > 20 hours or null
      if (user.lastDigestSentAt) {
        const elapsedMs = nowMs - new Date(user.lastDigestSentAt).getTime();
        if (elapsedMs <= twentyHoursMs) {
          result.skipped++;
          continue;
        }
      }

      // Condition 3 (Activity check): active within the last 14 days
      const active = await isUserActive(database, user, fourteenDaysAgo);
      if (!active) {
        result.skipped++;
        continue;
      }

      // Condition 4 (Actionable Tasks Check):
      // Query tasks where status IN ('inbox', 'in_progress') and userId = user.id
      const activeTasks = await database
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, user.id),
            inArray(tasks.status, ["inbox", "in_progress"])
          )
        );

      const overdue: Task[] = [];
      const dueToday: Task[] = [];
      const dueSoon: Task[] = [];
      const highPriority: Task[] = [];

      for (const task of activeTasks) {
        if (task.deadline) {
          const dlMs = new Date(task.deadline).getTime();
          if (dlMs < nowMs) {
            overdue.push(task);
          } else if (dlMs >= nowMs && dlMs <= in24hMs) {
            dueToday.push(task);
          } else if (dlMs > in24hMs && dlMs <= in48hMs) {
            dueSoon.push(task);
          }
        } else {
          if (task.priority === "high" || task.priority === "urgent") {
            highPriority.push(task);
          }
        }
      }

      // CRITICAL SKIP RULE:
      // If overdue.length === 0 && dueToday.length === 0 && dueSoon.length === 0 && highPriority.length === 0
      if (
        overdue.length === 0 &&
        dueToday.length === 0 &&
        dueSoon.length === 0 &&
        highPriority.length === 0
      ) {
        result.skipped++;
        continue;
      }

      // Sort tasks for most relevant display
      const sortedOverdue = [...overdue].sort(
        (a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
      );
      const sortedDueToday = [...dueToday].sort(
        (a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
      );
      const sortedDueSoon = [...dueSoon].sort(
        (a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
      );
      const sortedHighPriority = [...highPriority].sort((a, b) => {
        if (a.priority === "urgent" && b.priority !== "urgent") return -1;
        if (b.priority === "urgent" && a.priority !== "urgent") return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const candidateTasks = [
        ...sortedOverdue,
        ...sortedDueToday,
        ...sortedDueSoon,
        ...sortedHighPriority,
      ];
      const topTasks = candidateTasks.slice(0, 3);

      // Adaptive Scenario Selection
      let scenario: "A" | "B" | "C" | "D";
      let scenarioContext = "";

      if (overdue.length > 0) {
        scenario = "A";
        scenarioContext = `Сценарий: Есть просроченные задачи (${overdue.map((t) => t.title).join(", ")}). Мягко напомни закрыть хвосты без чувства вины.`;
      } else if (dueToday.length >= 2 || (dueToday.length >= 1 && (dueSoon.length > 0 || highPriority.length > 0))) {
        scenario = "C";
        scenarioContext = `Сценарий: Несколько задач на сегодня (${candidateTasks.slice(0, 3).map((t) => t.title).join(", ")}). Дай бодрый, энергичный фокус на день.`;
      } else if (dueToday.length === 1) {
        scenario = "B";
        const t = dueToday[0]!;
        const dlStr = new Date(t.deadline!).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
        scenarioContext = `Сценарий: Главная задача на сегодня — «${t.title}» (дедлайн до ${dlStr}). Сделай акцент на ней.`;
      } else {
        scenario = "D";
        scenarioContext = `Сценарий: Предстоящие важные дела в ближайшие 1-2 дня (${candidateTasks.slice(0, 3).map((t) => t.title).join(", ")}). Напомни о приближающемся майлстоне.`;
      }

      let aiText = "";
      try {
        const prompt = `Ты — персональный ассистент MIND. Твоя задача — сформулировать персональное напутствие на день (строго 1-2 предложения) на русском языке.
Требования:
- Максимум 1-2 предложения.
- Тон дружелюбный, спокойный, естественный.
- Без шаблонных корпоративных штампов.
- Не дублируй список задач (он выводится отдельно).
${scenarioContext}`;

        const aiResponse = await ai.generateText(prompt);
        aiText = aiResponse?.result?.trim() || "";
      } catch (aiErr) {
        console.warn(`[Daily Digest] AI generation failed for user ${user.id}, using fallback:`, aiErr);
      }

      if (!aiText) {
        switch (scenario) {
          case "A":
            aiText = "Давай сначала разберёмся со вчерашними хвостами, чтобы они не тянули назад.";
            break;
          case "B":
            aiText = `Главный фокус на сегодня — «${dueToday[0]?.title}». Закрой её в первую очередь.`;
            break;
          case "C":
            aiText = "Сегодня насыщенный день. Выдели главное и двигайся по шагам.";
            break;
          case "D":
            aiText = "На горизонте важные дела. Самое время спокойно к ним подготовиться.";
            break;
        }
      }

      const taskLines = topTasks.map((t, idx) => formatDigestTask(t, idx, now)).join("\n");
      const message = `🌅 *План на день*\n\n${aiText}\n\n${taskLines}`;

      const keyboard = new InlineKeyboard().text("🔕 Отключить утреннюю сводку", "digest:off");

      if (!telegramApi) {
        console.warn(`[Daily Digest] Telegram API client is not configured; skipping dispatch for user ${user.id}`);
        result.skipped++;
        continue;
      }

      try {
        await telegramApi.sendMessage(user.telegramId, message, {
          parse_mode: "Markdown",
          reply_markup: keyboard,
        });
      } catch {
        // Fallback in case Markdown parsing fails
        await telegramApi.sendMessage(user.telegramId, message.replace(/[*_`]/g, ""), {
          reply_markup: keyboard,
        });
      }

      await database
        .update(users)
        .set({
          lastDigestSentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      result.sent++;
    } catch (err) {
      result.errors++;
      console.error(`[Daily Digest] Error dispatching digest for user ${user.id}:`, err);
    }
  }

  return result;
}
