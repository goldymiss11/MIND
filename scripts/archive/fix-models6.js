import fs from 'fs';
let content = fs.readFileSync('packages/ai/src/models.ts', 'utf8');

const regex = /export interface ModelConfig \{[\s\S]*?capabilities/g;
const newInterface = `export interface ModelConfig {
  provider: "gemini" | "groq" | "cerebras" | string;
  model: string;
  contextWindow?: number;
  maxOutput?: number;
  capabilities`;

content = content.replace(regex, newInterface);
fs.writeFileSync('packages/ai/src/models.ts', content);
