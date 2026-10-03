import fs from 'fs';

let content = fs.readFileSync('packages/ai/src/providers/cerebras.provider.ts', 'utf8');

content = content.replace(
  /role: item\.role === "assistant" \|\| \(item\.role as any\) === "model" \? "assistant" : "user"/g,
  'role: item.role === "assistant" ? "assistant" : "user"'
);

// We need to insert interface before class CerebrasProvider
content = content.replace(
  /export class CerebrasProvider/g,
  `interface CerebrasChatResponse {
  choices: { message: any }[];
  usage?: any;
}

export class CerebrasProvider`
);

content = content.replace(/\(response as any\)\.choices/g, '(response as CerebrasChatResponse).choices');
content = content.replace(/\(response as any\)\.usage/g, '(response as CerebrasChatResponse).usage');
content = content.replace(/messages as any\[\]/g, 'messages as Cerebras.Chat.ChatCompletionMessageParam[]');

fs.writeFileSync('packages/ai/src/providers/cerebras.provider.ts', content);
