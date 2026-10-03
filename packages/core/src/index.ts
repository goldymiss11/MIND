import type { EntityId } from "@mind/shared";

/**
 * Autonomy levels for MIND actions as specified in GEMINI.md (#10 Autonomy).
 */
export type AutonomyLevel = "SUGGEST" | "CONFIRM" | "AUTONOMOUS";

/**
 * Core User entity representation.
 */
export interface User {
  id: EntityId;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * First-class memory types defined in GEMINI.md (#6 Memory).
 */
export type MemoryType =
  | "semantic"
  | "episodic"
  | "preference"
  | "task"
  | "project"
  | "relationship"
  | "decision"
  | "document"
  | "educational"
  | "professional";

/**
 * Core Memory entity representation.
 */
export interface Memory {
  id: EntityId;
  userId: EntityId;
  type: MemoryType;
  content: string;
  importance: number;
  confidence: number;
  source: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  embedding?: number[];
}

/**
 * Task lifecycle statuses.
 */
export type TaskStatus =
  | "inbox"
  | "in_progress"
  | "blocked"
  | "completed"
  | "cancelled";

/**
 * Task priority levels.
 */
export type TaskPriority = "low" | "normal" | "high" | "urgent";

/**
 * Core Task entity representation defined in GEMINI.md (#8 Tasks).
 */
export interface Task {
  id: EntityId;
  userId: EntityId;
  title: string;
  description?: string;
  deadline?: string;
  priority: TaskPriority;
  projectId?: EntityId;
  progress: number;
  dependencies: EntityId[];
  autonomyLevel: AutonomyLevel;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

// Application services
export * from "./types/execution.js";
export * from "./services/orchestrator.service.js";
export * from "@mind/memory";
