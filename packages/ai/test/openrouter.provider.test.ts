import { test, describe } from "node:test";
import assert from "node:assert";
import { OpenRouterProvider } from "../src/providers/openrouter.provider.js";
import { ProviderErrorCode } from "../src/provider.js";

describe("OpenRouterProvider", () => {
  test("initialization throws if no API key", async () => {
    const aliases = ["OPENROUTER_API_KEY", "OPEN_ROUTER_API", "OPEN_ROUTER_API_KEY", "OPENROUTER_API"];
    const originals = aliases.map((name) => process.env[name]);
    aliases.forEach((name) => delete process.env[name]);

    const provider = new OpenRouterProvider();
    await assert.rejects(async () => {
      await provider.generateText("hello");
    }, (err: any) => {
      return err.code === ProviderErrorCode.AUTH_ERROR;
    });

    aliases.forEach((name, i) => {
      if (originals[i]) process.env[name] = originals[i];
    });
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
