const fs = require('fs');
let content = fs.readFileSync('packages/ai/src/ai.service.ts', 'utf8');
content = content.replace(
  /if \(error instanceof ProviderError\) \{[\s\S]*?\}/,
  `if (error instanceof ProviderError) {
          isRetryable =
            error.code === ProviderErrorCode.PROVIDER_UNAVAILABLE ||
            error.code === ProviderErrorCode.RATE_LIMITED ||
            error.code === ProviderErrorCode.QUOTA_EXCEEDED ||
            error.code === ProviderErrorCode.TIMEOUT;
        } else {
          const status = error?.status ?? error?.statusCode ?? error?.code;
          const message = typeof error?.message === "string" ? error.message : "";
          isRetryable =
            status === 503 || status === 429 || status === "503" || status === "429" ||
            status === "UNAVAILABLE" || status === "RESOURCE_EXHAUSTED" ||
            message.includes("503") || message.includes("429") ||
            message.includes("UNAVAILABLE") || message.includes("RESOURCE_EXHAUSTED") ||
            message.includes("High Demand");
        }`
);
fs.writeFileSync('packages/ai/src/ai.service.ts', content);
