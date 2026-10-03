import fs from 'fs';

let content = fs.readFileSync('packages/ai/test/ai.service.test.ts', 'utf8');

content = content.replace(/executeWithRouting\("text", \{ model: "gemini-3\.5-flash" \},\(\n\s*async \(\) =>/g,
  'executeWithRouting("text", { model: "gemini-3.5-flash" }, async () =>'
);

fs.writeFileSync('packages/ai/test/ai.service.test.ts', content);
