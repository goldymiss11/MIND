import { GoogleGenAI } from "@google/genai";
import { resolveModel, type AiTaskTier } from "../models.js";
import type { 
  AiResponse, 
  GenerateTextOptions, 
  GenerateStructuredOptions, 
  GenerateEmbeddingOptions, 
  TokenUsage,
  Citation
} from "../types.js";
import { AIProvider, ProviderCapabilities, ProviderError, ProviderErrorCode } from "../provider.js";

export class GeminiProvider implements AIProvider {
  public readonly name = "gemini";
  public readonly capabilities: ProviderCapabilities = {
    supportsStructuredOutput: true,
    supportsToolCalling: true,
    supportsVision: true,
    supportsGoogleSearch: true,
  };

  private _client: GoogleGenAI | null = null;
  private readonly apiKey?: string;

  constructor(apiKey?: string, client?: GoogleGenAI) {
    this.apiKey = apiKey;
    if (client) {
      this._client = client;
    }
  }

  private get client(): GoogleGenAI {
    if (!this._client) {
      const key = this.apiKey ?? process.env["GEMINI_API_KEY"];
      if (!key) {
        throw new ProviderError(
          ProviderErrorCode.AUTH_ERROR,
          "GEMINI_API_KEY is not set"
        );
      }
      this._client = new GoogleGenAI({ apiKey: key });
    }
    return this._client;
  }

  private mapError(error: any): never {
    const status = error?.status ?? error?.statusCode ?? error?.code;
    const message = typeof error?.message === "string" ? error.message : String(error);
    
    if (status === 429 || status === "429" || status === "RESOURCE_EXHAUSTED" || message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
      if (message.toLowerCase().includes("quota")) {
         throw new ProviderError(ProviderErrorCode.QUOTA_EXCEEDED, message, error);
      }
      throw new ProviderError(ProviderErrorCode.RATE_LIMITED, message, error);
    }
    if (status === 503 || status === "503" || status === "UNAVAILABLE" || message.includes("503") || message.includes("UNAVAILABLE") || message.includes("High Demand")) {
      throw new ProviderError(ProviderErrorCode.PROVIDER_UNAVAILABLE, message, error);
    }
    if (status === 401 || status === 403 || message.includes("API key")) {
      throw new ProviderError(ProviderErrorCode.AUTH_ERROR, message, error);
    }
    if (status === 400 || message.includes("INVALID_ARGUMENT") || message.includes("thought_signature")) {
      throw new ProviderError(ProviderErrorCode.INVALID_REQUEST, message, error);
    }
    
    throw new ProviderError(ProviderErrorCode.UNKNOWN, message, error);
  }

  public async generateText(prompt: string, options?: GenerateTextOptions): Promise<AiResponse<string>> {
    const tier: AiTaskTier = options?.tier ?? "standard";
    const model = resolveModel(tier, options?.model);
    const contents = this.formatContentsWithHistory(prompt, options?.history);

    const config: Record<string, any> = {};
    if (options?.systemInstruction) {
      config["systemInstruction"] = options.systemInstruction;
    }
    const tools: any[] = [];
    if (options?.tools && options.tools.length > 0) {
      tools.push(...options.tools);
    }
    if (options?.googleSearch) {
      tools.push({ googleSearch: {} });
    }
    if (tools.length > 0) {
      config["tools"] = tools;
    }

    try {
      const response = await this.client.models.generateContent({
        model,
        contents,
        ...(Object.keys(config).length > 0 ? { config } : {}),
      });

      const functionCalls = response.functionCalls && response.functionCalls.length > 0
        ? response.functionCalls.map((fc: any) => ({ name: fc.name || "", args: fc.args || {} }))
        : undefined;

      const citations = this.extractCitations(response);

      return {
        result: response.text ?? "",
        ...(functionCalls ? { functionCalls } : {}),
        ...(citations && citations.length > 0 ? { citations } : {}),
        originalParts: (response as any).candidates?.[0]?.content?.parts,
        usage: this.extractTokenUsage(response.usageMetadata),
        model,
      };
    } catch (error) {
      this.mapError(error);
    }
  }

  public async generateStructured<T>(prompt: string, schema: any, options?: GenerateStructuredOptions): Promise<AiResponse<T>> {
    const tier: AiTaskTier = options?.tier ?? "standard";
    const model = resolveModel(tier, options?.model);

    const config: Record<string, any> = {
      responseMimeType: "application/json",
      responseSchema: schema,
    };

    if (options?.systemInstruction) {
      config["systemInstruction"] = options.systemInstruction;
    }

    try {
      const response = await this.client.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      const rawText = response.text;
      if (!rawText) {
        throw new ProviderError(ProviderErrorCode.SERVER_ERROR, "No text returned by Gemini API for structured output");
      }

      return {
        result: this.parseJson<T>(rawText),
        originalParts: (response as any).candidates?.[0]?.content?.parts,
        usage: this.extractTokenUsage(response.usageMetadata),
        model,
      };
    } catch (error) {
      this.mapError(error);
    }
  }

  public async generateEmbedding(text: string, options?: GenerateEmbeddingOptions | string): Promise<AiResponse<number[]>> {
    const resolvedOptions: GenerateEmbeddingOptions = typeof options === "string" ? { model: options } : options ?? {};
    const tier: AiTaskTier = resolvedOptions.tier ?? "embedding";
    const model = resolveModel(tier, resolvedOptions.model);

    try {
      const response = await this.client.models.embedContent({
        model,
        contents: text,
        config: { outputDimensionality: 768 }
      });

      const firstEmbedding = response.embeddings?.[0];
      const values = firstEmbedding?.values ?? (response as any).embedding?.values;

      if (!values || !Array.isArray(values)) {
        throw new ProviderError(ProviderErrorCode.SERVER_ERROR, "No embedding values returned by Gemini API");
      }

      return {
        result: values,
        usage: this.extractTokenUsage((response as any).usageMetadata),
        model,
      };
    } catch (error) {
      this.mapError(error);
    }
  }

  private extractTokenUsage(usageMetadata?: any): TokenUsage {
    const promptTokens = usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;
    const totalTokens = usageMetadata?.totalTokenCount ?? promptTokens + outputTokens;

    const usage: TokenUsage = { promptTokens, outputTokens, totalTokens };
    const cachedTokens = usageMetadata?.cachedContentTokenCount ?? usageMetadata?.cachedTokens;
    if (cachedTokens !== undefined) {
      usage.cachedTokens = cachedTokens;
    }
    return usage;
  }

  private formatContentsWithHistory(prompt: string, history?: import('../types.js').AiMessage[]): any {
    if (!history || history.length === 0) {
      return prompt;
    }

    const formattedHistory = history.map((item) => {
      const role = item.role === "assistant" ? "model" : "user";
      
      if (item.originalParts) {
         return { role, parts: item.originalParts };
      }
      if (item.toolResponses) {
         return {
           role: "user",
           parts: item.toolResponses.map(r => ({
             functionResponse: {
                name: r.name,
                response: r.response,
                ...(r.id ? { id: r.id } : {})
             }
           }))
         };
      }
      if (item.toolCalls) {
         return {
           role: "model",
           parts: item.toolCalls.map(c => ({
             functionCall: {
                name: c.name,
                args: c.args,
                ...(c.id ? { id: c.id } : {})
             }
           }))
         };
      }
      return { role, parts: [{ text: item.content || "" }] };
    });

    if (!prompt || !prompt.trim()) {
      return formattedHistory;
    }
    return [...formattedHistory, { role: "user", parts: [{ text: prompt }] }];
  }

  private parseJson<T>(rawText: string): T {
    let cleaned = rawText.trim();
    if (cleaned.startsWith("\`\`\`")) {
      cleaned = cleaned.replace(/^\`\`\`(?:json)?\s*\n?/, "").replace(/\n?\`\`\`\s*$/, "");
    }
    try {
      return JSON.parse(cleaned) as T;
    } catch (error) {
      throw new ProviderError(
        ProviderErrorCode.SERVER_ERROR,
        `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private extractCitations(response: any): Citation[] | undefined {
    const candidate = response?.candidates?.[0];
    const metadata = candidate?.groundingMetadata;
    if (!metadata) return undefined;

    const chunks = metadata.groundingChunks;
    if (!Array.isArray(chunks) || chunks.length === 0) return undefined;

    const citations: Citation[] = [];
    const supports = metadata.groundingSupports;

    if (Array.isArray(supports) && supports.length > 0) {
      for (const sup of supports) {
        const chunkIndices = sup.groundingChunkIndices;
        const segment = sup.segment;
        if (Array.isArray(chunkIndices)) {
          for (const idx of chunkIndices) {
            const chunk = chunks[idx];
            const url = chunk?.web?.uri;
            if (url) {
              citations.push({
                url,
                title: chunk?.web?.title || undefined,
                startIndex: segment?.startIndex,
                endIndex: segment?.endIndex,
              });
            }
          }
        }
      }
    }

    // Also include any chunks not covered by supports
    for (const chunk of chunks) {
      const url = chunk?.web?.uri;
      if (url && !citations.some((c) => c.url === url)) {
        citations.push({
          url,
          title: chunk?.web?.title || undefined,
        });
      }
    }

    return citations.length > 0 ? citations : undefined;
  }
}
