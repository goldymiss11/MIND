import { Bot, type BotConfig, type Context, InlineKeyboard, InputFile, type Api } from "grammy";
import { db, tasks, users, memories, type MindDb } from "@mind/db";
import { eq, and, inArray, desc, asc, count } from "drizzle-orm";

export const BOT_COMMANDS = [
  { command: "start", description: "Запустить/Перезапустить" },
  { command: "tasks", description: "Мои активные задачи" },
  { command: "memory", description: "Последние воспоминания" },
];

export async function registerBotCommands(botOrApi: Bot | Api): Promise<void> {
  const api = "api" in botOrApi ? botOrApi.api : botOrApi;
  await api.setMyCommands(BOT_COMMANDS);
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[\]])/g, "\\$1");
}

/**
 * Interface representing the application service responsible for handling user messages.
 * Decouples transport layer (grammY) from domain/application business logic.
 */
export interface MessageHandler {
  handleIncomingMessage(
    userId: string,
    text: string,
    chatId?: string
  ): Promise<{ text: string; artifacts?: { name: string; content: string | Buffer }[]; citations?: any[] }>;
  ensureUser?(
    telegramUserId: string | number,
    source?: string
  ): Promise<any>;
}

export interface SetupBotOptions {
  webAppUrl?: string;
  config?: BotConfig<Context>;
  database?: MindDb;
  autoRegisterCommands?: boolean;
}

/**
 * Splits a text into chunks that fit within Telegram's message limit (4096 characters).
 * Default max chunk size is 4000 to leave headroom.
 * Splits on paragraph boundaries (\n\n), line breaks (\n), or whitespace when possible.
 */
export function splitTelegramMessage(text: string, maxLength = 4000): string[] {
  if (!text || text.length <= maxLength) {
    return [text || ""];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    let splitIdx = -1;

    // 1. Try splitting at paragraph boundary
    const paragraphIdx = remaining.lastIndexOf("\n\n", maxLength);
    if (paragraphIdx > maxLength * 0.3) {
      splitIdx = paragraphIdx + 2;
    } else {
      // 2. Try splitting at line break
      const lineIdx = remaining.lastIndexOf("\n", maxLength);
      if (lineIdx > maxLength * 0.3) {
        splitIdx = lineIdx + 1;
      } else {
        // 3. Try splitting at space/word boundary
        const spaceIdx = remaining.lastIndexOf(" ", maxLength);
        if (spaceIdx > maxLength * 0.3) {
          splitIdx = spaceIdx + 1;
        } else {
          // 4. Hard cut if no clean boundary
          splitIdx = maxLength;
        }
      }
    }

    const chunk = remaining.slice(0, splitIdx).trimEnd();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    remaining = remaining.slice(splitIdx).trimStart();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks.length > 0 ? chunks : [""];
}

/**
 * Initializes and configures the grammY Telegram Bot instance.
 * Strictly adheres to clean architecture: no direct database calls or business logic.
 */
export function setupBot(
  token: string,
  orchestrator: MessageHandler,
  configOrOptions?: BotConfig<Context> | SetupBotOptions
): Bot {
  if (!token) {
    throw new Error("Telegram bot token is required");
  }

  if (!orchestrator || typeof orchestrator.handleIncomingMessage !== "function") {
    throw new Error("Valid Orchestrator/MessageHandler instance is required for setupBot");
  }

  const options: SetupBotOptions =
    configOrOptions &&
    ("webAppUrl" in configOrOptions ||
      "config" in configOrOptions ||
      "database" in configOrOptions ||
      "autoRegisterCommands" in configOrOptions)
      ? (configOrOptions as SetupBotOptions)
      : { config: configOrOptions as BotConfig<Context> | undefined };

  const webAppUrl = options.webAppUrl;
  const config =
    options.config ??
    (configOrOptions && "botInfo" in configOrOptions
      ? (configOrOptions as BotConfig<Context>)
      : undefined);
  const database = options.database ?? db;

  const bot = new Bot(token, config);

  if (options.autoRegisterCommands) {
    registerBotCommands(bot).catch((err) => {
      console.warn("Could not register bot commands automatically:", err);
    });
  }

  // Command: /start
  bot.command("start", async (ctx) => {
    const fromId = ctx.from?.id;
    const match = typeof ctx.match === "string" ? ctx.match.trim() : "";
    const source = match ? match : "organic";

    let user: any = null;
    if (fromId && typeof orchestrator.ensureUser === "function") {
      try {
        user = await orchestrator.ensureUser(fromId, source);
      } catch (err) {
        console.error("Error ensuring user on /start:", err);
      }
    }

    if (!user && fromId) {
      try {
        const userRecords = await database
          .select()
          .from(users)
          .where(eq(users.telegramId, fromId))
          .limit(1);
        user = userRecords[0];
      } catch {
        // Fallback if db select is unavailable
      }
    }

    let memoryCount = -1;
    if (user?.id) {
      try {
        const memCount = await database
          .select({ count: count() })
          .from(memories)
          .where(eq(memories.userId, user.id));
        memoryCount = Number(memCount[0]?.count ?? 0);
      } catch (err) {
        console.error("Error querying memory count on /start:", err);
      }
    }

    if (memoryCount === 0) {
      const onboardingText =
        "Привет! Я MIND — твоя персональная AI-операционная система.\n\n" +
        "У меня пока нет информации о тебе. Расскажи, чем ты занимаешься, над какими проектами работаешь или какие у тебя главные цели на этот год? Я сохраню это в память, чтобы лучше понимать твой контекст.";
      if (webAppUrl) {
        const keyboard = new InlineKeyboard().webApp("Открыть MIND", webAppUrl);
        await ctx.reply(onboardingText, { reply_markup: keyboard });
      } else {
        await ctx.reply(onboardingText);
      }
      return;
    }

    if (webAppUrl) {
      const keyboard = new InlineKeyboard().webApp("Открыть MIND", webAppUrl);
      await ctx.reply(
        "Привет! Я MIND — твоя персональная AI-операционная система.\n\n" +
          "Нажми кнопку ниже, чтобы открыть приложение, или напиши мне любое сообщение.",
        { reply_markup: keyboard }
      );
    } else {
      await ctx.reply(
        "Привет! Я MIND — твоя персональная AI-операционная система.\n\n" +
          "Напиши мне что-нибудь, и я сохраню это в память."
      );
    }
  });

  // Command: /tasks
  bot.command("tasks", async (ctx) => {
    const fromId = ctx.from?.id;
    if (!fromId) return;

    try {
      const userRecords = await database
        .select()
        .from(users)
        .where(eq(users.telegramId, fromId))
        .limit(1);

      const user = userRecords[0];
      if (!user) {
        await ctx.reply("У вас нет активных задач.");
        return;
      }

      const userTasks = await database
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, user.id),
            inArray(tasks.status, ["inbox", "in_progress"])
          )
        )
        .orderBy(asc(tasks.deadline), desc(tasks.createdAt))
        .limit(10);

      if (userTasks.length === 0) {
        await ctx.reply("У вас нет активных задач.");
        return;
      }

      let message = "*📋 Ваши активные задачи:*\n\n";
      userTasks.forEach((task, index) => {
        const statusEmoji = task.status === "in_progress" ? "⏳" : "📥";
        const deadlineStr = task.deadline
          ? ` _(до ${new Date(task.deadline).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })})_`
          : "";
        message += `${index + 1}. ${statusEmoji} *${escapeMarkdown(task.title)}*${deadlineStr}\n`;
      });

      try {
        await ctx.reply(message, { parse_mode: "Markdown" });
      } catch {
        await ctx.reply(message);
      }
    } catch (error) {
      console.error("Error retrieving tasks:", error);
      await ctx.reply("Произошла ошибка при получении задач. Попробуйте позже.");
    }
  });

  // Command: /memory
  bot.command("memory", async (ctx) => {
    const fromId = ctx.from?.id;
    if (!fromId) return;

    try {
      const userRecords = await database
        .select()
        .from(users)
        .where(eq(users.telegramId, fromId))
        .limit(1);

      const user = userRecords[0];
      if (!user) {
        await ctx.reply("У вас пока нет сохранённых воспоминаний.");
        return;
      }

      const userMemories = await database
        .select()
        .from(memories)
        .where(eq(memories.userId, user.id))
        .orderBy(desc(memories.createdAt))
        .limit(5);

      if (userMemories.length === 0) {
        await ctx.reply("У вас пока нет сохранённых воспоминаний.");
        return;
      }

      let message = "*🧠 Последние воспоминания:*\n\n";
      userMemories.forEach((mem, index) => {
        const typeBadge = mem.type ? ` _[${escapeMarkdown(mem.type)}]_` : "";
        message += `${index + 1}. ${escapeMarkdown(mem.content)}${typeBadge}\n`;
      });

      try {
        await ctx.reply(message, { parse_mode: "Markdown" });
      } catch {
        await ctx.reply(message);
      }
    } catch (error) {
      console.error("Error retrieving memories:", error);
      await ctx.reply("Произошла ошибка при получении воспоминаний. Попробуйте позже.");
    }
  });

  // Command: /remind
  bot.command("remind", async (ctx) => {
    const fromId = ctx.from?.id;
    const match = typeof ctx.match === "string" ? ctx.match.trim() : "";
    if (!fromId) return;

    if (!match) {
      await ctx.reply("Пожалуйста, укажите текст напоминания. Например:\n/remind Позвонить врачу завтра в 15:00");
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");
      const { text: responseText } = await orchestrator.handleIncomingMessage(
        String(fromId),
        `Напомни мне: ${match}`,
        ctx.chat?.id !== undefined ? String(ctx.chat.id) : undefined
      );
      await ctx.reply(responseText?.trim() || "Напоминание создано.");
    } catch (error) {
      console.error("Error creating reminder via /remind:", error);
      await ctx.reply("Не удалось создать напоминание. Попробуйте позже.");
    }
  });

  // Callback query handler for interactive reminder buttons
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const fromId = ctx.from?.id;

    if (!fromId || !data) {
      await ctx.answerCallbackQuery().catch(() => {});
      return;
    }

    const colonIndex = data.indexOf(":");
    if (colonIndex === -1) {
      await ctx.answerCallbackQuery().catch(() => {});
      return;
    }

    const action = data.slice(0, colonIndex);
    const taskId = data.slice(colonIndex + 1);

    if (!["done", "snz1", "snzd"].includes(action) || !taskId) {
      await ctx.answerCallbackQuery().catch(() => {});
      return;
    }

    try {
      // 1. Verify user exists in DB
      const userRecords = await database
        .select()
        .from(users)
        .where(eq(users.telegramId, fromId))
        .limit(1);

      const user = userRecords[0];
      if (!user) {
        await ctx.answerCallbackQuery({ text: "Пользователь не найден" });
        return;
      }

      // 2. Verify task exists and user owns the task
      const taskRecords = await database
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
        .limit(1);

      const task = taskRecords[0];
      if (!task) {
        await ctx.answerCallbackQuery({ text: "Задача не найдена" });
        return;
      }

      // 3. Handle actions
      let feedbackText = "";
      const now = new Date();

      if (action === "done") {
        await database
          .update(tasks)
          .set({
            status: "completed",
            completedAt: now,
            updatedAt: now,
          })
          .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

        feedbackText = "✅ *Задача выполнена*";
      } else if (action === "snz1") {
        const newDeadline = new Date(Date.now() + 60 * 60 * 1000);
        await database
          .update(tasks)
          .set({
            deadline: newDeadline,
            lastRemindedAt: null,
            updatedAt: now,
          })
          .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

        feedbackText = "🔔 *Отложено на 1 час*";
      } else if (action === "snzd") {
        const newDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await database
          .update(tasks)
          .set({
            deadline: newDeadline,
            lastRemindedAt: null,
            updatedAt: now,
          })
          .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

        feedbackText = "🔔 *Отложено на завтра*";
      }

      // 4. Update reminder message, removing buttons
      try {
        await ctx.editMessageText(feedbackText, { parse_mode: "Markdown" });
      } catch {
        try {
          await ctx.editMessageText(feedbackText.replace(/\*/g, ""));
        } catch {
          // Ignore if message already deleted or not modifiable
        }
      }

      // 5. Always answer callback query
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error("Error handling callback query:", error);
      try {
        await ctx.answerCallbackQuery({ text: "Произошла ошибка" });
      } catch {
        // Ignore
      }
    }
  });

  // Listen to incoming voice messages
  bot.on("message:voice", async (ctx) => {
    const fromId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const voice = ctx.message.voice;

    if (!fromId || !voice) {
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");

      const file = await ctx.getFile();
      if (!file.file_path) {
        throw new Error("Telegram did not provide a file_path for voice message");
      }

      const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
      const audioResponse = await fetch(fileUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download voice file from Telegram: ${audioResponse.statusText}`);
      }

      const audioBlob = await audioResponse.blob();

      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        throw new Error("GROQ_API_KEY is not configured");
      }

      const formData = new FormData();
      formData.append("file", audioBlob, "audio.ogg");
      formData.append("model", "whisper-large-v3");
      formData.append("response_format", "json");

      const transcriptionResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text().catch(() => "");
        throw new Error(`Groq Whisper transcription failed (${transcriptionResponse.status}): ${errorText}`);
      }

      const transcriptionData = (await transcriptionResponse.json()) as { text?: string };
      const transcribedText = transcriptionData.text?.trim();

      if (!transcribedText) {
        await ctx.reply("Не удалось распознать голосовое сообщение. Попробуйте записать ещё раз.");
        return;
      }

      try {
        await ctx.reply(`🎤 _Распознано:_\n\n${transcribedText}`, { parse_mode: "Markdown" });
      } catch {
        await ctx.reply(`🎤 Распознано:\n\n${transcribedText}`);
      }

      await ctx.replyWithChatAction("typing");

      const { text: responseText, artifacts } = await orchestrator.handleIncomingMessage(
        String(fromId),
        transcribedText,
        chatId !== undefined ? String(chatId) : undefined
      );

      const messageContent = responseText?.trim() || "Готово";
      const chunks = splitTelegramMessage(messageContent, 4000);
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }

      if (artifacts && artifacts.length > 0) {
        for (const art of artifacts) {
          const buf = Buffer.isBuffer(art.content) ? art.content : Buffer.from(art.content);
          await ctx.replyWithDocument(new InputFile(buf, art.name));
        }
      }
    } catch (error) {
      console.error("Error processing Telegram voice message:", error);
      await ctx.reply("Произошла ошибка при обработке голосового сообщения. Попробуйте позже.");
    }
  });

  // Listen to incoming text messages
  bot.on("message:text", async (ctx) => {
    const fromId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const text = ctx.message.text;

    if (!fromId || !text) {
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");

      const { text: responseText, artifacts } = await orchestrator.handleIncomingMessage(
        String(fromId),
        text,
        chatId !== undefined ? String(chatId) : undefined
      );

      const messageContent = responseText?.trim() || "Готово";
      const chunks = splitTelegramMessage(messageContent, 4000);
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }

      if (artifacts && artifacts.length > 0) {
        for (const art of artifacts) {
          const buf = Buffer.isBuffer(art.content) ? art.content : Buffer.from(art.content);
          await ctx.replyWithDocument(new InputFile(buf, art.name));
        }
      }
    } catch (error) {
      console.error("Error processing Telegram message:", error);
      await ctx.reply("Произошла ошибка при обработке сообщения. Попробуйте позже.");
    }
  });

  return bot;
}
