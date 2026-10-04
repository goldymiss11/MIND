import { Bot, type BotConfig, type Context, InlineKeyboard, InputFile } from "grammy";

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
    configOrOptions && ("webAppUrl" in configOrOptions || "config" in configOrOptions)
      ? (configOrOptions as SetupBotOptions)
      : { config: configOrOptions as BotConfig<Context> | undefined };

  const webAppUrl = options.webAppUrl;
  const config = options.config;

  const bot = new Bot(token, config);

  // Command: /start
  bot.command("start", async (ctx) => {
    const fromId = ctx.from?.id;
    const match = typeof ctx.match === "string" ? ctx.match.trim() : "";
    const source = match ? match : "organic";

    if (fromId && typeof orchestrator.ensureUser === "function") {
      try {
        await orchestrator.ensureUser(fromId, source);
      } catch (err) {
        console.error("Error ensuring user on /start:", err);
      }
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
