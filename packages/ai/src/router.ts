import { AiTaskTier, MODEL_REGISTRY, ModelConfig } from "./models.js";
import { ProviderErrorCode } from "./provider.js";

export interface AiRoutingRequest {
  operation: "text" | "structured" | "embedding";
  tier: AiTaskTier;
  explicitModel?: string;
  requiredCapabilities?: {
    tools?: boolean;
    structuredOutput?: boolean;
    vision?: boolean;
    embeddings?: boolean;
    googleSearch?: boolean;
  };
  allowPaid?: boolean;
}

export interface AiRoutingDecision {
  providerId: string;
  model: string;
  reason: string;
}

export interface ProviderHealth {
  status: "healthy" | "degraded" | "unavailable";
  resetAt?: number;
}

export class AiRouter {
  private healthState: Map<string, ProviderHealth> = new Map();
  private cooldownMs: number;
  private defaultAllowPaid: boolean;

  constructor(options?: { cooldownMs?: number; allowPaid?: boolean }) {
    this.cooldownMs = options?.cooldownMs || 60000; // 1 minute default cooldown
    this.defaultAllowPaid = options?.allowPaid ?? false;
  }

  public route(request: AiRoutingRequest): AiRoutingDecision {
    const allowPaid = request.allowPaid ?? this.defaultAllowPaid;

    if (request.explicitModel) {
      return this.routeExplicitModel(request.explicitModel, request, allowPaid);
    }

    return this.routeByTierAndCapabilities(request, allowPaid);
  }

  private routeExplicitModel(modelId: string, request: AiRoutingRequest, allowPaid: boolean): AiRoutingDecision {
    const modelInfo = MODEL_REGISTRY[modelId];
    if (!modelInfo) {
      throw new Error(`RoutingError: Explicit model '${modelId}' is not found in registry.`);
    }

    if (!allowPaid && modelInfo.pricingClass === "paid") {
      throw new Error(`RoutingError: Model '${modelId}' is paid, but ALLOW_PAID_AI is false.`);
    }

    this.checkCapabilities(modelInfo, request);

    const health = this.getProviderHealth(modelInfo.provider);
    if (health.status === "unavailable") {
      throw new Error(`RoutingError: Provider '${modelInfo.provider}' for explicitly requested model '${modelId}' is currently unavailable.`);
    }

    return {
      providerId: modelInfo.provider,
      model: modelInfo.model,
      reason: "explicit_model"
    };
  }

  private routeByTierAndCapabilities(request: AiRoutingRequest, allowPaid: boolean): AiRoutingDecision {
    const candidates = Object.values(MODEL_REGISTRY).filter((modelInfo) => {
      // 1. Tier Match
      if (!modelInfo.tiers.includes(request.tier)) return false;

      // 2. Paid Match
      if (!allowPaid && modelInfo.pricingClass === "paid") return false;

      // 3. Modality Match (Embeddings strictly separated)
      if (request.operation === "embedding" && !modelInfo.capabilities.supportsEmbeddings) return false;
      if (request.operation !== "embedding" && modelInfo.capabilities.supportsEmbeddings) return false;

      // 4. Provider Health
      const health = this.getProviderHealth(modelInfo.provider);
      if (health.status === "unavailable") return false;

      // 5. Capability Match
      try {
        this.checkCapabilities(modelInfo, request);
        return true;
      } catch {
        return false;
      }
    });

    if (candidates.length === 0) {
      throw new Error(`RoutingError: No compatible model found for tier '${request.tier}' and given capabilities. (Paid allowed: ${allowPaid})`);
    }

    // Sort to prefer healthy over degraded
    candidates.sort((a, b) => {
      const healthA = this.getProviderHealth(a.provider).status;
      const healthB = this.getProviderHealth(b.provider).status;
      if (healthA === "healthy" && healthB !== "healthy") return -1;
      if (healthA !== "healthy" && healthB === "healthy") return 1;
      return 0;
    });

    const selected = candidates[0]!;

    return {
      providerId: selected.provider,
      model: selected.model,
      reason: "tier_match"
    };
  }

  private checkCapabilities(modelInfo: ModelConfig, request: AiRoutingRequest) {
    if (request.requiredCapabilities) {
      if (request.requiredCapabilities.tools && !modelInfo.capabilities.supportsToolCalling) {
        throw new Error(`Capability mismatch: requires tools`);
      }
      if (request.requiredCapabilities.vision && !modelInfo.capabilities.supportsVision) {
        throw new Error(`Capability mismatch: requires vision`);
      }
      if (request.requiredCapabilities.structuredOutput && !modelInfo.capabilities.supportsStructuredOutput) {
        throw new Error(`Capability mismatch: requires structuredOutput`);
      }
      if (request.requiredCapabilities.googleSearch && !modelInfo.capabilities.supportsGoogleSearch) {
        throw new Error(`Capability mismatch: requires googleSearch`);
      }
    }
  }

  public getProviderHealth(providerId: string): ProviderHealth {
    const health = this.healthState.get(providerId);
    if (!health) return { status: "healthy" };

    if (health.resetAt && Date.now() >= health.resetAt) {
      this.healthState.delete(providerId);
      return { status: "healthy" };
    }

    return health;
  }

  public reportError(providerId: string, errorType: ProviderErrorCode) {
    switch (errorType) {
      case "RATE_LIMITED":
        // Degraded: might succeed on backoff, but prefer others if available
        this.healthState.set(providerId, {
          status: "degraded",
          resetAt: Date.now() + 10000 // 10s backoff preference
        });
        break;
      case "QUOTA_EXCEEDED":
      case "AUTH_ERROR":
        // Effectively dead until configured / reset manually
        this.healthState.set(providerId, {
          status: "unavailable",
          resetAt: Date.now() + this.cooldownMs * 60 // Long timeout for quota/auth (1 hr)
        });
        break;
      case "PROVIDER_UNAVAILABLE":
      case "TIMEOUT":
        // Down
        this.healthState.set(providerId, {
          status: "unavailable",
          resetAt: Date.now() + this.cooldownMs
        });
        break;
      default:
        // INVALID_REQUEST, UNSUPPORTED_CAPABILITY, etc. do not mean provider is down
        break;
    }
  }

  public resetHealth(providerId?: string) {
    if (providerId) {
      this.healthState.delete(providerId);
    } else {
      this.healthState.clear();
    }
  }
}
