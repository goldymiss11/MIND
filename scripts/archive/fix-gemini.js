import fs from 'fs';

let content = fs.readFileSync('packages/ai/src/providers/gemini.provider.ts', 'utf8');

// Replace formatContentsWithHistory
const oldFormat = `  private formatContentsWithHistory(prompt: string, history?: any[]): any {
    if (!history || history.length === 0) {
      return prompt;
    }

    const formattedHistory = history.map((item) => {
      if (typeof item === "string") {
        return { role: "user", parts: [{ text: item }] };
      }
      if (item && item.parts) {
        return item;
      }
      if (item && item.functionCalls) {
        return {
          role: item.role ?? "model",
          parts: item.functionCalls.map((fc: any) => ({
            functionCall: fc.functionCall ?? fc,
          })),
        };
      }
      if (item && item.functionResponses) {
        return {
          role: item.role ?? "user",
          parts: item.functionResponses.map((fr: any) => ({
            functionResponse: fr.functionResponse ?? fr,
          })),
        };
      }
      if (item && typeof item.content === "string") {
        const role = item.role === "assistant" ? "model" : (item.role ?? "user");
        return { role, parts: [{ text: item.content }] };
      }
      return item;
    });

    if (!prompt || !prompt.trim()) {
      return formattedHistory;
    }
    return [...formattedHistory, { role: "user", parts: [{ text: prompt }] }];
  }`;

const newFormat = `  private formatContentsWithHistory(prompt: string, history?: import('../types.js').AiMessage[]): any {
    if (!history || history.length === 0) {
      return prompt;
    }

    const formattedHistory = history.map((item) => {
      const role = item.role === "assistant" ? "model" : "user";
      
      if (item.originalParts) {
         return { role, parts: item.originalParts };
      }
      if (item.toolResponses) {
         return {
           role: "user",
           parts: item.toolResponses.map(r => ({
             functionResponse: {
                name: r.name,
                response: r.response,
                ...(r.id ? { id: r.id } : {})
             }
           }))
         };
      }
      if (item.toolCalls) {
         return {
           role: "model",
           parts: item.toolCalls.map(c => ({
             functionCall: {
                name: c.name,
                args: c.args,
                ...(c.id ? { id: c.id } : {})
             }
           }))
         };
      }
      return { role, parts: [{ text: item.content || "" }] };
    });

    if (!prompt || !prompt.trim()) {
      return formattedHistory;
    }
    return [...formattedHistory, { role: "user", parts: [{ text: prompt }] }];
  }`;

content = content.replace(oldFormat, newFormat);
fs.writeFileSync('packages/ai/src/providers/gemini.provider.ts', content);
