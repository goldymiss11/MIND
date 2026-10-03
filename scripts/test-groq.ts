import "dotenv/config";
import { AiService } from "../packages/ai/src/ai.service.js";

async function run() {
  if (process.env.RUN_GROQ_INTEGRATION_TESTS !== "true") {
    console.log("Skipping Groq integration tests (RUN_GROQ_INTEGRATION_TESTS is not true)");
    return;
  }
  if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY is not set.");
    process.exit(1);
  }

  console.log("Running Groq Integration Test...");
  const ai = new AiService({ groqApiKey: process.env.GROQ_API_KEY });
  
  try {
    const res = await ai.generateText("Hello! Return exactly one word: 'world'.", {
      model: "llama-3.1-8b-instant" // this will route to groq
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
