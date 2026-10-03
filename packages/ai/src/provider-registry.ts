export interface ProviderConfig {
  id: string;
  enabled: boolean;
  health: "healthy" | "degraded" | "unavailable";
  resetAt?: number;
}

export const PROVIDER_REGISTRY: Record<string, ProviderConfig> = {
  gemini: { id: "gemini", enabled: true, health: "healthy" },
  groq: { id: "groq", enabled: true, health: "healthy" },
  cerebras: { id: "cerebras", enabled: true, health: "healthy" }
};
