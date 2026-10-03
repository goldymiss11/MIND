import fs from 'fs';
let content = fs.readFileSync('packages/ai/src/models.ts', 'utf8');

content = content.replace(/},\n  "llama-3\.3-70b-versatile": \{\n    provider: "groq",\n    model: "llama-3\.3-70b-versatile",\n    capabilities: \{ supportsStructuredOutput: true, supportsToolCalling: true, supportsVision: false, supportsEmbeddings: false \},\n  }\n\n  "llama3\.1-8b"/g,
'},\\n  "llama-3.3-70b-versatile": {\\n    provider: "groq",\\n    model: "llama-3.3-70b-versatile",\\n    capabilities: { supportsStructuredOutput: true, supportsToolCalling: true, supportsVision: false, supportsEmbeddings: false },\\n  },\\n\\n  "llama3.1-8b"');

fs.writeFileSync('packages/ai/src/models.ts', content);
