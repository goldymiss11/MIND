import fs from 'fs';
let content = fs.readFileSync('packages/ai/src/models.ts', 'utf8');

const regex = /export const MODEL_REGISTRY: Record<string, ModelConfig> = \{[\s\S]*?\};/g;

const newRegistry = `export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  "gemini-3.5-flash-lite": {
    provider: "gemini",
    model: "gemini-3.5-flash-lite",
    capabilities: { supportsStructuredOutput: true, supportsToolCalling: true, supportsVision: true, supportsEmbeddings: false }
  },
  "gemini-3.5-flash": {
    provider: "gemini",
    model: "gemini-3.5-flash",
    capabilities: { supportsStructuredOutput: true, supportsToolCalling: true, supportsVision: true, supportsEmbeddings: false }
  },
  "gemini-embedding-2": {
    provider: "gemini",
    model: "gemini-embedding-2",
    capabilities: { supportsStructuredOutput: false, supportsToolCalling: false, supportsVision: false, supportsEmbeddings: true }
  },
  "llama-3.1-8b-instant": {
    provider: "groq",
    model: "llama-3.1-8b-instant",
    capabilities: { supportsStructuredOutput: true, supportsToolCalling: true, supportsVision: false, supportsEmbeddings: false }
  },
  "llama-3.3-70b-versatile": {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    capabilities: { supportsStructuredOutput: true, supportsToolCalling: true, supportsVision: false, supportsEmbeddings: false }
  },
  "llama3.1-8b": {
    provider: "cerebras",
    model: "llama3.1-8b",
    contextWindow: 8192,
    capabilities: { supportsStructuredOutput: true, supportsToolCalling: true, supportsVision: false, supportsEmbeddings: false }
  },
  "llama3.3-70b": {
    provider: "cerebras",
    model: "llama3.3-70b",
    contextWindow: 8192,
    capabilities: { supportsStructuredOutput: true, supportsToolCalling: true, supportsVision: false, supportsEmbeddings: false }
  }
};`;

content = content.replace(regex, newRegistry);
fs.writeFileSync('packages/ai/src/models.ts', content);
