import fs from 'fs';
let content = fs.readFileSync('packages/ai/src/models.ts', 'utf8');

content = content.replace(/export interface ModelConfig \{/g, `export interface ModelConfig {
  contextWindow?: number;
  maxOutput?: number;`);
  
content = content.replace(/provider: "gemini" | "groq" | string;/g, `provider: "gemini" | "groq" | "cerebras" | string;`);

const newModels = `
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

content = content.replace(/};\s*$/g, newModels);
fs.writeFileSync('packages/ai/src/models.ts', content);
