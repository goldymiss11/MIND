import fs from 'fs';

let content = fs.readFileSync('packages/ai/src/ai.service.ts', 'utf8');

// 1. Imports
content = content.replace(
  /import \{ GroqProvider \} from ".\/providers\/groq.provider.js";/,
  'import { GroqProvider } from "./providers/groq.provider.js";\nimport { CerebrasProvider } from "./providers/cerebras.provider.js";'
);
content = content.replace(
  /import type Groq from "groq-sdk";/,
  'import type Groq from "groq-sdk";\nimport type Cerebras from "@cerebras/cerebras_cloud_sdk";'
);

// 2. Config
content = content.replace(
  /groqClient\?: Groq;\n\}/,
  'groqClient?: Groq;\n  cerebrasApiKey?: string;\n  cerebrasClient?: Cerebras;\n}'
);

// 3. Constructor
content = content.replace(
  /const groq = new GroqProvider\(config\?.groqApiKey, config\?.groqClient\);/,
  'const groq = new GroqProvider(config?.groqApiKey, config?.groqClient);\n    const cerebras = new CerebrasProvider(config?.cerebrasApiKey, config?.cerebrasClient);'
);
content = content.replace(
  /providers = \{\n      gemini,\n      groq,\n    \};/,
  'providers = {\n      gemini,\n      groq,\n      cerebras,\n    };'
);

// 4. Router hack
content = content.replace(
  /if \(options\?\.model\?\.startsWith\("llama"\) \|\| options\?\.model\?\.startsWith\("mixtral"\) \|\| options\?\.model\?\.startsWith\("gemma"\)\) \{/,
  'if (options?.model === "llama3.1-8b" || options?.model === "llama3.3-70b" || options?.model === "llama3.1-70b") {\n      return this.providers["cerebras"]!;\n    }\n    if (options?.model?.startsWith("llama") || options?.model?.startsWith("mixtral") || options?.model?.startsWith("gemma")) {'
);

fs.writeFileSync('packages/ai/src/ai.service.ts', content);
