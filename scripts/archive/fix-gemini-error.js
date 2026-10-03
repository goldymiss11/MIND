import fs from 'fs';

let content = fs.readFileSync('packages/ai/src/providers/gemini.provider.ts', 'utf8');

const oldMapError = `    if (status === 429 || status === "429" || status === "RESOURCE_EXHAUSTED" || message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
      throw new ProviderError(ProviderErrorCode.QUOTA_EXCEEDED, message, error);
    }`;

const newMapError = `    if (status === 429 || status === "429" || status === "RESOURCE_EXHAUSTED" || message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
      if (message.toLowerCase().includes("quota")) {
         throw new ProviderError(ProviderErrorCode.QUOTA_EXCEEDED, message, error);
      }
      throw new ProviderError(ProviderErrorCode.RATE_LIMITED, message, error);
    }`;

content = content.replace(oldMapError, newMapError);
fs.writeFileSync('packages/ai/src/providers/gemini.provider.ts', content);
