import { AiService } from "./ai.service.js";

export * from "./models.js";
export * from "./types.js";
export * from "./ai.service.js";
export { GoogleGenAI, Type } from "@google/genai";
export type { Tool, FunctionDeclaration, FunctionCall } from "@google/genai";

/**
 * Default AiService instance using process.env.GEMINI_API_KEY.
 */
export const aiService = new AiService();
export * from "./provider.js";
export * from "./providers/groq.provider.js";
export * from "./providers/cerebras.provider.js";
export * from "./providers/openrouter.provider.js";
