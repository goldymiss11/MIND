function formatMessagesForGroq(prompt: string, options: any) {
  const messages: any[] = [];
  
  if (options?.systemInstruction) {
    messages.push({ role: "system", content: options.systemInstruction });
  }

  if (options?.history) {
    for (const item of options.history) {
      if (item.role === "system") {
        messages.push({ role: "system", content: item.content });
      } else if (item.role === "user" || item.role === "model" || item.role === "assistant") {
        const groqRole = item.role === "model" ? "assistant" : "user";
        
        // Handle opaque originalParts from GroqProvider itself!
        if (item.parts && item.parts.length === 1 && item.parts[0].tool_calls) {
           // This means we injected the Groq message directly into originalParts!
           messages.push(item.parts[0]);
           continue;
        }

        if (item.parts && item.parts[0]?.functionResponse) {
          // It's a tool response
          for (const part of item.parts) {
             if (part.functionResponse) {
                messages.push({
                   role: "tool",
                   tool_call_id: part.functionResponse.id || part.functionResponse.name, // Groq needs the id
                   name: part.functionResponse.name,
                   content: JSON.stringify(part.functionResponse.response)
                });
             }
          }
          continue;
        }

        if (item.parts && item.parts[0]?.functionCall) {
          // Manually constructed fallback tool call (if originalParts was missing)
          messages.push({
             role: "assistant",
             tool_calls: item.parts.map((p: any, i: number) => ({
                id: p.functionCall.id || `${p.functionCall.name}_${i}`,
                type: "function",
                function: {
                   name: p.functionCall.name,
                   arguments: typeof p.functionCall.args === "string" ? p.functionCall.args : JSON.stringify(p.functionCall.args)
                }
             }))
          });
          continue;
        }

        if (item.parts && item.parts[0]?.text) {
          messages.push({ role: groqRole, content: item.parts.map((p:any)=>p.text).join("\n") });
        } else if (item.content) {
          messages.push({ role: groqRole, content: item.content });
        }
      }
    }
  }

  messages.push({ role: "user", content: prompt });
  return messages;
}

const history = [
  { role: "user", content: "hello" },
  { role: "model", content: "hi" },
  { role: "user", parts: [{ text: "what is weather" }] },
  { role: "model", parts: [{ tool_calls: [{ id: "call_123", type: "function", function: { name: "get_weather", arguments: "{}" } }] }] },
  { role: "user", parts: [{ functionResponse: { id: "call_123", name: "get_weather", response: { temp: 20 } } }] }
];

console.log(JSON.stringify(formatMessagesForGroq("and in tokyo?", { history }), null, 2));
