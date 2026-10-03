import Groq from "groq-sdk";
import { resolveModel, type AiTaskTier } from "../models.js";
import type { 
  AiResponse, 
  GenerateTextOptions, 
  GenerateStructuredOptions, 
  GenerateEmbeddingOptions, 
  TokenUsage 
} from "../types.js";
import { AIProvider, ProviderCapabilities, ProviderError, ProviderErrorCode } from "../provider.js";

export class GroqProvider implements AIProvider {
  public readonly name = "groq";
  public readonly capabilities: ProviderCapabilities = {
    supportsStructuredOutput: true,
    supportsToolCalling: true,
    supportsVision: false,
    supportsGoogleSearch: false,
  };

  private _client: Groq | null = null;
  private readonly apiKey?: string;

  constructor(apiKey?: string, client?: Groq) {
    this.apiKey = apiKey;
    if (client) {
      this._client = client;
    }
  }

  private get client(): Groq {
    if (!this._client) {
      const key = this.apiKey ?? process.env["GROQ_API_KEY"];
      if (!key) {
        throw new ProviderError(
          ProviderErrorCode.AUTH_ERROR,
          "GROQ_API_KEY is not set"
        );
      }
      this._client = new Groq({ apiKey: key });
    }
    return this._client;
  }

  private mapError(error: any): never { if (error instanceof ProviderError) throw error;
    const status = error?.status ?? error?.statusCode ?? error?.code;
    const message = typeof error?.message === "string" ? error.message : String(error);
    
    if (status === 429 || message.includes("429") || message.includes("Rate limit")) {
      throw new ProviderError(ProviderErrorCode.RATE_LIMITED, message, error);
    }
    if (status === 402 || message.includes("insufficient_quota")) {
      throw new ProviderError(ProviderErrorCode.QUOTA_EXCEEDED, message, error);
    }
    if (status >= 500 || status === "UNAVAILABLE" || message.includes("503") || message.includes("timeout")) {
      throw new ProviderError(ProviderErrorCode.PROVIDER_UNAVAILABLE, message, error);
    }
    if (status === 401 || status === 403 || message.includes("API key")) {
      throw new ProviderError(ProviderErrorCode.AUTH_ERROR, message, error);
    }
    if (status === 400 || message.includes("invalid") || message.includes("bad_request")) {
      throw new ProviderError(ProviderErrorCode.INVALID_REQUEST, message, error);
    }
    
    throw new ProviderError(ProviderErrorCode.UNKNOWN, message, error);
  }

  private convertSchemaForGroq(schema: any): any {
    if (!schema) return schema;
    if (Array.isArray(schema)) return schema.map(s => this.convertSchemaForGroq(s));
    if (typeof schema !== "object") return schema;

    const result = { ...schema };
    if (result.type && typeof result.type === "string") {
      result.type = result.type.toLowerCase();
    }
    if (result.properties) {
      result.properties = { ...result.properties };
      for (const key in result.properties) {
        result.properties[key] = this.convertSchemaForGroq(result.properties[key]);
      }
    }
    if (result.items) {
      result.items = this.convertSchemaForGroq(result.items);
    }
    return result;
  }

  private formatTools(tools: any[] | undefined): any[] | undefined {
    if (!tools || tools.length === 0) return undefined;
    const groqTools: any[] = [];
    for (const tool of tools) {
      if (tool.functionDeclarations) {
        for (const decl of tool.functionDeclarations) {
          groqTools.push({
            type: "function",
            function: {
              name: decl.name,
              description: decl.description,
              parameters: this.convertSchemaForGroq(decl.parameters)
            }
          });
        }
      } else if (tool.googleSearch) {
        // Ignored for Groq
      }
    }
    return groqTools.length > 0 ? groqTools : undefined;
  }

  private formatMessages(prompt: string, options?: GenerateTextOptions | GenerateStructuredOptions): any[] {
    const messages: any[] = [];
    
    if (options?.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction });
    }

    if (options?.history) {
      for (const item of options.history) {
        if (item.role === "system") {
          messages.push({ role: "system", content: item.content });
          continue;
        }

        if (item.role === "tool" || item.toolResponses) {
           for (const resp of (item.toolResponses || [])) {
              messages.push({
                 role: "tool",
                 tool_call_id: resp.id || resp.name,
                 name: resp.name,
                 content: JSON.stringify(resp.response)
              });
           }
           continue;
        }

        if (item.originalParts && item.originalParts.length === 1 && item.originalParts[0].tool_calls) {
           messages.push(item.originalParts[0]);
           continue;
        }

        if (item.toolCalls) {
           messages.push({
              role: "assistant",
              tool_calls: item.toolCalls.map((c, i) => ({
                 id: c.id || `${c.name}_${i}`,
                 type: "function",
                 function: {
                    name: c.name,
                    arguments: typeof c.args === "string" ? c.args : JSON.stringify(c.args)
                 }
              }))
           });
           continue;
        }

        messages.push({
           role: item.role === "assistant" ? "assistant" : "user",
           content: item.content || ""
        });
      }
    }

    if (prompt && prompt.trim()) {
      messages.push({ role: "user", content: prompt });
    }
    
    return messages;
  }

  public async generateText(prompt: string, options?: GenerateTextOptions): Promise<AiResponse<string>> {
    const tier: AiTaskTier = options?.tier ?? "standard";
    // For Phase 2, fallback to a known Groq model if the resolved one belongs to gemini.
    let model = resolveModel(tier, options?.model);
    if (!model || model.includes("gemini")) {
      model = "llama-3.1-8b-instant";
    }

    const messages = this.formatMessages(prompt, options);
    const tools = this.formatTools(options?.tools);

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: messages as any[],
        ...(tools ? { tools, tool_choice: "auto" } : {}),
      });

      const choice = response.choices[0];
      const groqMessage = choice?.message;

      const functionCalls = groqMessage?.tool_calls?.map((tc: any) => {
        let args = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch(e) {}
        return {
          id: tc.id,
          name: tc.function.name,
          args,
        };
      });

      return {
        result: groqMessage?.content ?? "",
        ...(functionCalls && functionCalls.length > 0 ? { functionCalls } : {}),
        originalParts: [groqMessage], 
        usage: this.extractTokenUsage(response.usage),
        model,
      };
    } catch (error) {
      this.mapError(error);
    }
  }

  public async generateStructured<T>(prompt: string, schema: any, options?: GenerateStructuredOptions): Promise<AiResponse<T>> {
    const tier: AiTaskTier = options?.tier ?? "standard";
    let model = resolveModel(tier, options?.model);
    if (!model || model.includes("gemini")) {
      model = "llama-3.1-8b-instant";
    }

    // Tell the model to output JSON adhering to the schema
    const formatInstruction = `You must respond with valid JSON adhering to the following schema:\n${JSON.stringify(this.convertSchemaForGroq(schema))}`;
    const optsWithInstruction = {
       ...options,
       systemInstruction: (options?.systemInstruction ? options.systemInstruction + "\n\n" : "") + formatInstruction
    };
    
    const messages = this.formatMessages(prompt, optsWithInstruction);

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: messages as any[],
        response_format: { type: "json_object" },
      });

      const rawText = response.choices[0]?.message?.content;
      if (!rawText) {
        throw new ProviderError(ProviderErrorCode.SERVER_ERROR, "No text returned by Groq API for structured output");
      }

      return {
        result: this.parseJson<T>(rawText),
        originalParts: [response.choices[0]?.message],
        usage: this.extractTokenUsage(response.usage),
        model,
      };
    } catch (error) {
      this.mapError(error);
    }
  }

  public async generateEmbedding(_text: string, _options?: GenerateEmbeddingOptions | string): Promise<AiResponse<number[]>> {
    throw new ProviderError(ProviderErrorCode.UNSUPPORTED_CAPABILITY, "Groq does not support embeddings natively");
  }

  private extractTokenUsage(usage?: any): TokenUsage {
    const promptTokens = usage?.prompt_tokens ?? 0;
    const outputTokens = usage?.completion_tokens ?? 0;
    const totalTokens = usage?.total_tokens ?? promptTokens + outputTokens;
    return { promptTokens, outputTokens, totalTokens };
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
}
