import fs from 'fs';

let content = fs.readFileSync('packages/ai/src/providers/cerebras.provider.ts', 'utf8');

content = content.replace(/import Groq from "groq-sdk";/g, 'import Cerebras from "@cerebras/cerebras_cloud_sdk";');
content = content.replace(/GroqProvider/g, 'CerebrasProvider');
content = content.replace(/Groq/g, 'Cerebras');
content = content.replace(/groq/g, 'cerebras');
content = content.replace(/GROQ_API_KEY/g, 'CEREBRAS_API_KEY');
content = content.replace(/llama-3.1-8b-instant/g, 'llama3.1-8b');

fs.writeFileSync('packages/ai/src/providers/cerebras.provider.ts', content);
