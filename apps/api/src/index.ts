import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve root .env path reliably regardless of execution working directory
const rootEnvPath =
  (process.env["DOTENV_CONFIG_PATH"] && fs.existsSync(process.env["DOTENV_CONFIG_PATH"])
    ? process.env["DOTENV_CONFIG_PATH"]
    : undefined) ??
  [
    path.resolve(__dirname, "../../../.env"),
    path.resolve(__dirname, "../../.env"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env"),
  ].find((candidate) => fs.existsSync(candidate)) ??
  path.resolve(__dirname, "../../../.env");

dotenv.config({ path: rootEnvPath });

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

  const webAppUrl = process.env["WEBAPP_URL"] || process.env["MINI_APP_URL"];

  if (telegramToken) {
    bot = setupBot(telegramToken, orchestrator, { webAppUrl });

    bot.catch((err) => {
      app.log.error({ err: err.error }, "Unhandled Telegram bot error");
    });

    // Start long-polling asynchronously without blocking Fastify startup
    bot
      .start({
        onStart: async (botInfo) => {
          app.log.info(`Telegram bot started (polling) as @${botInfo.username}`);
          if (webAppUrl) {
            try {
              await bot?.api.setChatMenuButton({
                menu_button: {
                  type: "web_app",
                  text: "MIND",
                  web_app: { url: webAppUrl },
                },
              });
              app.log.info(`Telegram chat menu button configured with WebApp URL: ${webAppUrl}`);
            } catch (menuErr) {
              app.log.warn({ err: menuErr }, "Could not automatically set chat menu button in Telegram");
            }
          }
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

  const redisUrl = process.env["REDIS_URL"];
  let stopWorkerFn: (() => Promise<void>) | null = null;

  if (redisUrl) {
    try {
      const { startWorker } = await import("@mind/worker");
      const workerInstance = await startWorker();
      stopWorkerFn = workerInstance.close;
      app.log.info("Proactive background worker started within API process");
    } catch (err) {
      app.log.error({ err }, "Failed to initialize embedded proactive worker");
    }
  } else {
    app.log.info("REDIS_URL is not set. Embedded proactive worker will not start.");
  }

  // Periodic proactive reminder ticker (every 60 seconds)
  let reminderInterval: NodeJS.Timeout | null = null;
  if (bot) {
    const { scanReminders } = await import("@mind/worker");
    const { db } = await import("@mind/db");
    reminderInterval = setInterval(async () => {
      try {
        if (bot?.api) {
          await scanReminders(db, bot.api);
        }
      } catch (scanErr) {
        app.log.warn({ err: scanErr }, "Periodic scanReminders encountered error");
      }
    }, 60000);
    setTimeout(() => {
      if (bot?.api) {
        scanReminders(db, bot.api).catch((err) => app.log.warn({ err }, "Initial scanReminders error"));
      }
    }, 5000);
    app.log.info("Proactive reminder heartbeat active (60s interval)");
  }

  try {
    await app.listen({ port, host });
    app.log.info(`MIND API listening on ${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    if (reminderInterval) {
      clearInterval(reminderInterval);
    }
    if (stopWorkerFn) {
      await stopWorkerFn().catch(() => {});
    }
    if (bot && bot.isInited()) {
      await bot.stop();
    }
    process.exit(1);
  }

  const closeGracefully = async (signal: string) => {
    isShuttingDown = true;
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    if (reminderInterval) {
      clearInterval(reminderInterval);
    }
    if (stopWorkerFn) {
      try {
        await stopWorkerFn();
      } catch (err) {
        app.log.error({ err }, "Error closing embedded worker");
      }
    }
    if (bot && bot.isInited()) {
      await bot.stop();
    }
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void closeGracefully("SIGINT"));
  process.on("SIGTERM", () => void closeGracefully("SIGTERM"));
}

void start();
