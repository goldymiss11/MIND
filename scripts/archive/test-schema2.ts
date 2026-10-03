import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log("Testing gemini-3.5-flash-lite...");
  try {
    await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: "hello",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            test: { type: Type.STRING }
          }
        }
      }
    });
    console.log("3.5-lite WORKED!");
  } catch(e: any) {
    console.error("3.5-lite FAILED:", e?.message);
  }

  console.log("Testing gemini-3.8-flash...");
  try {
    await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: "hello",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            test: { type: Type.STRING }
          }
        }
      }
    });
    console.log("3.8-flash WORKED!");
  } catch(e: any) {
    console.error("3.8-flash FAILED:", e?.message);
  }
}
run();
