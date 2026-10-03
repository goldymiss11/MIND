import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";

const ANALYZER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    hasMemory: { type: Type.BOOLEAN },
    memories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          content: { type: Type.STRING },
          importance: { type: Type.INTEGER },
        },
        required: ["type", "content", "importance"],
      }
    },
    hasTask: { type: Type.BOOLEAN },
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          deadline: { type: Type.STRING },
          priority: { type: Type.STRING },
          projectName: { type: Type.STRING }
        },
        required: ["title"],
      }
    }
  },
  required: ["hasMemory", "memories", "hasTask", "tasks"]
};

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log("Testing with model gemini-3.8-flash...");
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: "Мне нужно сдать отчет до пятницы",
      config: {
        responseMimeType: "application/json",
        responseSchema: ANALYZER_SCHEMA
      }
    });
    console.log("WORKED! Result:", res.text);
  } catch(e: any) {
    console.error("FAILED:", e?.message || e);
  }
}
run();
