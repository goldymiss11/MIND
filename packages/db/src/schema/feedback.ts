import { pgTable, uuid, bigint, varchar, text, timestamp } from "drizzle-orm/pg-core";

/** Users whose next message should be stored as feedback instead of going to the AI. */
export const feedbackSessions = pgTable("feedback_sessions", {
  telegramId: bigint("telegram_id", { mode: "number" }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const feedbacks = pgTable("feedbacks", {
  id: uuid("id").defaultRandom().primaryKey(),
  telegramId: bigint("telegram_id", { mode: "number" }).notNull(),
  username: varchar("username", { length: 255 }),
  text: text("text").notNull(),
  source: varchar("source", { length: 64 }).default("broadcast"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
