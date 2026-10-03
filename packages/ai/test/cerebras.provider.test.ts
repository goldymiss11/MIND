import { test, describe } from "node:test";
import assert from "node:assert";
import { CerebrasProvider } from "../src/providers/cerebras.provider.js";
import { ProviderErrorCode } from "../src/provider.js";

describe("CerebrasProvider", () => {
  test("initialization throws if no API key", async () => {
    const original = process.env.CEREBRAS_API_KEY;
    delete process.env.CEREBRAS_API_KEY;
    
    const provider = new CerebrasProvider();
    await assert.rejects(async () => {
       await provider.generateText("hello");
    }, (err: any) => {
       assert.strictEqual(err.code, ProviderErrorCode.AUTH_ERROR);
       return true;
    });
    
    if (original) {
      process.env.CEREBRAS_API_KEY = original;
    }
  });

  test("capabilities match real Cerebras abilities", () => {
    const provider = new CerebrasProvider("fake_key");
    assert.strictEqual(provider.capabilities.supportsStructuredOutput, true);
    assert.strictEqual(provider.capabilities.supportsToolCalling, true);
    assert.strictEqual(provider.capabilities.supportsVision, false);
  });

  test("embeddings throw unsupported", async () => {
    const provider = new CerebrasProvider("fake_key");
    await assert.rejects(
      async () => await provider.generateEmbedding("hello"),
      (err: any) => {
         assert.strictEqual(err.code, ProviderErrorCode.UNSUPPORTED_CAPABILITY);
         return true;
      }
    );
  });
});
