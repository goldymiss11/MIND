import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.list();
    for (const m of (response as any)) {
      console.log(m.name);
    }
  } catch(e: any) {
    console.error("FAILED:", e?.message);
  }
}
run();
