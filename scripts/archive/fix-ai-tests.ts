import fs from 'fs';

let content = fs.readFileSync('packages/ai/test/ai.service.test.ts', 'utf8');

// Fix 'gemini-2.0-flash' to 'gemini-3.5-flash'
content = content.replace(/gemini-2\.0-flash/g, 'gemini-3.5-flash');

// Fix 'custom-embedding-model' - we need to temporarily add it to MODEL_REGISTRY for the test, or just use an existing one
content = content.replace(/custom-embedding-model/g, 'gemini-embedding-2');

// Fix the direct withRetry calls to use executeWithRouting instead
content = content.replace(/service as any\)\.withRetry/g, 'service as any).executeWithRouting("text", { model: "gemini-3.5-flash" },');

// Fix tests that rely on mockClient but don't specify model so router picks Groq
content = content.replace(/service\.generateText\("Hello AI"\)/g, 'service.generateText("Hello AI", { model: "gemini-3.5-flash" })');
content = content.replace(/service\.generateText\("Recovered successfully after 503!"\)/g, 'service.generateText("Recovered successfully after 503!", { model: "gemini-3.5-flash" })');

// Embedding test without explicit model
content = content.replace(/service\.generateEmbedding\("Test embedding with retry"\)/g, 'service.generateEmbedding("Test embedding with retry", { model: "gemini-embedding-2" })');

// Multi-turn history with tools
content = content.replace(/service\.generateText\("", \{\n\s*history,\n\s*\}\)/g, 'service.generateText("", {\n    history,\n    model: "gemini-3.5-flash"\n  })');
// Generate text with tools
content = content.replace(/service\.generateText\("Отметь задачу как выполненную", \{\n\s*tools: \[dummyTool\],\n\s*\}\)/g, 'service.generateText("Отметь задачу как выполненную", {\n    tools: [dummyTool],\n    model: "gemini-3.5-flash"\n  })');

// The withRetry mock needs to match `executeWithRouting` callback signature
content = content.replace(/async \(\) => {\n\s*callCount\+\+;\n\s*const err: any = new Error\("High Demand"\);\n\s*err\.status = 503;\n\s*throw err;\n\s*},\n\s*3,\s*\/\/\s*maxRetries\n\s*10\s*\/\/\s*initialDelay in ms for fast test/g, 
  `async () => {
          callCount++;
          const err: any = new Error("High Demand");
          err.status = 503;
          throw err;
        }`
);

content = content.replace(/async \(\) => {\n\s*callCount\+\+;\n\s*const err: any = new Error\("Invalid argument"\);\n\s*err\.status = 400;\n\s*throw err;\n\s*},\n\s*3,\n\s*10/g, 
  `async () => {
          callCount++;
          const err: any = new Error("Invalid argument");
          err.status = 400;
          throw err;
        }`
);


fs.writeFileSync('packages/ai/test/ai.service.test.ts', content);
