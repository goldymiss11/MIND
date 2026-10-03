import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log("Testing lowercase schema type...");
  try {
    await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: "hello",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object" as any,
          properties: {
            test: { type: "string" as any }
          }
        }
      }
    });
    console.log("Lowercase WORKED!");
  } catch(e: any) {
    console.error("Lowercase FAILED:", e?.message);
  }

  console.log("Testing uppercase schema type...");
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
    console.log("Uppercase WORKED!");
  } catch(e: any) {
    console.error("Uppercase FAILED:", e?.message);
  }
}
run();
