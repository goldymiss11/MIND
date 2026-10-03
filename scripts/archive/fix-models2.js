import fs from 'fs';
let content = fs.readFileSync('packages/ai/src/models.ts', 'utf8');

// Fix the duplicated string
content = content.replace(/provider: "gemini" \| "groq" \| "cerebras" \| string;\|provider: "gemini" \| "groq" \| "cerebras" \| string;\|provider: "gemini" \| "groq" \| "cerebras" \| string;/g, 'provider: "gemini" | "groq" | "cerebras" | string;');
content = content.replace(/model:provider: "gemini" \| "groq" \| "cerebras" \| string;/g, 'model: string;');

fs.writeFileSync('packages/ai/src/models.ts', content);
