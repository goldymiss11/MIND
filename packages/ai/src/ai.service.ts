import type Groq from "groq-sdk";
import type Cerebras from "@cerebras/cerebras_cloud_sdk";
import type {
  AiResponse,
  AiServiceConfig,
  GenerateEmbeddingOptions,
  GenerateStructuredOptions,
  GenerateTextOptions,
} from "./types.js";
import { ProviderError, ProviderErrorCode, AIProvider } from "./provider.js";
import { GeminiProvider } from "./providers/gemini.provider.js";
import { GroqProvider } from "./providers/groq.provider.js";
import { CerebrasProvider } from "./providers/cerebras.provider.js";
import { OpenRouterProvider } from "./providers/openrouter.provider.js";
import { AiRouter, AiRoutingDecision } from "./router.js";

export interface ExtendedAiServiceConfig extends AiServiceConfig {
  groqApiKey?: string;
  groqClient?: Groq;
  cerebrasApiKey?: string;
  cerebrasClient?: Cerebras;
  openrouterApiKey?: string;
  allowPaidAi?: boolean;
}

/**
 * High-level AiService.
 * Holds GeminiProvider, GroqProvider, CerebrasProvider, and OpenRouterProvider,
 * and routes operations via AiRouter.
 */
export class AiService {
  public readonly providers: Record<string, AIProvider>;
  public readonly router: AiRouter;

  constructor(config?: ExtendedAiServiceConfig) {
    const gemini = new GeminiProvider(config?.apiKey, config?.client);
    const groq = new GroqProvider(config?.groqApiKey, config?.groqClient);
    const cerebras = new CerebrasProvider(config?.cerebrasApiKey, config?.cerebrasClient);
    const openrouter = new OpenRouterProvider(config?.openrouterApiKey);

    this.providers = {
      gemini,
      groq,
      cerebras,
      openrouter,
    };
    
    this.router = new AiRouter({ allowPaid: config?.allowPaidAi });
  }

  private extractErrorCode(error: any): ProviderErrorCode {
    if (error instanceof ProviderError) {
      return error.code;
    }
    const status = error?.status ?? error?.statusCode ?? error?.code;
    const message = typeof error?.message === "string" ? error.message : "";
    if (
      status === 503 || status === "503" || status === "UNAVAILABLE" || message.includes("503") || message.includes("UNAVAILABLE") || message.includes("High Demand")
    ) {
      return ProviderErrorCode.PROVIDER_UNAVAILABLE;
    }
    if (
      status === 429 || status === "429" || status === "RESOURCE_EXHAUSTED" || message.includes("429") || message.includes("RESOURCE_EXHAUSTED")
    ) {
      if (
        message.toLowerCase().includes("daily") ||
        message.toLowerCase().includes("per day") ||
        message.toLowerCase().includes("insufficient_quota") ||
        status === 402
      ) {
        return ProviderErrorCode.QUOTA_EXCEEDED;
      }
      return ProviderErrorCode.RATE_LIMITED;
    }
    return ProviderErrorCode.UNKNOWN;
  }

  private async executeWithRouting<T>(
    operation: "text" | "structured" | "embedding",
    options: any,
    executeFn: (provider: AIProvider, model: string) => Promise<T>
  ): Promise<T> {
    let delay = 1500;
    const maxRetries = 3;
    const hasVision = Boolean(options?.imageBase64 || (options?.images && options.images.length > 0));
    const isExplicitModel = Boolean(typeof options === "string" ? options : options?.model);

    const requiredCapabilities = {
      tools: Boolean(options?.tools && options.tools.length > 0),
      structuredOutput: operation === "structured",
      vision: hasVision,
      embeddings: operation === "embedding",
      googleSearch: Boolean(options?.googleSearch),
    };
    const tier = options?.tier ?? (operation === "embedding" ? "embedding" : "standard");

    /** What the router would pick now, or null when it can offer nothing else. */
    const nextCandidate = (): AiRoutingDecision | null => {
      if (isExplicitModel || operation === "embedding") return null;
      try {
        return this.router.route({ operation, tier, requiredCapabilities });
      } catch {
        return null;
      }
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const decision = this.router.route({
        operation,
        tier,
        explicitModel: typeof options === "string" ? options : options?.model,
        requiredCapabilities,
      });

      const provider = this.providers[decision.providerId];
      if (!provider) {
        throw new Error(`Provider ${decision.providerId} not instantiated`);
      }

      try {
        return await executeFn(provider, decision.model);
      } catch (error: any) {
        const code = this.extractErrorCode(error);
        this.router.reportError(decision.providerId, code);

        if (attempt < maxRetries) {
          if (code === ProviderErrorCode.QUOTA_EXCEEDED || code === ProviderErrorCode.AUTH_ERROR) {
            // Permanent for this provider: only another provider can help.
            if (nextCandidate()) {
              console.warn(`${code} on provider ${decision.providerId}. Switching to alternative provider...`);
              continue;
            }
            console.error(`Fatal API error (${code}) on provider ${decision.providerId}: no alternatives available.`);
            throw error;
          }

          if (
            code === ProviderErrorCode.PROVIDER_UNAVAILABLE ||
            code === ProviderErrorCode.RATE_LIMITED ||
            code === ProviderErrorCode.TIMEOUT
          ) {
            // Prefer a healthy provider now over waiting out a backoff on this one.
            const next = nextCandidate();
            if (next && next.providerId !== decision.providerId && this.router.getProviderHealth(next.providerId).status === "healthy") {
              console.warn(`Provider ${decision.providerId} (${code}). Switching immediately to healthy provider ${next.providerId}...`);
              continue;
            }

            console.warn(`API error (${code}) on provider ${decision.providerId}. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay = Math.round(delay * 2);
            continue;
          }
        }

        // Fatal or retries exhausted
        console.error(`Fatal API error (${code}) on provider ${decision.providerId}`);
        throw error;
      }
    }

    throw new Error("Retry attempts exhausted");
  }

  public async generateText(
    prompt: string,
    options?: GenerateTextOptions
  ): Promise<AiResponse<string>> {
    return this.executeWithRouting("text", options || {}, (provider, model) => 
       provider.generateText(prompt, { ...options, model })
    );
  }

  public async generateStructured<T>(
    prompt: string,
    schema: any,
    options?: GenerateStructuredOptions
  ): Promise<AiResponse<T>> {
    return this.executeWithRouting("structured", options || {}, (provider, model) =>
      provider.generateStructured<T>(prompt, schema, { ...options, model })
    );
  }

  public async generateEmbedding(
    text: string,
    options?: GenerateEmbeddingOptions | string
  ): Promise<AiResponse<number[]>> {
    const opts = typeof options === "string" ? { model: options } : options || {};
    return this.executeWithRouting("embedding", opts, (provider, model) => 
      provider.generateEmbedding(text, { ...opts, model })
    );
  }
}
