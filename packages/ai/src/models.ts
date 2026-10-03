export type AiTaskTier = "simple" | "standard" | "complex" | "embedding";

export interface ModelConfig {
  provider: "gemini" | "groq" | "cerebras" | string;
  model: string;
  contextWindow?: number;
  maxOutput?: number;
  pricingClass: "free" | "paid";
  tiers: AiTaskTier[];
  capabilities: {
    supportsStructuredOutput: boolean;
    supportsToolCalling: boolean;
    supportsVision: boolean;
    supportsEmbeddings: boolean;
    supportsGoogleSearch: boolean;
  };
}

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  "gemini-3.5-flash-lite": {
    provider: "gemini",
    model: "gemini-3.5-flash-lite",
    pricingClass: "free",
    tiers: ["simple"],
    capabilities: { supportsStructuredOutput: true, supportsToolCalling: true, supportsVision: true, supportsEmbeddings: false, supportsGoogleSearch: true }
  },
  "gemini-3.5-flash": {
    provider: "gemini",
    model: "gemini-3.5-flash",
    pricingClass: "free",
    tiers: ["standard", "complex"],
    capabilities: { supportsStructuredOutput: true, supportsToolCalling: true, supportsVision: true, supportsEmbeddings: false, supportsGoogleSearch: true }
  },
  "gemini-embedding-2": {
    provider: "gemini",
    model: "gemini-embedding-2",
    pricingClass: "free",
    tiers: ["embedding"],
    capabilities: { supportsStructuredOutput: false, supportsToolCalling: false, supportsVision: false, supportsEmbeddings: true, supportsGoogleSearch: false }
  },
  "llama-3.1-8b-instant": {
    provider: "groq",
    model: "llama-3.1-8b-instant",
    pricingClass: "free",
    tiers: ["simple"],
    capabilities: { supportsStructuredOutput: true, supportsToolCalling: true, supportsVision: false, supportsEmbeddings: false, supportsGoogleSearch: false }
  },
  "llama-3.3-70b-versatile": {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    pricingClass: "free",
    tiers: ["standard", "complex"],
    capabilities: { supportsStructuredOutput: true, supportsToolCalling: true, supportsVision: false, supportsEmbeddings: false, supportsGoogleSearch: false }
  },
  "llama3.1-8b": {
    provider: "cerebras",
    model: "llama3.1-8b",
    pricingClass: "free",
    contextWindow: 8192,
    tiers: ["simple"],
    capabilities: { supportsStructuredOutput: true, supportsToolCalling: true, supportsVision: false, supportsEmbeddings: false, supportsGoogleSearch: false }
  },
  "llama3.3-70b": {
    provider: "cerebras",
    model: "llama3.3-70b",
    pricingClass: "free",
    contextWindow: 8192,
    tiers: ["standard", "complex"],
    capabilities: { supportsStructuredOutput: true, supportsToolCalling: true, supportsVision: false, supportsEmbeddings: false, supportsGoogleSearch: false }
  }
};

export const DEFAULT_MODEL_MAPPING: Record<AiTaskTier, string> = {
  simple: "gemini-3.5-flash-lite",
  standard: "gemini-3.5-flash",
  complex: "gemini-3.5-flash",
  embedding: "gemini-embedding-2",
};

export function resolveModel(tier: AiTaskTier, override?: string): string {
  if (override && override.trim().length > 0) {
    return override;
  }
  return DEFAULT_MODEL_MAPPING[tier];
}
