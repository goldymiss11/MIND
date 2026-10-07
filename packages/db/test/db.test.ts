import { test } from "node:test";
import assert from "node:assert/strict";
import {
  db,
  pool,
  createDatabaseClient,
  users,
  conversations,
  messages,
  memories,
  agentRuns,
  projects,
  tasks,
  artifacts,
} from "../src/index.js";
import { getTableColumns } from "drizzle-orm";

test("@mind/db exports database instance and pool", () => {
  assert.ok(db, "db instance should be exported");
  assert.ok(pool, "pool instance should be exported");
  assert.equal(typeof createDatabaseClient, "function", "createDatabaseClient should be a function");
});

test("@mind/db exports table schemas with required columns", () => {
  // Users table
  const userCols = getTableColumns(users);
  assert.ok(userCols.id, "users.id column should exist");
  assert.ok(userCols.telegramId, "users.telegram_id column should exist");
  assert.ok(userCols.createdAt, "users.created_at column should exist");
  assert.ok(userCols.updatedAt, "users.updated_at column should exist");

  // Conversations table
  const convCols = getTableColumns(conversations);
  assert.ok(convCols.id, "conversations.id column should exist");
  assert.ok(convCols.userId, "conversations.user_id column should exist");
  assert.ok(convCols.telegramChatId, "conversations.telegram_chat_id column should exist");
  assert.ok(convCols.createdAt, "conversations.created_at column should exist");

  // Messages table
  const msgCols = getTableColumns(messages);
  assert.ok(msgCols.id, "messages.id column should exist");
  assert.ok(msgCols.conversationId, "messages.conversation_id column should exist");
  assert.ok(msgCols.role, "messages.role column should exist");
  assert.ok(msgCols.content, "messages.content column should exist");
  assert.ok(msgCols.createdAt, "messages.created_at column should exist");

  // Memories table
  const memCols = getTableColumns(memories);
  assert.ok(memCols.id, "memories.id column should exist");
  assert.ok(memCols.userId, "memories.user_id column should exist");
  assert.ok(memCols.type, "memories.type column should exist");
  assert.ok(memCols.content, "memories.content column should exist");
  assert.ok(memCols.importance, "memories.importance column should exist");
  assert.ok(memCols.confidence, "memories.confidence column should exist");
  assert.ok(memCols.sourceMessageId, "memories.source_message_id column should exist");
  assert.ok(memCols.embedding, "memories.embedding column should exist");
  assert.equal(memCols.embedding.columnType, "PgVector");
  assert.equal(memCols.embedding.dimensions, 768);

  // AgentRuns table
  const agentRunCols = getTableColumns(agentRuns);
  assert.ok(agentRunCols.id, "agent_runs.id column should exist");
  assert.ok(agentRunCols.userId, "agent_runs.user_id column should exist");
  assert.ok(agentRunCols.action, "agent_runs.action column should exist");
  assert.ok(agentRunCols.model, "agent_runs.model column should exist");
  assert.ok(agentRunCols.promptTokens, "agent_runs.prompt_tokens column should exist");
  assert.ok(agentRunCols.outputTokens, "agent_runs.output_tokens column should exist");
  assert.ok(agentRunCols.totalTokens, "agent_runs.total_tokens column should exist");
  assert.ok(agentRunCols.createdAt, "agent_runs.created_at column should exist");

  // Projects table
  const projectCols = getTableColumns(projects);
  assert.ok(projectCols.id, "projects.id column should exist");
  assert.ok(projectCols.userId, "projects.user_id column should exist");
  assert.ok(projectCols.name, "projects.name column should exist");
  assert.ok(projectCols.description, "projects.description column should exist");
  assert.ok(projectCols.status, "projects.status column should exist");
  assert.ok(projectCols.createdAt, "projects.created_at column should exist");
  assert.ok(projectCols.updatedAt, "projects.updated_at column should exist");

  // Tasks table
  const taskCols = getTableColumns(tasks);
  assert.ok(taskCols.id, "tasks.id column should exist");
  assert.ok(taskCols.userId, "tasks.user_id column should exist");
  assert.ok(taskCols.projectId, "tasks.project_id column should exist");
  assert.ok(taskCols.title, "tasks.title column should exist");
  assert.ok(taskCols.description, "tasks.description column should exist");
  assert.ok(taskCols.status, "tasks.status column should exist");
  assert.ok(taskCols.priority, "tasks.priority column should exist");
  assert.ok(taskCols.deadline, "tasks.deadline column should exist");
  assert.ok(taskCols.progress, "tasks.progress column should exist");
  assert.ok(taskCols.context, "tasks.context column should exist");
  assert.ok(taskCols.autonomyLevel, "tasks.autonomy_level column should exist");
  assert.ok(taskCols.createdAt, "tasks.created_at column should exist");
  assert.ok(taskCols.updatedAt, "tasks.updated_at column should exist");
  assert.ok(taskCols.completedAt, "tasks.completed_at column should exist");
  assert.ok(taskCols.lastRemindedAt, "tasks.last_reminded_at column should exist");

  // Artifacts table
  const artCols = getTableColumns(artifacts);
  assert.ok(artCols.id, "artifacts.id column should exist");
  assert.ok(artCols.userId, "artifacts.user_id column should exist");
  assert.ok(artCols.conversationId, "artifacts.conversation_id column should exist");
  assert.ok(artCols.name, "artifacts.name column should exist");
  assert.ok(artCols.type, "artifacts.type column should exist");
  assert.ok(artCols.content, "artifacts.content column should exist");
  assert.ok(artCols.storagePath, "artifacts.storage_path column should exist");
  assert.ok(artCols.taskId, "artifacts.task_id column should exist");
  assert.ok(artCols.createdAt, "artifacts.created_at column should exist");
  assert.ok(artCols.updatedAt, "artifacts.updated_at column should exist");
});

