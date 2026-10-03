import type { AiResponse, GenerateTextOptions, GenerateStructuredOptions, GenerateEmbeddingOptions } from "./types.js";

export enum ProviderErrorCode {
  RATE_LIMITED = "RATE_LIMITED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  TIMEOUT = "TIMEOUT",
  PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE",
  AUTH_ERROR = "AUTH_ERROR",
  INVALID_REQUEST = "INVALID_REQUEST",
  UNSUPPORTED_CAPABILITY = "UNSUPPORTED_CAPABILITY",
  CONTEXT_TOO_LARGE = "CONTEXT_TOO_LARGE",
  SERVER_ERROR = "SERVER_ERROR",
  UNKNOWN = "UNKNOWN"
}

export class ProviderError extends Error {
  constructor(
    public code: ProviderErrorCode,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface ProviderCapabilities {
  supportsStructuredOutput: boolean;
  supportsToolCalling: boolean;
  supportsVision: boolean;
}

export interface AIProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  generateText(prompt: string, options?: GenerateTextOptions): Promise<AiResponse<string>>;
  generateStructured<T>(prompt: string, schema: any, options?: GenerateStructuredOptions): Promise<AiResponse<T>>;
  generateEmbedding(text: string, options?: GenerateEmbeddingOptions | string): Promise<AiResponse<number[]>>;
}
