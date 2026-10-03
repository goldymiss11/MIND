import fs from 'fs';

// Fix Cerebras
let cerebras = fs.readFileSync('packages/ai/src/providers/cerebras.provider.ts', 'utf8');
cerebras = cerebras.replace(/item\.role === "model"/g, '(item.role as any) === "model"');
cerebras = cerebras.replace(/response\.choices/g, '(response as any).choices');
cerebras = cerebras.replace(/response\.usage/g, '(response as any).usage');
fs.writeFileSync('packages/ai/src/providers/cerebras.provider.ts', cerebras);

// Fix Groq
let groq = fs.readFileSync('packages/ai/src/providers/groq.provider.ts', 'utf8');
groq = groq.replace(/item\.role === "model"/g, '(item.role as any) === "model"');
fs.writeFileSync('packages/ai/src/providers/groq.provider.ts', groq);

// Fix Gemini functionCalls mapping
let gemini = fs.readFileSync('packages/ai/src/providers/gemini.provider.ts', 'utf8');
gemini = gemini.replace(
  /const functionCalls = response\.functionCalls && response\.functionCalls\.length > 0\s*\n\s*\? response\.functionCalls\s*\n\s*: undefined;/g,
  `const functionCalls = response.functionCalls && response.functionCalls.length > 0
        ? response.functionCalls.map((fc: any) => ({ name: fc.name || "", args: fc.args || {} }))
        : undefined;`
);
fs.writeFileSync('packages/ai/src/providers/gemini.provider.ts', gemini);

// Fix unused Tool in types
let types = fs.readFileSync('packages/ai/src/types.ts', 'utf8');
types = types.replace(/, Tool /, ' ');
fs.writeFileSync('packages/ai/src/types.ts', types);
