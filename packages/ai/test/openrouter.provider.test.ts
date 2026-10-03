import { test, describe } from "node:test";
import assert from "node:assert";
import { OpenRouterProvider } from "../src/providers/openrouter.provider.js";
import { ProviderErrorCode } from "../src/provider.js";

describe("OpenRouterProvider", () => {
  test("initialization throws if no API key", async () => {
    const original = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    const provider = new OpenRouterProvider();
    await assert.rejects(async () => {
      await provider.generateText("hello");
    }, (err: any) => {
      return err.code === ProviderErrorCode.AUTH_ERROR;
    });

    if (original) {
      process.env.OPENROUTER_API_KEY = original;
    }
  });

  test("capabilities match real OpenRouter abilities", () => {
    const provider = new OpenRouterProvider("fake_key");
    assert.strictEqual(provider.capabilities.supportsStructuredOutput, true);
    assert.strictEqual(provider.capabilities.supportsToolCalling, true);
    assert.strictEqual(provider.capabilities.supportsVision, true);
    assert.strictEqual(provider.capabilities.supportsGoogleSearch, false);
  });

  test("embeddings throw unsupported", async () => {
    const provider = new OpenRouterProvider("fake_key");
    await assert.rejects(
      async () => await provider.generateEmbedding("hello"),
      (err: any) => err.code === ProviderErrorCode.UNSUPPORTED_CAPABILITY
    );
  });
});
