import "dotenv/config";
import cron from "node-cron";
import { Api } from "grammy";
import { db } from "@mind/db";
import { checkAndSendReminders } from "./reminder.js";

export * from "./reminder.js";

const token = process.env["TELEGRAM_BOT_TOKEN"];
if (!token) {
  console.warn("⚠️ TELEGRAM_BOT_TOKEN is not set. Worker will not be able to deliver Telegram messages.");
}

const telegramApi = token ? new Api(token) : null;

// Cron schedule: defaults to every 5 minutes
const cronSchedule = process.env["REMINDER_CRON_SCHEDULE"] || "*/5 * * * *";

console.log(`[Proactive Worker] Starting MIND Proactive Engine Worker...`);
console.log(`[Proactive Worker] Initialized cron schedule: "${cronSchedule}"`);

const scheduledJob = cron.schedule(cronSchedule, async () => {
  console.log(`[Proactive Worker] [${new Date().toISOString()}] Scanning tasks for upcoming deadlines...`);
  try {
    const result = await checkAndSendReminders(db, telegramApi);
    console.log(
      `[Proactive Worker] [${new Date().toISOString()}] Scan completed: scanned=${result.scanned}, reminded=${result.reminded}, errors=${result.errors}`
    );
  } catch (error) {
    console.error("[Proactive Worker] Unhandled error during reminder scan:", error);
  }
});

let isShuttingDown = false;
const closeGracefully = (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Proactive Worker] Received ${signal}, stopping cron tasks and shutting down...`);
  scheduledJob.stop();
  process.exit(0);
};

process.on("SIGINT", () => closeGracefully("SIGINT"));
process.on("SIGTERM", () => closeGracefully("SIGTERM"));
