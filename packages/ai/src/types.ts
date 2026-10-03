import type { GoogleGenAI } from "@google/genai";
import type { AiTaskTier } from "./models.js";

export interface TokenUsage {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens?: number;
}

export interface AiToolCall {
  id?: string;
  name: string;
  args: Record<string, any>;
}

export interface AiToolResponse {
  id?: string;
  name: string;
  response: any;
}

export interface AiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  toolCalls?: AiToolCall[];
  toolResponses?: AiToolResponse[];
  originalParts?: any[];
}

export interface Citation {
  title?: string;
  url: string;
  startIndex?: number;
  endIndex?: number;
}

export interface AiResponse<T> {
  result: T;
  functionCalls?: AiToolCall[];
  originalParts?: any[];
  usage: TokenUsage;
  model: string;
  citations?: Citation[];
}

export interface GenerateTextOptions {
  systemInstruction?: string;
  tier?: AiTaskTier;
  model?: string;
  history?: AiMessage[];
  tools?: any[]; // We can unify this later, but keep as any[] for now
  googleSearch?: boolean;
}

export interface GenerateStructuredOptions {
  systemInstruction?: string;
  tier?: AiTaskTier;
  model?: string;
  history?: AiMessage[];
}

export interface GenerateEmbeddingOptions {
  tier?: AiTaskTier;
  model?: string;
}

export interface AiServiceConfig {
  apiKey?: string;
  client?: GoogleGenAI;
}
