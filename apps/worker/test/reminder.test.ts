import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAndSendReminders, type TelegramSender } from "../src/reminder.js";

test("checkAndSendReminders sends reminders to telegram users and updates tasks", async () => {
  const sentMessages: { chatId: number | string; text: string }[] = [];
  const updatedTaskIds: string[] = [];

  const mockTasks = [
    {
      id: "task-1",
      title: "Подготовить отчет по физике",
      deadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // in 2 hours
      userId: "user-1",
      telegramId: 111222,
    },
    {
      id: "task-2",
      title: "Купить билеты",
      deadline: new Date(Date.now() + 1 * 60 * 60 * 1000), // in 1 hour
      userId: "user-2",
      telegramId: 333444,
    },
  ];

  const mockDb: any = {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: async () => mockTasks,
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: async (condition: any) => {
          // Track updated tasks
          const id = condition?.queryChunks?.[1]?.value || "updated";
          updatedTaskIds.push(id);
          return [{ id }];
        },
      }),
    }),
  };

  const mockTelegramApi: TelegramSender = {
    sendMessage: async (chatId, text) => {
      sentMessages.push({ chatId, text });
      return { ok: true };
    },
  };

  const result = await checkAndSendReminders(mockDb, mockTelegramApi);

  assert.equal(result.scanned, 2);
  assert.equal(result.reminded, 2);
  assert.equal(result.errors, 0);

  assert.equal(sentMessages.length, 2);
  assert.equal(sentMessages[0]?.chatId, 111222);
  assert.equal(
    sentMessages[0]?.text,
    "🔔 Напоминание: Приближается дедлайн по задаче «Подготовить отчет по физике»"
  );
  assert.equal(sentMessages[1]?.chatId, 333444);
  assert.equal(
    sentMessages[1]?.text,
    "🔔 Напоминание: Приближается дедлайн по задаче «Купить билеты»"
  );
  assert.equal(updatedTaskIds.length, 2);
});

test("checkAndSendReminders isolates errors when sendMessage fails for one user", async () => {
  const sentMessages: { chatId: number | string; text: string }[] = [];
  const updatedTaskIds: string[] = [];

  const mockTasks = [
    {
      id: "task-fail",
      title: "Сломанная отправка",
      deadline: new Date(),
      userId: "user-fail",
      telegramId: 999999,
    },
    {
      id: "task-success",
      title: "Успешная отправка",
      deadline: new Date(),
      userId: "user-ok",
      telegramId: 888888,
    },
  ];

  const mockDb: any = {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: async () => mockTasks,
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: async () => {
          updatedTaskIds.push("task-success");
          return [{ id: "task-success" }];
        },
      }),
    }),
  };

  const mockTelegramApi: TelegramSender = {
    sendMessage: async (chatId, text) => {
      if (chatId === 999999) {
        throw new Error("Telegram API: Chat not found / Bot was blocked");
      }
      sentMessages.push({ chatId, text });
      return { ok: true };
    },
  };

  const result = await checkAndSendReminders(mockDb, mockTelegramApi);

  assert.equal(result.scanned, 2);
  assert.equal(result.reminded, 1);
  assert.equal(result.errors, 1);

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, 888888);
  assert.equal(
    sentMessages[0]?.text,
    "🔔 Напоминание: Приближается дедлайн по задаче «Успешная отправка»"
  );
});

test("checkAndSendReminders skips message dispatch when telegramApi is missing", async () => {
  const mockTasks = [
    {
      id: "task-1",
      title: "Задача без API",
      deadline: new Date(),
      userId: "user-1",
      telegramId: 111111,
    },
  ];

  let updateCalled = false;
  const mockDb: any = {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: async () => mockTasks,
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: async () => {
          updateCalled = true;
          return [];
        },
      }),
    }),
  };

  const result = await checkAndSendReminders(mockDb, null);

  assert.equal(result.scanned, 1);
  assert.equal(result.reminded, 0);
  assert.equal(result.errors, 0);
  assert.equal(updateCalled, false);
});
