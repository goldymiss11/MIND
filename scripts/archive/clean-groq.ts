import fs from 'fs';

let content = fs.readFileSync('packages/ai/src/providers/groq.provider.ts', 'utf8');

content = content.replace(
  /role: item\.role === "assistant" \|\| \(item\.role as any\) === "model" \? "assistant" : "user"/g,
  'role: item.role === "assistant" ? "assistant" : "user"'
);

// We can just leave `messages as any[]` if we don't import Groq.Chat... but wait, let's use `import type Groq from "groq-sdk"` to cast?
content = content.replace(/messages as any\[\]/g, 'messages as Groq.Chat.ChatCompletionMessageParam[]');

fs.writeFileSync('packages/ai/src/providers/groq.provider.ts', content);
