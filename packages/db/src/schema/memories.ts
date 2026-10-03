import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  real,
  timestamp,
  index,
  vector,
} from "drizzle-orm/pg-core";
import { relations, sql, cosineDistance } from "drizzle-orm";
import { users } from "./users.js";
import { messages } from "./messages.js";

export { sql, cosineDistance };

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    content: text("content").notNull(),
    importance: integer("importance").notNull().default(1),
    confidence: real("confidence").notNull().default(1.0),
    source: varchar("source", { length: 255 }).default("conversation"),
    sourceMessageId: uuid("source_message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    embedding: vector("embedding", { dimensions: 768 }),
  },
  (table) => [
    index("memories_user_id_idx").on(table.userId),
    index("memories_user_id_type_idx").on(table.userId, table.type),
    index("memories_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);

export const memoriesRelations = relations(memories, ({ one }) => ({
  user: one(users, {
    fields: [memories.userId],
    references: [users.id],
  }),
  sourceMessage: one(messages, {
    fields: [memories.sourceMessageId],
    references: [messages.id],
  }),
}));
