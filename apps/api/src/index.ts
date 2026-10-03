import "dotenv/config";

import { buildServer } from "./app.js";
import { OrchestratorService } from "@mind/core";
import { setupBot } from "@mind/telegram";
import type { Bot } from "grammy";

async function start() {
  const app = buildServer();
  const port = Number(process.env["PORT"] || 3000);
  const host = process.env["HOST"] || "0.0.0.0";

  const orchestrator = new OrchestratorService();
  const telegramToken = process.env["TELEGRAM_BOT_TOKEN"];

  let bot: Bot | null = null;
  let isShuttingDown = false;

  if (telegramToken) {
    bot = setupBot(telegramToken, orchestrator);

    bot.catch((err) => {
      app.log.error({ err: err.error }, "Unhandled Telegram bot error");
    });

    // Start long-polling asynchronously without blocking Fastify startup
    bot
      .start({
        onStart: (botInfo) => {
          app.log.info(`Telegram bot started (polling) as @${botInfo.username}`);
        },
      })
      .catch((err: unknown) => {
        if (!isShuttingDown) {
          app.log.error({ err }, "Fatal Telegram bot error during polling");
        }
      });
  } else {
    app.log.warn("TELEGRAM_BOT_TOKEN is not set. Telegram bot will not start.");
  }

  try {
    await app.listen({ port, host });
    app.log.info(`MIND API listening on ${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    if (bot && bot.isInited()) {
      await bot.stop();
    }
    process.exit(1);
  }

  const closeGracefully = async (signal: string) => {
    isShuttingDown = true;
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    if (bot && bot.isInited()) {
      await bot.stop();
    }
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => closeGracefully("SIGINT"));
  process.on("SIGTERM", () => closeGracefully("SIGTERM"));
}

void start();
