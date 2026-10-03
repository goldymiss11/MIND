import "dotenv/config";
import { AiService } from "../packages/ai/src/ai.service.js";

async function run() {
  if (process.env.RUN_CEREBRAS_INTEGRATION_TESTS !== "true") {
    console.log("Skipping Cerebras integration tests (RUN_CEREBRAS_INTEGRATION_TESTS is not true)");
    return;
  }
  if (!process.env.CEREBRAS_API_KEY) {
    console.error("CEREBRAS_API_KEY is not set.");
    process.exit(1);
  }

  console.log("Running Cerebras Integration Test...");
  const ai = new AiService({ cerebrasApiKey: process.env.CEREBRAS_API_KEY });
  
  try {
    const res = await ai.generateText("Hello! Return exactly one word: 'world'.", {
      model: "llama3.1-8b"
    });
    console.log("Response:", res.result);
    console.log("Usage:", res.usage);
    console.log("Model:", res.model);
    console.log("✅ Integration Test Passed!");
  } catch (err: any) {
    console.error("❌ Integration Test Failed:", err.message);
  }
}
run();
