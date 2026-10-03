import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import dotenv from "dotenv";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

// Augment BullMQ BaseJobOptions to support repeat option on Queue.add
declare module "bullmq" {
  interface BaseJobOptions {
    repeat?: {
      pattern?: string;
      every?: number;
      limit?: number;
      key?: string;
      tz?: string;
    };
  }
}

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

export const REDIS_URL = process.env["REDIS_URL"] || "redis://localhost:6379";

export const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

connection.on("error", (err) => {
  console.error(`[Redis] Connection error on ${REDIS_URL}:`, err.message);
});

export const PROACTIVE_QUEUE_NAME = "proactive-tasks";

export const proactiveQueue = new Queue(PROACTIVE_QUEUE_NAME, {
  connection,
});

export const queue = proactiveQueue;
