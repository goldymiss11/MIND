import type { MindDb } from "@mind/db";
import type { AiService, TokenUsage } from "@mind/ai";

export interface ExtractedMemoryItem {
  type: string;
  content: string;
  importance?: number;
  confidence?: number;
}

export interface MemoryContextPack {
  memories: Array<{
    id: string;
    type: string;
    content: string;
    importance: number;
    createdAt?: Date | string;
    distance?: number | null;
  }>;
  formattedText: string;
}

export type LogAiRunFn = (
  userId: string,
  action: string,
  aiResponse: { model: string; usage?: TokenUsage }
) => Promise<void>;

export interface SaveMemoriesOptions {
  logAiRun?: LogAiRunFn;
  sourceMessageId?: string | null;
}

export interface MemoryServiceOptions {
  db?: MindDb;
  ai?: AiService;
  deduplicationThreshold?: number;
}
