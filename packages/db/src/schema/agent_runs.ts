import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users.js";

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 255 }).notNull(),
    model: varchar("model", { length: 255 }).notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agent_runs_user_id_idx").on(table.userId),
    index("agent_runs_created_at_idx").on(table.createdAt),
  ]
);

export const agentRunsRelations = relations(agentRuns, ({ one }) => ({
  user: one(users, {
    fields: [agentRuns.userId],
    references: [users.id],
  }),
}));
