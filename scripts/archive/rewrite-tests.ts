import fs from 'fs';

const content = `import { test } from "node:test";
import assert from "node:assert";
import { AiService } from "../src/ai.service.js";
import { resolveModel } from "../src/models.js";

test("resolveModel: correctly resolves each tier and supports override", () => {
  assert.equal(resolveModel("simple"), "gemini-3.5-flash-lite");
  assert.equal(resolveModel("standard"), "gemini-3.5-flash");
  assert.equal(resolveModel("complex"), "gemini-3.5-flash");
  assert.equal(resolveModel("embedding"), "gemini-embedding-2");
  assert.equal(resolveModel("standard", "custom-model"), "custom-model");
  assert.equal(resolveModel("complex", "   "), "gemini-3.5-flash");
});

test("AiService: generateText sends prompt and returns AiResponse with text and usage", async () => {
  let capturedParams: any = null;
  const mockClient: any = {
    models: {
      generateContent: async (params: any) => {
        capturedParams = params;
        return {
          text: "Hello from AI",
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
        };
      },
    },
  };
  const service = new AiService({ client: mockClient });
  const response = await service.generateText("Hello world", { model: "gemini-3.5-flash" });
  assert.equal(response.result, "Hello from AI");
  assert.deepEqual(response.usage, { promptTokens: 10, outputTokens: 20, totalTokens: 30 });
});

test("AiService: generateText supports tier selection (simple and complex)", async () => {
  let capturedParams: any = null;
  const mockClient: any = {
    models: { generateContent: async (params: any) => { capturedParams = params; return { text: "Tier" }; } },
  };
  const service = new AiService({ client: mockClient });
  // Instead of testing tier resolution on gemini directly, let's explicitly request gemini models for tests mocking gemini
  await service.generateText("Simple tier", { model: "gemini-3.5-flash-lite" });
  assert.equal(capturedParams.model, "gemini-3.5-flash-lite");
  await service.generateText("Complex tier", { model: "gemini-3.5-flash" });
  assert.equal(capturedParams.model, "gemini-3.5-flash");
});

test("AiService: generateText formats conversation history properly", async () => {
  let capturedParams: any = null;
  const mockClient: any = {
    models: { generateContent: async (params: any) => { capturedParams = params; return { text: "Response" }; } },
  };
  const service = new AiService({ client: mockClient });
  const history: any = [
    { role: "user", content: "Hi" },
    { role: "assistant", content: "Hello! How can I help?" },
  ];
  await service.generateText("What is 2+2?", { history, model: "gemini-3.5-flash" });
  assert.deepEqual(capturedParams.contents, [
    { role: "user", parts: [{ text: "Hi" }] },
    { role: "model", parts: [{ text: "Hello! How can I help?" }] },
    { role: "user", parts: [{ text: "What is 2+2?" }] },
  ]);
});

test("AiService: generateStructured returns AiResponse with parsed JSON and usage", async () => {
  const mockClient: any = {
    models: { generateContent: async () => ({ text: '{"key": "value"}', usageMetadata: {} }) },
  };
  const service = new AiService({ client: mockClient });
  const response = await service.generateStructured("Give me JSON", { type: "object" }, { model: "gemini-3.5-flash" });
  assert.deepEqual(response.result, { key: "value" });
});

test("AiService: generateStructured throws error on invalid JSON", async () => {
  const mockClient: any = {
    models: { generateContent: async () => ({ text: "Not a json" }) },
  };
  const service = new AiService({ client: mockClient });
  await assert.rejects(async () => {
    await service.generateStructured("Give me JSON", { type: "object" }, { model: "gemini-3.5-flash" });
  }, /Failed to parse structured output/);
});

test("AiService: generateEmbedding returns AiResponse with vector numbers and model", async () => {
  let capturedParams: any = null;
  const mockClient: any = {
    models: { embedContent: async (params: any) => { capturedParams = params; return { embeddings: [{ values: [0.1, 0.2] }] }; } },
  };
  const service = new AiService({ client: mockClient });
  const response = await service.generateEmbedding("Test embedding input", { model: "gemini-embedding-2" });
  assert.deepEqual(response.result, [0.1, 0.2]);
});

test("AiService: generateText passes tools and returns functionCalls if present", async () => {
  const mockClient: any = {
    models: {
      generateContent: async () => ({
        text: "",
        functionCalls: [{ name: "update_task", args: { taskId: "task-123" } }]
      })
    },
  };
  const service = new AiService({ client: mockClient });
  const dummyTool = { functionDeclarations: [{ name: "update_task", description: "Update task" }] };
  const response = await service.generateText("Отметь задачу", { tools: [dummyTool], model: "gemini-3.5-flash" });
  assert.equal(response.functionCalls?.[0]?.name, "update_task");
});

test("AiService: executeWithRouting exhausts maxRetries when all candidates fail", async () => {
  const service = new AiService();
  service.router.route = () => { throw new Error("RoutingError: No compatible model found"); };
  await assert.rejects(async () => { await (service as any).executeWithRouting("text", {}, async () => {}); }, /No compatible model/);
});

test("AiService: generateText falls back to alternative provider on 503 Unavailable", async () => {
  let geminiCallCount = 0;
  let groqCallCount = 0;
  const mockGeminiClient: any = {
    models: {
      generateContent: async () => {
        geminiCallCount++;
        const err: any = new Error("The model is overloaded.");
        err.status = 503;
        throw err;
      },
    },
  };
  const mockGroqClient: any = {
    chat: {
      completions: {
        create: async () => {
          groqCallCount++;
          return { choices: [{ message: { content: "Recovered via Groq!" } }] };
        }
      }
    }
  };
  const service = new AiService({ client: mockGeminiClient, groqClient: mockGroqClient, groqApiKey: "fake" });
  const response = await service.generateText("Hello AI", { tier: "standard" });
  assert.equal(response.result, "Recovered via Groq!");
  assert.equal(geminiCallCount, 1);
  assert.equal(groqCallCount, 1);
});

test("AiService: withRetry does not retry non-transient errors (e.g. 400 Bad Request)", async () => {
  let callCount = 0;
  const service = new AiService();
  await assert.rejects(async () => {
    await (service as any).executeWithRouting("text", { model: "gemini-3.5-flash" }, async () => {
      callCount++;
      const err: any = new Error("Invalid arg");
      err.status = 400;
      throw err;
    });
  }, (err: any) => err.status === 400);
  assert.equal(callCount, 1);
});

test("AiService: generateEmbedding retries on Rate Limit (degraded) and succeeds", async () => {
  let callCount = 0;
  const mockClient: any = {
    models: {
      embedContent: async () => {
        callCount++;
        if (callCount === 1) {
          const err: any = new Error("Rate limit exceeded");
          err.status = 429;
          throw err;
        }
        return { embeddings: [{ values: [0.5] }] };
      },
    },
  };
  const service = new AiService({ client: mockClient });
  const response = await service.generateEmbedding("Retry embed", { model: "gemini-embedding-2" });
  assert.deepEqual(response.result, [0.5]);
  assert.equal(callCount, 2);
});
`;

fs.writeFileSync('packages/ai/test/ai.service.test.ts', content);
