import type { Citation } from "@mind/ai";

export type { Citation };

export type ExecutionStatus = "success" | "partial" | "failed";

export type ExecutionErrorCategory =
  | "invalid_request"
  | "validation_failure"
  | "authorization_failure"
  | "tool_failure"
  | "provider_failure"
  | "timeout"
  | "confirmation_required"
  | "artifact_failure"
  | "internal_error";

export interface ExecutionWarning {
  message: string;
  category?: string;
}

export interface ExecutionArtifact {
  name: string;
  content: string | Buffer;
}

export interface ExecutionRequest {
  telegramUserId: string | number;
  text: string;
  telegramChatId?: string | number;
  confirmedToolCalls?: string[];
}

export interface ExecutionResult {
  status: ExecutionStatus;
  response: string;
  artifacts: ExecutionArtifact[];
  createdTasks: string[];
  updatedMemories: string[];
  warnings: ExecutionWarning[];
  executionId: string;
  errorCategory?: ExecutionErrorCategory;
  citations?: Citation[];
}

export interface ExecutionPlanStep {
  id: string;
  type: "think" | "retrieve_context" | "tool_execution" | "generate_artifact" | "send_response";
  description: string;
  dependencies?: string[];
  requiredTools?: string[];
  status: "pending" | "running" | "success" | "failed";
}

export interface ExecutionPlan {
  goal: string;
  steps: ExecutionPlanStep[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  sideEffect: "none" | "internal_write" | "external_write";
  requiresConfirmation: boolean;
  execute: (args: any, context: any) => Promise<any>;
}
