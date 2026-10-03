import { test, describe } from "node:test";
import assert from "node:assert";
import { GroqProvider } from "../src/providers/groq.provider.js";
import { ProviderErrorCode } from "../src/provider.js";

describe("GroqProvider", () => {
  test("initialization throws if no API key", async () => {
    const original = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    
    const provider = new GroqProvider();
    await assert.rejects(async () => {
       await provider.generateText("hello");
    }, (err: any) => {
       return err.code === ProviderErrorCode.AUTH_ERROR;
    });
    
    if (original) {
      process.env.GROQ_API_KEY = original;
    }
  });

  test("capabilities match real Groq abilities", () => {
    const provider = new GroqProvider("fake_key");
    assert.strictEqual(provider.capabilities.supportsStructuredOutput, true);
    assert.strictEqual(provider.capabilities.supportsToolCalling, true);
    assert.strictEqual(provider.capabilities.supportsVision, false);
  });

  test("embeddings throw unsupported", async () => {
    const provider = new GroqProvider("fake_key");
    await assert.rejects(
      async () => await provider.generateEmbedding("hello"),
      (err: any) => err.code === ProviderErrorCode.UNSUPPORTED_CAPABILITY
    );
  });
});
