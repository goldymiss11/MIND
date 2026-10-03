import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log("Testing gemini-embedding-2...");
  try {
    const res = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: "hello",
    });
    const vec = res.embeddings?.[0]?.values;
    console.log("WORKED! Length:", vec?.length);
  } catch(e: any) {
    console.error("FAILED:", e?.message);
  }
}
run();
