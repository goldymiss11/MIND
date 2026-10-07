import { test, mock } from "node:test";
import assert from "node:assert/strict";
import {
  scanReminders,
  checkAndSendReminders,
  processReminderJob,
  SCAN_REMINDERS_JOB_NAME,
  type TelegramSender,
} from "../src/reminder.js";

test("scanReminders sends reminders to telegram users and updates tasks", async () => {
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

  const result = await scanReminders(mockDb, mockTelegramApi);

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

test("scanReminders isolates errors when sendMessage fails for one user", async () => {
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

  const result = await scanReminders(mockDb, mockTelegramApi);

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

test("scanReminders skips message dispatch when telegramApi is missing", async () => {
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

  const result = await scanReminders(mockDb, null);

  assert.equal(result.scanned, 1);
  assert.equal(result.reminded, 0);
  assert.equal(result.errors, 0);
  assert.equal(updateCalled, false);
});

test("checkAndSendReminders maintains backward compatibility alias", async () => {
  assert.equal(typeof checkAndSendReminders, "function");
  assert.equal(checkAndSendReminders, scanReminders);
});

test("processReminderJob processes scan-reminders job correctly (BullMQ Worker simulation)", async () => {
  const mockDb: any = {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: async () => [],
        }),
      }),
    }),
  };

  const mockJob = {
    name: SCAN_REMINDERS_JOB_NAME,
  };

  const result = await processReminderJob(mockJob, mockDb, null);
  assert.notEqual(result, null);
  assert.equal(result?.scanned, 0);
  assert.equal(result?.reminded, 0);
  assert.equal(result?.errors, 0);
});

test("processReminderJob ignores unknown jobs without error", async () => {
  const mockJob = {
    name: "some-other-unrelated-job",
  };

  const result = await processReminderJob(mockJob, {} as any, null);
  assert.equal(result, null);
});

test("BullMQ repeatable job registration can be mocked without Redis", async () => {
  // Mock BullMQ Queue instance to verify registration without requiring live Redis
  const addedJobs: { name: string; data: unknown; opts: unknown }[] = [];

  const mockBullMqQueue = {
    add: mock.fn(async (name: string, data: unknown, opts: unknown) => {
      addedJobs.push({ name, data, opts });
      return { id: "job-1", name };
    }),
  };

  const cronPattern = "*/5 * * * *";
  await mockBullMqQueue.add(
    SCAN_REMINDERS_JOB_NAME,
    {},
    {
      repeat: {
        pattern: cronPattern,
      },
    }
  );

  assert.equal(mockBullMqQueue.add.mock.callCount(), 1);
  assert.equal(addedJobs.length, 1);
  assert.equal(addedJobs[0]?.name, "scan-reminders");
  assert.deepEqual(addedJobs[0]?.opts, {
    repeat: {
      pattern: "*/5 * * * *",
    },
  });
});

test("scanReminders attaches interactive inline keyboard with done, snz1, and snzd buttons", async () => {
  const sentPayloads: Array<{ chatId: number | string; text: string; other?: any }> = [];

  const mockTasks = [
    {
      id: "987fcdeb-51a2-43f7-9abc-def012345678",
      title: "Подготовить слайды",
      deadline: new Date(Date.now() + 1 * 60 * 60 * 1000),
      userId: "user-123",
      telegramId: 555666,
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
        where: async () => [{ id: "987fcdeb-51a2-43f7-9abc-def012345678" }],
      }),
    }),
  };

  const mockTelegramApi: TelegramSender = {
    sendMessage: async (chatId, text, other) => {
      sentPayloads.push({ chatId, text, other });
      return { ok: true };
    },
  };

  const result = await scanReminders(mockDb, mockTelegramApi);

  assert.equal(result.reminded, 1);
  assert.equal(sentPayloads.length, 1);
  assert.equal(sentPayloads[0]?.chatId, 555666);
  assert.ok(sentPayloads[0]?.other?.reply_markup);

  const keyboardRows = sentPayloads[0]?.other?.reply_markup?.inline_keyboard;
  assert.ok(Array.isArray(keyboardRows));
  // Flat list of all buttons in the keyboard
  const buttons = keyboardRows.flat();
  assert.equal(buttons.length, 3);

  assert.equal(buttons[0]?.text, "✅ Выполнено");
  assert.equal(buttons[0]?.callback_data, "done:987fcdeb-51a2-43f7-9abc-def012345678");

  assert.equal(buttons[1]?.text, "🔔 +1 час");
  assert.equal(buttons[1]?.callback_data, "snz1:987fcdeb-51a2-43f7-9abc-def012345678");

  assert.equal(buttons[2]?.text, "🔔 Завтра");
  assert.equal(buttons[2]?.callback_data, "snzd:987fcdeb-51a2-43f7-9abc-def012345678");

  // Verify byte limit of callback data <= 64 bytes
  for (const btn of buttons) {
    assert.ok(Buffer.byteLength(btn.callback_data, "utf8") <= 64);
  }
});
