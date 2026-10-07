import { test } from "node:test";
import assert from "node:assert/strict";
import {
  setupBot,
  splitTelegramMessage,
  registerBotCommands,
  BOT_COMMANDS,
  type MessageHandler,
} from "../src/bot.js";
import { Bot } from "grammy";

const testBotInfo = {
  id: 1234567,
  is_bot: true as const,
  first_name: "MindTestBot",
  username: "MindTestBot",
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
};

test("setupBot: requires token and valid orchestrator", () => {
  assert.throws(
    () => setupBot("", {} as any),
    { message: /Telegram bot token is required/ }
  );

  assert.throws(
    () => setupBot("dummy-token", null as any),
    { message: /Valid Orchestrator\/MessageHandler instance is required/ }
  );
});

test("setupBot: initializes bot instance properly", () => {
  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: "ok" }),
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator);
  assert.ok(bot instanceof Bot);
});

test("setupBot: dispatches message:text to orchestrator and replies with response", async () => {
  let calledUser = "";
  let calledText = "";
  let calledChat = "";

  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async (userId, text, chatId) => {
      calledUser = String(userId);
      calledText = text;
      calledChat = String(chatId);
      return { text: "Сообщение получено и сохранено в БД." };
    },
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
  });

  // Mock outbound Telegram API calls
  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: { message_id: 123 } as any };
  });

  await bot.handleUpdate({
    update_id: 1,
    message: {
      message_id: 10,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 998877, type: "private" },
      from: { id: 112233, is_bot: false, first_name: "Alex" },
      text: "Test incoming message",
    },
  } as any);

  assert.equal(calledUser, "112233");
  assert.equal(calledText, "Test incoming message");
  assert.equal(calledChat, "998877");

  assert.equal(outboundCalls.length, 2);
  assert.equal(outboundCalls[0]?.method, "sendChatAction");
  assert.equal(outboundCalls[0]?.payload.action, "typing");
  assert.equal(outboundCalls[1]?.method, "sendMessage");
  assert.equal(outboundCalls[1]?.payload.text, "Сообщение получено и сохранено в БД.");
});

test("setupBot: sends fallback response when orchestrator returns empty text", async () => {
  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: "   " }),
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
  });

  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: { message_id: 125 } as any };
  });

  await bot.handleUpdate({
    update_id: 3,
    message: {
      message_id: 12,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 998877, type: "private" },
      from: { id: 112233, is_bot: false, first_name: "Alex" },
      text: "Empty reply test",
    },
  } as any);

  assert.equal(outboundCalls.length, 2);
  assert.equal(outboundCalls[0]?.method, "sendChatAction");
  assert.equal(outboundCalls[0]?.payload.action, "typing");
  assert.equal(outboundCalls[1]?.method, "sendMessage");
  assert.equal(outboundCalls[1]?.payload.text, "Готово");
});

test("setupBot: handles /start command", async () => {
  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: "ok" }),
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
  });

  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: { message_id: 124 } as any };
  });

  await bot.handleUpdate({
    update_id: 2,
    message: {
      message_id: 11,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 998877, type: "private" },
      from: { id: 112233, is_bot: false, first_name: "Alex" },
      text: "/start",
      entities: [{ type: "bot_command", offset: 0, length: 6 }],
    },
  } as any);

  assert.equal(outboundCalls.length, 1);
  assert.equal(outboundCalls[0]?.method, "sendMessage");
  assert.match(outboundCalls[0]?.payload.text, /Привет! Я MIND/);
});

test("setupBot: handles /start command with webAppUrl and provides inline keyboard", async () => {
  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: "ok" }),
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    webAppUrl: "https://mind-app.local",
    config: { botInfo: testBotInfo },
  });

  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: { message_id: 129 } as any };
  });

  await bot.handleUpdate({
    update_id: 20,
    message: {
      message_id: 111,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 998877, type: "private" },
      from: { id: 112233, is_bot: false, first_name: "Alex" },
      text: "/start",
      entities: [{ type: "bot_command", offset: 0, length: 6 }],
    },
  } as any);

  assert.equal(outboundCalls.length, 1);
  assert.equal(outboundCalls[0]?.method, "sendMessage");
  assert.match(outboundCalls[0]?.payload.text, /Нажми кнопку ниже/);
  assert.ok(outboundCalls[0]?.payload.reply_markup?.inline_keyboard);
  const inlineButtons = outboundCalls[0]?.payload.reply_markup.inline_keyboard[0];
  assert.equal(inlineButtons[0].text, "Открыть MIND");
  assert.equal(inlineButtons[0].web_app.url, "https://mind-app.local");
});

test("setupBot: dispatches message:text and sends documents if artifacts are returned", async () => {
  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({
      text: "Вот ваш документ",
      artifacts: [
        { name: "document.md", content: "# Hello World" },
        { name: "notes.txt", content: "Some notes" },
      ],
    }),
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
  });

  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: { message_id: 130 } as any };
  });

  await bot.handleUpdate({
    update_id: 4,
    message: {
      message_id: 15,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 998877, type: "private" },
      from: { id: 112233, is_bot: false, first_name: "Alex" },
      text: "Сделай документ",
    },
  } as any);

  assert.equal(outboundCalls.length, 4);
  assert.equal(outboundCalls[0]?.method, "sendChatAction");
  assert.equal(outboundCalls[1]?.method, "sendMessage");
  assert.equal(outboundCalls[1]?.payload.text, "Вот ваш документ");
  assert.equal(outboundCalls[2]?.method, "sendDocument");
  assert.ok(outboundCalls[2]?.payload.document);
  assert.equal(outboundCalls[3]?.method, "sendDocument");
  assert.ok(outboundCalls[3]?.payload.document);
});

test("splitTelegramMessage: splits text exceeding maxLength cleanly without losing data", () => {
  const shortText = "Короткий ответ";
  assert.deepEqual(splitTelegramMessage(shortText, 4000), ["Короткий ответ"]);

  // Paragraph splitting test
  const p1 = "A".repeat(3000);
  const p2 = "B".repeat(2000);
  const fullText = `${p1}\n\n${p2}`;
  const chunks = splitTelegramMessage(fullText, 4000);

  assert.equal(chunks.length, 2);
  assert.equal(chunks[0], p1);
  assert.equal(chunks[1], p2);
  assert.ok(chunks[0]!.length <= 4000);
  assert.ok(chunks[1]!.length <= 4000);

  // Hard boundary splitting test
  const longWord = "X".repeat(9000);
  const wordChunks = splitTelegramMessage(longWord, 4000);
  assert.equal(wordChunks.length, 3);
  assert.equal(wordChunks[0]!.length, 4000);
  assert.equal(wordChunks[1]!.length, 4000);
  assert.equal(wordChunks[2]!.length, 1000);
});

test("setupBot: splits message and sends multiple replies when text exceeds 4000 characters", async () => {
  const p1 = "First part: " + "1".repeat(3000);
  const p2 = "Second part: " + "2".repeat(2000);
  const longResponse = `${p1}\n\n${p2}`;

  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: longResponse }),
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
  });

  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: { message_id: 135 } as any };
  });

  await bot.handleUpdate({
    update_id: 5,
    message: {
      message_id: 16,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 998877, type: "private" },
      from: { id: 112233, is_bot: false, first_name: "Alex" },
      text: "Explain quantum mechanics in detail",
    },
  } as any);

  // Expect sendChatAction + 2 separate sendMessage calls
  assert.equal(outboundCalls.length, 3);
  assert.equal(outboundCalls[0]?.method, "sendChatAction");
  assert.equal(outboundCalls[1]?.method, "sendMessage");
  assert.equal(outboundCalls[2]?.method, "sendMessage");
  assert.equal(outboundCalls[1]?.payload.text, p1);
  assert.equal(outboundCalls[2]?.payload.text, p2);
});

test("setupBot: delivers research grounded response with formatted sources block", async () => {
  const researchText = "Quantum computers use qubits.\n\nИсточники:\n• Nature Quantum — https://nature.com/articles/quantum\n• Science Daily — https://sciencedaily.com/quantum";
  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({
      text: researchText,
      citations: [
        { title: "Nature Quantum", url: "https://nature.com/articles/quantum" },
        { title: "Science Daily", url: "https://sciencedaily.com/quantum" }
      ]
    }),
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
  });

  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: { message_id: 136 } as any };
  });

  await bot.handleUpdate({
    update_id: 6,
    message: {
      message_id: 17,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 998877, type: "private" },
      from: { id: 112233, is_bot: false, first_name: "Alex" },
      text: "Как работают квантовые компьютеры?",
    },
  } as any);

  assert.equal(outboundCalls.length, 2);
  assert.equal(outboundCalls[0]?.method, "sendChatAction");
  assert.equal(outboundCalls[1]?.method, "sendMessage");
  assert.equal(outboundCalls[1]?.payload.text, researchText);
  assert.ok(outboundCalls[1]?.payload.text.includes("Источники:"));
});

test("setupBot: /start command captures referral code via ctx.match", async () => {
  let capturedUserId = "";
  let capturedSource = "";

  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: "ok" }),
    ensureUser: async (userId, source) => {
      capturedUserId = String(userId);
      capturedSource = String(source);
    },
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
  });

  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: { message_id: 140 } as any };
  });

  await bot.handleUpdate({
    update_id: 7,
    message: {
      message_id: 18,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 998877, type: "private" },
      from: { id: 445566, is_bot: false, first_name: "Founder" },
      text: "/start founder",
      entities: [{ type: "bot_command", offset: 0, length: 6 }],
    },
  } as any);

  assert.equal(capturedUserId, "445566");
  assert.equal(capturedSource, "founder");
  assert.equal(outboundCalls.length, 1);
  assert.match(outboundCalls[0]?.payload.text, /Привет! Я MIND/);
});

test("setupBot: /start command defaults to organic if no referral payload", async () => {
  let capturedUserId = "";
  let capturedSource = "";

  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: "ok" }),
    ensureUser: async (userId, source) => {
      capturedUserId = String(userId);
      capturedSource = String(source);
    },
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
  });

  bot.api.config.use(async (_prev, method, payload) => {
    return { ok: true, result: { message_id: 141 } as any };
  });

  await bot.handleUpdate({
    update_id: 8,
    message: {
      message_id: 19,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 998877, type: "private" },
      from: { id: 778899, is_bot: false, first_name: "OrganicUser" },
      text: "/start",
      entities: [{ type: "bot_command", offset: 0, length: 6 }],
    },
  } as any);

  assert.equal(capturedUserId, "778899");
  assert.equal(capturedSource, "organic");
});

test("registerBotCommands: calls setMyCommands with /start, /tasks, and /memory", async () => {
  const outboundCalls: Array<{ method: string; payload: any }> = [];
  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: "ok" }),
  };
  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
  });

  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: true as any };
  });

  await registerBotCommands(bot);

  assert.equal(outboundCalls.length, 1);
  assert.equal(outboundCalls[0]?.method, "setMyCommands");
  assert.deepEqual(outboundCalls[0]?.payload.commands, [
    { command: "start", description: "Запустить/Перезапустить" },
    { command: "tasks", description: "Мои активные задачи" },
    { command: "memory", description: "Последние воспоминания" },
  ]);
});

test("setupBot: handles /tasks command when user has no active tasks", async () => {
  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: "ok" }),
  };

  const mockDb: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: "user-uuid-1", telegramId: 112233 }],
          orderBy: () => ({
            limit: async () => [],
          }),
        }),
      }),
    }),
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
    database: mockDb,
  });

  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: { message_id: 201 } as any };
  });

  await bot.handleUpdate({
    update_id: 101,
    message: {
      message_id: 20,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 998877, type: "private" },
      from: { id: 112233, is_bot: false, first_name: "Alex" },
      text: "/tasks",
      entities: [{ type: "bot_command", offset: 0, length: 6 }],
    },
  } as any);

  assert.equal(outboundCalls.length, 1);
  assert.equal(outboundCalls[0]?.method, "sendMessage");
  assert.equal(outboundCalls[0]?.payload.text, "У вас нет активных задач.");
});

test("setupBot: handles /tasks command and formats active tasks list in Markdown", async () => {
  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: "ok" }),
  };

  const sampleTasks = [
    {
      id: "task-uuid-1",
      userId: "user-uuid-1",
      title: "Сдать отчет",
      status: "in_progress",
      deadline: new Date("2026-10-10T12:00:00Z"),
      createdAt: new Date("2026-10-01T10:00:00Z"),
    },
    {
      id: "task-uuid-2",
      userId: "user-uuid-1",
      title: "Купить билеты",
      status: "inbox",
      deadline: null,
      createdAt: new Date("2026-10-02T10:00:00Z"),
    },
  ];

  const mockDb: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: "user-uuid-1", telegramId: 112233 }],
          orderBy: () => ({
            limit: async () => sampleTasks,
          }),
        }),
      }),
    }),
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
    database: mockDb,
  });

  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: { message_id: 202 } as any };
  });

  await bot.handleUpdate({
    update_id: 102,
    message: {
      message_id: 21,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 998877, type: "private" },
      from: { id: 112233, is_bot: false, first_name: "Alex" },
      text: "/tasks",
      entities: [{ type: "bot_command", offset: 0, length: 6 }],
    },
  } as any);

  assert.equal(outboundCalls.length, 1);
  assert.equal(outboundCalls[0]?.method, "sendMessage");
  assert.ok(outboundCalls[0]?.payload.text.includes("Ваши активные задачи"));
  assert.ok(outboundCalls[0]?.payload.text.includes("Сдать отчет"));
  assert.ok(outboundCalls[0]?.payload.text.includes("Купить билеты"));
  assert.equal(outboundCalls[0]?.payload.parse_mode, "Markdown");
});

test("setupBot: handles /memory command when user has no memories", async () => {
  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: "ok" }),
  };

  const mockDb: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: "user-uuid-1", telegramId: 112233 }],
          orderBy: () => ({
            limit: async () => [],
          }),
        }),
      }),
    }),
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
    database: mockDb,
  });

  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: { message_id: 203 } as any };
  });

  await bot.handleUpdate({
    update_id: 103,
    message: {
      message_id: 22,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 998877, type: "private" },
      from: { id: 112233, is_bot: false, first_name: "Alex" },
      text: "/memory",
      entities: [{ type: "bot_command", offset: 0, length: 7 }],
    },
  } as any);

  assert.equal(outboundCalls.length, 1);
  assert.equal(outboundCalls[0]?.method, "sendMessage");
  assert.equal(outboundCalls[0]?.payload.text, "У вас пока нет сохранённых воспоминаний.");
});

test("setupBot: handles /memory command and formats recent memories in Markdown", async () => {
  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: "ok" }),
  };

  const sampleMemories = [
    {
      id: "mem-1",
      userId: "user-uuid-1",
      content: "Любимый цвет синий",
      type: "preference",
      createdAt: new Date("2026-10-05T10:00:00Z"),
    },
    {
      id: "mem-2",
      userId: "user-uuid-1",
      content: "Работает над стартапом MIND",
      type: "project",
      createdAt: new Date("2026-10-06T10:00:00Z"),
    },
  ];

  const mockDb: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: "user-uuid-1", telegramId: 112233 }],
          orderBy: () => ({
            limit: async () => sampleMemories,
          }),
        }),
      }),
    }),
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
    database: mockDb,
  });

  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: { message_id: 204 } as any };
  });

  await bot.handleUpdate({
    update_id: 104,
    message: {
      message_id: 23,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 998877, type: "private" },
      from: { id: 112233, is_bot: false, first_name: "Alex" },
      text: "/memory",
      entities: [{ type: "bot_command", offset: 0, length: 7 }],
    },
  } as any);

  assert.equal(outboundCalls.length, 1);
  assert.equal(outboundCalls[0]?.method, "sendMessage");
  assert.ok(outboundCalls[0]?.payload.text.includes("Последние воспоминания"));
  assert.ok(outboundCalls[0]?.payload.text.includes("Любимый цвет синий"));
  assert.ok(outboundCalls[0]?.payload.text.includes("Работает над стартапом MIND"));
  assert.equal(outboundCalls[0]?.payload.parse_mode, "Markdown");
});

test("setupBot: handles callback_query done action to mark task completed and edit message", async () => {
  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: "ok" }),
  };

  let updatedStatus = "";
  let updatedCompletedAt: any = null;

  const mockDb: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            return [{ id: "task-uuid-abc", userId: "user-uuid-1", telegramId: 112233, title: "Купить хлеб" }];
          },
        }),
      }),
    }),
    update: () => ({
      set: (values: any) => {
        updatedStatus = values.status;
        updatedCompletedAt = values.completedAt;
        return {
          where: async () => [{ id: "task-uuid-abc" }],
        };
      },
    }),
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
    database: mockDb,
  });

  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: true as any };
  });

  await bot.handleUpdate({
    update_id: 105,
    callback_query: {
      id: "cb-1",
      from: { id: 112233, is_bot: false, first_name: "Alex" },
      message: {
        message_id: 55,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 998877, type: "private" },
        text: "🔔 Напоминание: Приближается дедлайн",
      },
      chat_instance: "inst-1",
      data: "done:task-uuid-abc",
    },
  } as any);

  assert.equal(updatedStatus, "completed");
  assert.ok(updatedCompletedAt instanceof Date);

  const editCall = outboundCalls.find((c) => c.method === "editMessageText");
  const answerCall = outboundCalls.find((c) => c.method === "answerCallbackQuery");

  assert.ok(editCall, "editMessageText should be called");
  assert.ok(editCall?.payload.text.includes("Задача выполнена"));
  assert.ok(answerCall, "answerCallbackQuery should be called");
});

test("setupBot: handles callback_query snz1 action to postpone task deadline by 1 hour", async () => {
  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: "ok" }),
  };

  let updatedDeadline: Date | null = null;
  let updatedLastRemindedAt: any = "not_null";

  const mockDb: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: "task-uuid-abc", userId: "user-uuid-1", telegramId: 112233 }],
        }),
      }),
    }),
    update: () => ({
      set: (values: any) => {
        updatedDeadline = values.deadline;
        updatedLastRemindedAt = values.lastRemindedAt;
        return {
          where: async () => [{ id: "task-uuid-abc" }],
        };
      },
    }),
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
    database: mockDb,
  });

  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: true as any };
  });

  const beforeTime = Date.now();
  await bot.handleUpdate({
    update_id: 106,
    callback_query: {
      id: "cb-2",
      from: { id: 112233, is_bot: false, first_name: "Alex" },
      message: {
        message_id: 56,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 998877, type: "private" },
        text: "🔔 Напоминание: Приближается дедлайн",
      },
      chat_instance: "inst-1",
      data: "snz1:task-uuid-abc",
    },
  } as any);

  assert.ok(updatedDeadline instanceof Date);
  const diffMs = (updatedDeadline as Date).getTime() - beforeTime;
  assert.ok(diffMs >= 59 * 60 * 1000 && diffMs <= 61 * 60 * 1000);
  assert.equal(updatedLastRemindedAt, null);

  const editCall = outboundCalls.find((c) => c.method === "editMessageText");
  const answerCall = outboundCalls.find((c) => c.method === "answerCallbackQuery");
  assert.ok(editCall);
  assert.ok(editCall?.payload.text.includes("Отложено"));
  assert.ok(answerCall);
});

test("setupBot: handles callback_query snzd action to postpone task deadline by 24 hours", async () => {
  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: "ok" }),
  };

  let updatedDeadline: Date | null = null;
  let updatedLastRemindedAt: any = "not_null";

  const mockDb: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: "task-uuid-abc", userId: "user-uuid-1", telegramId: 112233 }],
        }),
      }),
    }),
    update: () => ({
      set: (values: any) => {
        updatedDeadline = values.deadline;
        updatedLastRemindedAt = values.lastRemindedAt;
        return {
          where: async () => [{ id: "task-uuid-abc" }],
        };
      },
    }),
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
    database: mockDb,
  });

  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: true as any };
  });

  const beforeTime = Date.now();
  await bot.handleUpdate({
    update_id: 107,
    callback_query: {
      id: "cb-3",
      from: { id: 112233, is_bot: false, first_name: "Alex" },
      message: {
        message_id: 57,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 998877, type: "private" },
        text: "🔔 Напоминание: Приближается дедлайн",
      },
      chat_instance: "inst-1",
      data: "snzd:task-uuid-abc",
    },
  } as any);

  assert.ok(updatedDeadline instanceof Date);
  const diffMs = (updatedDeadline as Date).getTime() - beforeTime;
  assert.ok(diffMs >= 23 * 60 * 60 * 1000 && diffMs <= 25 * 60 * 60 * 1000);
  assert.equal(updatedLastRemindedAt, null);

  const editCall = outboundCalls.find((c) => c.method === "editMessageText");
  const answerCall = outboundCalls.find((c) => c.method === "answerCallbackQuery");
  assert.ok(editCall);
  assert.ok(editCall?.payload.text.includes("Отложено"));
  assert.ok(answerCall);
});

test("setupBot: rejects callback_query when task is not owned by user", async () => {
  const mockOrchestrator: MessageHandler = {
    handleIncomingMessage: async () => ({ text: "ok" }),
  };

  let selectCallCount = 0;

  const mockDb: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            selectCallCount++;
            if (selectCallCount === 1) {
              return [{ id: "user-uuid-1", telegramId: 112233 }];
            }
            return [];
          },
        }),
      }),
    }),
    update: () => {
      throw new Error("Should not update DB when task is not owned by user");
    },
  };

  const bot = setupBot("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", mockOrchestrator, {
    botInfo: testBotInfo,
    database: mockDb,
  });

  const outboundCalls: Array<{ method: string; payload: any }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    outboundCalls.push({ method, payload });
    return { ok: true, result: true as any };
  });

  await bot.handleUpdate({
    update_id: 108,
    callback_query: {
      id: "cb-4",
      from: { id: 112233, is_bot: false, first_name: "Alex" },
      message: {
        message_id: 58,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 998877, type: "private" },
        text: "🔔 Напоминание",
      },
      chat_instance: "inst-1",
      data: "done:alien-task-id",
    },
  } as any);

  const answerCall = outboundCalls.find((c) => c.method === "answerCallbackQuery");
  assert.ok(answerCall);
  assert.equal(answerCall?.payload.text, "Задача не найдена");
  const editCall = outboundCalls.find((c) => c.method === "editMessageText");
  assert.equal(editCall, undefined);
});
