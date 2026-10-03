import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.7-flash", "gemini-flash-latest", "gemini-3.5-flash-lite"];
  
  for (const m of models) {
    console.log(`Testing ${m}...`);
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: "Hello",
      });
      console.log(`SUCCESS ${m}:`, res.text);
      return m; // Stop on first success
    } catch(e: any) {
      console.error(`FAILED ${m}:`, e?.message);
    }
  }
}
run();
