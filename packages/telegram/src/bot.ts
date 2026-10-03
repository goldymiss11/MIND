import { Bot, type BotConfig, type Context, InputFile } from "grammy";

/**
 * Interface representing the application service responsible for handling user messages.
 * Decouples transport layer (grammY) from domain/application business logic.
 */
export interface MessageHandler {
  handleIncomingMessage(
    userId: string,
    text: string,
    chatId?: string
  ): Promise<{ text: string; artifacts?: { name: string; content: string }[] }>;
}

/**
 * Initializes and configures the grammY Telegram Bot instance.
 * Strictly adheres to clean architecture: no direct database calls or business logic.
 */
export function setupBot(
  token: string,
  orchestrator: MessageHandler,
  config?: BotConfig<Context>
): Bot {
  if (!token) {
    throw new Error("Telegram bot token is required");
  }

  if (!orchestrator || typeof orchestrator.handleIncomingMessage !== "function") {
    throw new Error("Valid Orchestrator/MessageHandler instance is required for setupBot");
  }

  const bot = new Bot(token, config);

  // Command: /start
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Привет! Я MIND — твоя персональная AI-операционная система.\n\n" +
        "Напиши мне что-нибудь, и я сохраню это в память."
    );
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

      await ctx.reply(responseText?.trim() || "Готово");

      if (artifacts && artifacts.length > 0) {
        for (const art of artifacts) {
          await ctx.replyWithDocument(new InputFile(Buffer.from(art.content), art.name));
        }
      }
    } catch (error) {
      console.error("Error processing Telegram message:", error);
      await ctx.reply("Произошла ошибка при обработке сообщения. Попробуйте позже.");
    }
  });

  return bot;
}
