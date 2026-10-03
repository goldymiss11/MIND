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
import { AiRouter, AiRoutingDecision } from "./router.js";

export interface ExtendedAiServiceConfig extends AiServiceConfig {
  groqApiKey?: string;
  groqClient?: Groq;
  cerebrasApiKey?: string;
  cerebrasClient?: Cerebras;
  allowPaidAi?: boolean;
}

/**
 * High-level AiService.
 * In Phase 4, it holds GeminiProvider, GroqProvider, and CerebrasProvider,
 * and routes operations via AiRouter.
 */
export class AiService {
  public readonly providers: Record<string, AIProvider>;
  public readonly router: AiRouter;

  constructor(config?: ExtendedAiServiceConfig) {
    const gemini = new GeminiProvider(config?.apiKey, config?.client);
    const groq = new GroqProvider(config?.groqApiKey, config?.groqClient);
    const cerebras = new CerebrasProvider(config?.cerebrasApiKey, config?.cerebrasClient);

    this.providers = {
      gemini,
      groq,
      cerebras,
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
      return ProviderErrorCode.RATE_LIMITED;
    }
    return ProviderErrorCode.UNKNOWN;
  }

  private isRetryable(code: ProviderErrorCode): boolean {
    return (
      code === ProviderErrorCode.PROVIDER_UNAVAILABLE ||
      code === ProviderErrorCode.RATE_LIMITED ||
      code === ProviderErrorCode.TIMEOUT ||
      code === ProviderErrorCode.QUOTA_EXCEEDED
    );
  }

  private async executeWithRouting<T>(
    operation: "text" | "structured" | "embedding",
    options: any,
    executeFn: (provider: AIProvider, model: string) => Promise<T>
  ): Promise<T> {
    let delay = 1500;
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let decision: AiRoutingDecision;
      try {
        const hasTools = options?.tools && options.tools.length > 0;
        
        decision = this.router.route({
           operation,
           tier: options?.tier ?? (operation === "embedding" ? "embedding" : "standard"),
           explicitModel: typeof options === "string" ? options : options?.model,
           requiredCapabilities: {
             tools: hasTools,
             structuredOutput: operation === "structured",
             embeddings: operation === "embedding"
           }
        });
      } catch (err) {
        // Routing error (no compatible model found)
        throw err;
      }

      const provider = this.providers[decision.providerId];
      if (!provider) {
         throw new Error(`Provider ${decision.providerId} not instantiated`);
      }

      try {
        const result = await executeFn(provider, decision.model);
        // Log routing success optionally
        return result;
      } catch (error: any) {
         const code = this.extractErrorCode(error);
         
         this.router.reportError(decision.providerId, code);

         if (this.isRetryable(code) && attempt < maxRetries) {
           console.warn(`API error (${code}) on provider ${decision.providerId}. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
           await new Promise((resolve) => setTimeout(resolve, delay));
           delay = Math.round(delay * 2);
           continue;
         }
         
         // Error is fatal or retries exhausted
         if (!this.isRetryable(code)) {
            console.error(`Fatal API error (${code}) on provider ${decision.providerId}`);
         }
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
