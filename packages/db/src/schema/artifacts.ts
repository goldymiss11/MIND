import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users.js";
import { conversations } from "./conversations.js";
import { tasks } from "./tasks.js";

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(
      () => conversations.id,
      { onDelete: "cascade" }
    ),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    content: text("content"),
    storagePath: varchar("storage_path"),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("artifacts_user_id_idx").on(table.userId),
    index("artifacts_conversation_id_idx").on(table.conversationId),
    index("artifacts_task_id_idx").on(table.taskId),
    index("artifacts_created_at_idx").on(table.createdAt),
  ]
);

export const artifactsRelations = relations(artifacts, ({ one }) => ({
  user: one(users, {
    fields: [artifacts.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [artifacts.conversationId],
    references: [conversations.id],
  }),
  task: one(tasks, {
    fields: [artifacts.taskId],
    references: [tasks.id],
  }),
}));
