import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateDailyDigest,
  isUserActive,
  DAILY_DIGEST_JOB_NAME,
} from "../src/digest.js";
import type { TelegramSender } from "../src/reminder.js";
import type { User, Task } from "@mind/db";

test("isUserActive correctly identifies active and inactive users", async () => {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // 1. User created 5 days ago (active by creation)
  const recentUser: User = {
    id: "u-1",
    telegramId: 1001,
    source: "organic",
    digestEnabled: true,
    lastDigestSentAt: null,
    createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  };

  const dummyDb: any = {};
  const active1 = await isUserActive(dummyDb, recentUser, fourteenDaysAgo);
  assert.equal(active1, true);

  // 2. Old user with recent task
  const oldUser: User = {
    id: "u-2",
    telegramId: 1002,
    source: "organic",
    digestEnabled: true,
    lastDigestSentAt: null,
    createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
  };

  const dbWithTask: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: "task-1" }],
        }),
      }),
    }),
  };

  const active2 = await isUserActive(dbWithTask, oldUser, fourteenDaysAgo);
  assert.equal(active2, true);

  // 3. Old user with no recent task but recent message
  let callCount = 0;
  const dbWithMessage: any = {
    select: () => ({
      from: () => {
        callCount++;
        if (callCount === 1) {
          // tasks query
          return {
            where: () => ({
              limit: async () => [],
            }),
          };
        }
        // messages query
        return {
          innerJoin: () => ({
            where: () => ({
              limit: async () => [{ id: "msg-1" }],
            }),
          }),
        };
      },
    }),
  };

  const active3 = await isUserActive(dbWithMessage, oldUser, fourteenDaysAgo);
  assert.equal(active3, true);

  // 4. Old user with neither tasks nor messages
  let callCount2 = 0;
  const dbInactive: any = {
    select: () => ({
      from: () => {
        callCount2++;
        if (callCount2 === 1) {
          return {
            where: () => ({
              limit: async () => [],
            }),
          };
        }
        return {
          innerJoin: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        };
      },
    }),
  };

  const active4 = await isUserActive(dbInactive, oldUser, fourteenDaysAgo);
  assert.equal(active4, false);
});

test("generateDailyDigest: skips user when digestEnabled is false", async () => {
  const mockUser: User = {
    id: "u-disabled",
    telegramId: 2001,
    source: "organic",
    digestEnabled: false,
    lastDigestSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDb: any = {
    select: () => ({
      from: async () => [mockUser],
    }),
  };

  const result = await generateDailyDigest(mockDb, null);
  assert.equal(result.scanned, 1);
  assert.equal(result.sent, 0);
  assert.equal(result.skipped, 1);
  assert.equal(result.errors, 0);
});

test("generateDailyDigest: skips user on 20-hour cooldown, sends if older than 20 hours", async () => {
  const now = new Date();
  const sentMessages: any[] = [];
  const updatedUserIds: string[] = [];

  const userOnCooldown: User = {
    id: "u-cooldown",
    telegramId: 3001,
    source: "organic",
    digestEnabled: true,
    lastDigestSentAt: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5 hours ago
    createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  };

  const userReady: User = {
    id: "u-ready",
    telegramId: 3002,
    source: "organic",
    digestEnabled: true,
    lastDigestSentAt: new Date(now.getTime() - 21 * 60 * 60 * 1000), // 21 hours ago
    createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  };

  const taskForReady: Task = {
    id: "task-ready",
    userId: "u-ready",
    projectId: null,
    title: "Сдать курсовую",
    description: null,
    status: "in_progress",
    priority: "high",
    deadline: new Date(now.getTime() + 2 * 60 * 60 * 1000), // in 2 hours
    progress: 50,
    context: null,
    autonomyLevel: "suggest",
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    lastRemindedAt: null,
  };

  let selectCall = 0;
  const mockDb: any = {
    select: () => ({
      from: (table: any) => {
        selectCall++;
        if (selectCall === 1) {
          // select users
          return Promise.resolve([userOnCooldown, userReady]);
        }
        // select active tasks for userReady
        return {
          where: async () => [taskForReady],
        };
      },
    }),
    update: () => ({
      set: () => ({
        where: async () => {
          updatedUserIds.push("u-ready");
          return [{ id: "u-ready" }];
        },
      }),
    }),
  };

  const mockTelegram: TelegramSender = {
    sendMessage: async (chatId, text, other) => {
      sentMessages.push({ chatId, text, other });
      return { ok: true };
    },
  };

  const mockAi: any = {
    generateText: async () => ({
      result: "Отличный день, чтобы закрыть важную курсовую!",
    }),
  };

  const result = await generateDailyDigest(mockDb, mockTelegram, mockAi);

  assert.equal(result.scanned, 2);
  assert.equal(result.skipped, 1); // userOnCooldown was skipped
  assert.equal(result.sent, 1);    // userReady was sent
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, 3002);
  assert.ok(sentMessages[0]?.text.includes("🌅 *План на день*"));
  assert.ok(sentMessages[0]?.text.includes("Сдать курсовую"));
  assert.equal(updatedUserIds.length, 1);
});

test("generateDailyDigest: CRITICAL SKIP RULE: skips silently if no actionable tasks", async () => {
  const now = new Date();
  const mockUser: User = {
    id: "u-notasks",
    telegramId: 4001,
    source: "organic",
    digestEnabled: true,
    lastDigestSentAt: null,
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  };

  // Task far in the future (> 48h) with normal priority: NOT actionable for morning digest
  const futureTask: Task = {
    id: "task-future",
    userId: "u-notasks",
    projectId: null,
    title: "Планирование отпуска",
    description: null,
    status: "inbox",
    priority: "normal",
    deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // in 10 days
    progress: 0,
    context: null,
    autonomyLevel: "suggest",
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    lastRemindedAt: null,
  };

  let selectCall = 0;
  const mockDb: any = {
    select: () => ({
      from: () => {
        selectCall++;
        if (selectCall === 1) {
          return Promise.resolve([mockUser]);
        }
        return {
          where: async () => [futureTask],
        };
      },
    }),
  };

  const sentMessages: any[] = [];
  const mockTelegram: TelegramSender = {
    sendMessage: async (chatId, text, other) => {
      sentMessages.push({ chatId, text, other });
      return { ok: true };
    },
  };

  const result = await generateDailyDigest(mockDb, mockTelegram);

  assert.equal(result.scanned, 1);
  assert.equal(result.sent, 0);
  assert.equal(result.skipped, 1);
  assert.equal(sentMessages.length, 0); // ZERO SPAM!
});

test("generateDailyDigest: covers Scenario A (overdue tasks)", async () => {
  const now = new Date();
  const mockUser: User = {
    id: "u-overdue",
    telegramId: 5001,
    source: "organic",
    digestEnabled: true,
    lastDigestSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const overdueTask: Task = {
    id: "task-od",
    userId: "u-overdue",
    projectId: null,
    title: "Отчёт по практике",
    description: null,
    status: "in_progress",
    priority: "normal",
    deadline: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    progress: 20,
    context: null,
    autonomyLevel: "suggest",
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    lastRemindedAt: null,
  };

  let selectCall = 0;
  const mockDb: any = {
    select: () => ({
      from: () => {
        selectCall++;
        if (selectCall === 1) return Promise.resolve([mockUser]);
        return {
          where: async () => [overdueTask],
        };
      },
    }),
    update: () => ({
      set: () => ({
        where: async () => [{ id: "u-overdue" }],
      }),
    }),
  };

  const sentMessages: any[] = [];
  const mockTelegram: TelegramSender = {
    sendMessage: async (chatId, text, other) => {
      sentMessages.push({ chatId, text, other });
      return { ok: true };
    },
  };

  // Test AI fallback when AI throws
  const failingAi: any = {
    generateText: async () => {
      throw new Error("AI service unavailable");
    },
  };

  const result = await generateDailyDigest(mockDb, mockTelegram, failingAi);

  assert.equal(result.sent, 1);
  assert.equal(sentMessages.length, 1);
  const msg = sentMessages[0]?.text;
  assert.ok(msg.includes("хвостами"), "Includes scenario A fallback text");
  assert.ok(msg.includes("⚠️"), "Includes warning emoji for overdue");
  assert.ok(msg.includes("Отчёт по практике"));
  assert.ok(sentMessages[0]?.other?.reply_markup);
});

test("generateDailyDigest: covers Scenario D (high priority with no deadline)", async () => {
  const now = new Date();
  const mockUser: User = {
    id: "u-high",
    telegramId: 6001,
    source: "organic",
    digestEnabled: true,
    lastDigestSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const highTask: Task = {
    id: "task-hp",
    userId: "u-high",
    projectId: null,
    title: "Позвонить научному руководителю",
    description: null,
    status: "inbox",
    priority: "urgent",
    deadline: null,
    progress: 0,
    context: null,
    autonomyLevel: "suggest",
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    lastRemindedAt: null,
  };

  let selectCall = 0;
  const mockDb: any = {
    select: () => ({
      from: () => {
        selectCall++;
        if (selectCall === 1) return Promise.resolve([mockUser]);
        return {
          where: async () => [highTask],
        };
      },
    }),
    update: () => ({
      set: () => ({
        where: async () => [{ id: "u-high" }],
      }),
    }),
  };

  const sentMessages: any[] = [];
  const mockTelegram: TelegramSender = {
    sendMessage: async (chatId, text, other) => {
      sentMessages.push({ chatId, text, other });
      return { ok: true };
    },
  };

  const mockAi: any = {
    generateText: async (prompt: string) => {
      assert.ok(prompt.includes("напутствие"));
      return { result: "Важный звонок не терпит отлагательств!" };
    },
  };

  const result = await generateDailyDigest(mockDb, mockTelegram, mockAi);

  assert.equal(result.sent, 1);
  assert.equal(sentMessages.length, 1);
  const msg = sentMessages[0]?.text;
  assert.ok(msg.includes("🔥 *Позвонить научному руководителю* _(срочно)_"));
  assert.ok(msg.includes("Важный звонок"));
});

test("generateDailyDigest: isolates errors when sending fails for one user", async () => {
  const now = new Date();
  const user1: User = {
    id: "u-fail",
    telegramId: 7001,
    source: "organic",
    digestEnabled: true,
    lastDigestSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const user2: User = {
    id: "u-ok",
    telegramId: 7002,
    source: "organic",
    digestEnabled: true,
    lastDigestSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const task1: Task = {
    id: "t-1",
    userId: "u-fail",
    projectId: null,
    title: "Задача 1",
    description: null,
    status: "inbox",
    priority: "high",
    deadline: null,
    progress: 0,
    context: null,
    autonomyLevel: "suggest",
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    lastRemindedAt: null,
  };

  const task2: Task = {
    id: "t-2",
    userId: "u-ok",
    projectId: null,
    title: "Задача 2",
    description: null,
    status: "inbox",
    priority: "urgent",
    deadline: null,
    progress: 0,
    context: null,
    autonomyLevel: "suggest",
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    lastRemindedAt: null,
  };

  let selectCall = 0;
  const mockDb: any = {
    select: () => ({
      from: () => {
        selectCall++;
        if (selectCall === 1) return Promise.resolve([user1, user2]);
        if (selectCall === 2) return { where: async () => [task1] };
        return { where: async () => [task2] };
      },
    }),
    update: () => ({
      set: () => ({
        where: async () => [{ id: "u-ok" }],
      }),
    }),
  };

  const sentMessages: any[] = [];
  const mockTelegram: TelegramSender = {
    sendMessage: async (chatId, text, other) => {
      if (chatId === 7001) {
        throw new Error("Telegram 403: Bot was blocked by the user");
      }
      sentMessages.push({ chatId, text, other });
      return { ok: true };
    },
  };

  const mockAi: any = {
    generateText: async () => ({ result: "Напутствие" }),
  };

  const result = await generateDailyDigest(mockDb, mockTelegram, mockAi);

  assert.equal(result.scanned, 2);
  assert.equal(result.errors, 1); // User 1 logged error
  assert.equal(result.sent, 1);   // User 2 succeeded
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, 7002);
});
