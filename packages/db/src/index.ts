import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import * as schema from "./schema/index.js";

const { Pool } = pg;

export type MindDb = NodePgDatabase<typeof schema>;

export interface DatabaseConfig {
  connectionString?: string;
  max?: number;
  ssl?: boolean | object;
}

/**
 * Factory function to create custom Drizzle database client and pool.
 */
export function createDatabaseClient(config?: DatabaseConfig): {
  db: MindDb;
  pool: pg.Pool;
} {
  const pool = new Pool({
    connectionString: config?.connectionString ?? process.env.DATABASE_URL,
    max: config?.max,
    ssl: config?.ssl,
  });

  const db = drizzle(pool, { schema });
  return { db, pool };
}

/**
 * Default connection pool and Drizzle ORM instance configured via DATABASE_URL.
 */
export const pool: pg.Pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db: MindDb = drizzle(pool, { schema });

// Export all schemas
export * from "./schema/index.js";
export { schema };

// Export Drizzle model inference helpers
export type { InferSelectModel, InferInsertModel };
export { cosineDistance, sql } from "drizzle-orm";

// Inferred table types
export type User = InferSelectModel<typeof schema.users>;
export type NewUser = InferInsertModel<typeof schema.users>;

export type Conversation = InferSelectModel<typeof schema.conversations>;
export type NewConversation = InferInsertModel<typeof schema.conversations>;

export type Message = InferSelectModel<typeof schema.messages>;
export type NewMessage = InferInsertModel<typeof schema.messages>;

export type Memory = InferSelectModel<typeof schema.memories>;
export type NewMemory = InferInsertModel<typeof schema.memories>;

export type AgentRun = InferSelectModel<typeof schema.agentRuns>;
export type NewAgentRun = InferInsertModel<typeof schema.agentRuns>;

export type Project = InferSelectModel<typeof schema.projects>;
export type NewProject = InferInsertModel<typeof schema.projects>;

export type Task = InferSelectModel<typeof schema.tasks>;
export type NewTask = InferInsertModel<typeof schema.tasks>;


