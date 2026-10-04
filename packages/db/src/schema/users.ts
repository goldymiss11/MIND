import { pgTable, uuid, bigint, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { conversations } from "./conversations.js";
import { memories } from "./memories.js";
import { agentRuns } from "./agent_runs.js";
import { projects } from "./projects.js";
import { tasks } from "./tasks.js";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  telegramId: bigint("telegram_id", { mode: "number" }).notNull().unique(),
  source: varchar("source").default("organic"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  memories: many(memories),
  agentRuns: many(agentRuns),
  projects: many(projects),
  tasks: many(tasks),
}));

