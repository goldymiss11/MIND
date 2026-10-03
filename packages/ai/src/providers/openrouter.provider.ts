import { AIProvider, ProviderCapabilities, ProviderError, ProviderErrorCode } from "../provider.js";
import type {
  AiResponse,
  GenerateTextOptions,
  GenerateStructuredOptions,
  GenerateEmbeddingOptions,
} from "../types.js";

export class OpenRouterProvider implements AIProvider {
  public readonly name = "openrouter";
  public readonly capabilities: ProviderCapabilities = {
    supportsStructuredOutput: true,
    supportsToolCalling: true,
    supportsVision: true,
    supportsGoogleSearch: false,
  };

  private readonly apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  private get key(): string {
    const key = this.apiKey ?? process.env["OPENROUTER_API_KEY"];
    if (!key) {
      throw new ProviderError(ProviderErrorCode.AUTH_ERROR, "OPENROUTER_API_KEY is not set");
    }
    return key;
  }

  private mapError(error: any): never {
    if (error instanceof ProviderError) throw error;
    const status = error?.status ?? error?.statusCode ?? error?.code;
    const message = typeof error?.message === "string" ? error.message : String(error);

    if (status === 429 || message.includes("429") || message.includes("Rate limit")) {
      if (message.toLowerCase().includes("quota") || message.toLowerCase().includes("credits")) {
        throw new ProviderError(ProviderErrorCode.QUOTA_EXCEEDED, message, error);
      }
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
    throw new ProviderError(ProviderErrorCode.UNKNOWN, message, error);
  }

  public async generateText(prompt: string, options?: GenerateTextOptions): Promise<AiResponse<string>> {
    const model = options?.model || "meta-llama/llama-3.3-70b-instruct:free";

    const messages: any[] = [];
    if (options?.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction });
    }
    if (options?.history && options.history.length > 0) {
      for (const h of options.history) {
        messages.push({ role: h.role === "assistant" ? "assistant" : "user", content: h.content || "" });
      }
    }
    if (prompt) {
      messages.push({ role: "user", content: prompt });
    }

    const payload: any = {
      model,
      messages,
      temperature: 0.7,
    };

    if (options?.tools && options.tools.length > 0) {
      const openAiTools = [];
      for (const tool of options.tools) {
        if (tool.functionDeclarations) {
          for (const fd of tool.functionDeclarations) {
            openAiTools.push({
              type: "function",
              function: {
                name: fd.name,
                description: fd.description,
                parameters: fd.parameters || {},
              },
            });
          }
        }
      }
      if (openAiTools.length > 0) {
        payload.tools = openAiTools;
      }
    }

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://mind.os",
          "X-Title": "MIND OS",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        let parsed: any;
        try {
          parsed = JSON.parse(errorText);
        } catch {
          // ignore
        }
        const errorMsg = parsed?.error?.message || errorText || `HTTP ${res.status}`;
        throw new ProviderError(
          res.status === 429 ? ProviderErrorCode.RATE_LIMITED : ProviderErrorCode.UNKNOWN,
          errorMsg
        );
      }

      const data = (await res.json()) as any;
      const choice = data.choices?.[0];
      const message = choice?.message;

      let functionCalls: any[] | undefined = undefined;
      if (message?.tool_calls && message.tool_calls.length > 0) {
        functionCalls = message.tool_calls.map((tc: any) => ({
          name: tc.function?.name || "",
          args: JSON.parse(tc.function?.arguments || "{}"),
          id: tc.id,
        }));
      }

      return {
        result: message?.content || "",
        ...(functionCalls ? { functionCalls } : {}),
        model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      };
    } catch (err) {
      this.mapError(err);
    }
  }

  public async generateStructured<T>(
    prompt: string,
    schema: any,
    options?: GenerateStructuredOptions
  ): Promise<AiResponse<T>> {
    const model = options?.model || "meta-llama/llama-3.3-70b-instruct:free";

    const systemPrompt = options?.systemInstruction
      ? `${options.systemInstruction}\nReturn ONLY a valid JSON object matching this schema:\n${JSON.stringify(schema)}`
      : `Return ONLY a valid JSON object matching this schema:\n${JSON.stringify(schema)}`;

    try {
      const res = await this.generateText(prompt, {
        ...options,
        model,
        systemInstruction: systemPrompt,
      });

      let parsed: T;
      try {
        parsed = JSON.parse(res.result.trim());
      } catch {
        const jsonMatch = res.result.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new ProviderError(ProviderErrorCode.SERVER_ERROR, "Failed to parse JSON response from OpenRouter");
        }
      }

      return {
        result: parsed,
        usage: res.usage,
        model: res.model,
      };
    } catch (err) {
      this.mapError(err);
    }
  }

  public async generateEmbedding(_text: string, _options?: GenerateEmbeddingOptions | string): Promise<AiResponse<number[]>> {
    throw new ProviderError(
      ProviderErrorCode.UNSUPPORTED_CAPABILITY,
      "OpenRouter embeddings not supported. Use Gemini for vector embeddings."
    );
  }
}
