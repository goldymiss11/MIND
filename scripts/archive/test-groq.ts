import Groq from "groq-sdk";
import "dotenv/config";

async function run() {
  if (!process.env.GROQ_API_KEY) {
    console.log("No GROQ_API_KEY");
    return;
  }
  const groq = new Groq();
  try {
    const res = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Return { \"hello\": \"world\" }. Output ONLY JSON." }],
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
    });
    console.log("JSON:", res.choices[0]?.message?.content);
    
    const resTool = await groq.chat.completions.create({
      messages: [{ role: "user", content: "What is the weather in Tokyo?" }],
      model: "llama-3.1-8b-instant",
      tools: [{
        type: "function",
        function: {
          name: "get_weather",
          description: "Get weather",
          parameters: { type: "object", properties: { location: { type: "string" } }, required: ["location"] }
        }
      }],
      tool_choice: "auto"
    });
    console.log("Tool call:", JSON.stringify(resTool.choices[0]?.message?.tool_calls));
  } catch(e:any) {
    console.error("Groq error:", e.message);
  }
}
run();
