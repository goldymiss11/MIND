import fs from 'fs';

let content = fs.readFileSync('packages/ai/test/ai.service.test.ts', 'utf8');

const oldStr = `  const history = [
    { role: "user", content: "Hi" },
    { role: "model", parts: [{ text: "Hello! How can I help?" }] },
  ];`;

const newStr = `  const history: any = [
    { role: "user", content: "Hi" },
    { role: "assistant", content: "Hello! How can I help?" },
  ];`;

content = content.replace(oldStr, newStr);
fs.writeFileSync('packages/ai/test/ai.service.test.ts', content);
