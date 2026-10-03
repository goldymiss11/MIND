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

import { Worker } from "bullmq";
import { Api } from "grammy";
import { db } from "@mind/db";
import { connection, queue, PROACTIVE_QUEUE_NAME } from "./queue.js";
import { processReminderJob, SCAN_REMINDERS_JOB_NAME } from "./reminder.js";

export * from "./reminder.js";
export * from "./queue.js";

const token = process.env["TELEGRAM_BOT_TOKEN"];
if (!token) {
  console.warn("⚠️ TELEGRAM_BOT_TOKEN is not set. Worker will not be able to deliver Telegram messages.");
}

export const telegramApi = token ? new Api(token) : null;

// Cron schedule: defaults to every 5 minutes
const cronSchedule = process.env["REMINDER_CRON_SCHEDULE"] || "*/5 * * * *";

console.log("[Proactive Worker] Starting MIND Proactive Engine Worker...");
console.log(`[Proactive Worker] Initialized queue: "${PROACTIVE_QUEUE_NAME}"`);

// Instantiate BullMQ Worker listening on "proactive-tasks"
export const worker = new Worker(
  PROACTIVE_QUEUE_NAME,
  async (job) => {
    console.log(`[Proactive Worker] [${new Date().toISOString()}] Processing job "${job.name}" (${job.id})...`);
    try {
      const result = await processReminderJob(job, db, telegramApi);
      if (result) {
        console.log(
          `[Proactive Worker] [${new Date().toISOString()}] Job "${job.name}" completed: scanned=${result.scanned}, reminded=${result.reminded}, errors=${result.errors}`
        );
      }
      return result;
    } catch (error) {
      console.error(`[Proactive Worker] Unhandled error during job "${job.name}":`, error);
      throw error;
    }
  },
  {
    connection,
  }
);

worker.on("failed", (job, error) => {
  console.error(`[Proactive Worker] Job ${job?.id} (${job?.name}) failed:`, error);
});

worker.on("error", (error) => {
  console.error("[Proactive Worker] Worker error:", error);
});

// Register repeatable task (cron) in Redis
await queue.add(
  SCAN_REMINDERS_JOB_NAME,
  {},
  {
    repeat: {
      pattern: cronSchedule,
    },
  }
);

console.log(`[Proactive Worker] Registered repeatable job "${SCAN_REMINDERS_JOB_NAME}" with pattern: "${cronSchedule}"`);

// Graceful shutdown handling
let isShuttingDown = false;
export const closeGracefully = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Proactive Worker] Received ${signal}, closing worker and Redis connection...`);

  try {
    await worker.close();
    await queue.close();
    await connection.quit();
    console.log("[Proactive Worker] Gracefully closed worker and Redis connection.");
    process.exit(0);
  } catch (error) {
    console.error("[Proactive Worker] Error during graceful shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => {
  void closeGracefully("SIGINT");
});
process.on("SIGTERM", () => {
  void closeGracefully("SIGTERM");
});
