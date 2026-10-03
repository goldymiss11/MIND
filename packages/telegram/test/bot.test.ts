import { test } from "node:test";
import assert from "node:assert/strict";
import { setupBot, splitTelegramMessage, type MessageHandler } from "../src/bot.js";
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


