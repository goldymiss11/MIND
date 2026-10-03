import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log("Testing text-embedding-004...");
  try {
    const res = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: "hello",
    });
    console.log("WORKED!", res.embeddings?.[0]?.values?.slice(0, 5));
  } catch(e: any) {
    console.error("004 FAILED:", e?.message);
  }

  console.log("Testing embedding-001...");
  try {
    const res = await ai.models.embedContent({
      model: "embedding-001",
      contents: "hello",
    });
    console.log("WORKED!", res.embeddings?.[0]?.values?.slice(0, 5));
  } catch(e: any) {
    console.error("001 FAILED:", e?.message);
  }
}
run();
