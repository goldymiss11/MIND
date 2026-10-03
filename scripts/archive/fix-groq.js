import fs from 'fs';

let content = fs.readFileSync('packages/ai/src/providers/groq.provider.ts', 'utf8');

const oldFormat = `  private formatMessages(prompt: string, options?: GenerateTextOptions | GenerateStructuredOptions): any[] {
    const messages: any[] = [];
    
    if (options?.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction });
    }

    if ((options as any)?.history) {
      for (const item of (options as any).history) {
        if (item.role === "system") {
          messages.push({ role: "system", content: item.content });
        } else if (item.role === "user" || item.role === "model" || item.role === "assistant") {
          const groqRole = item.role === "model" ? "assistant" : "user";
          
          if (item.parts && item.parts.length === 1 && item.parts[0].tool_calls) {
             messages.push(item.parts[0]);
             continue;
          }

          if (item.parts && item.parts[0]?.functionResponse) {
            for (const part of item.parts) {
               if (part.functionResponse) {
                  messages.push({
                     role: "tool",
                     tool_call_id: part.functionResponse.id || part.functionResponse.name,
                     name: part.functionResponse.name,
                     content: JSON.stringify(part.functionResponse.response)
                  });
               }
            }
            continue;
          }

          if (item.parts && item.parts[0]?.functionCall) {
            messages.push({
               role: "assistant",
               tool_calls: item.parts.map((p: any, i: number) => ({
                  id: p.functionCall.id || \`\${p.functionCall.name}_\${i}\`,
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
            messages.push({ role: groqRole, content: item.parts.map((p:any)=>p.text).join("\\n") });
          } else if (item.content) {
            messages.push({ role: groqRole, content: item.content });
          }
        }
      }
    }

    if (prompt && prompt.trim()) {
      messages.push({ role: "user", content: prompt });
    }
    
    return messages;
  }`;

const newFormat = `  private formatMessages(prompt: string, options?: GenerateTextOptions | GenerateStructuredOptions): any[] {
    const messages: any[] = [];
    
    if (options?.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction });
    }

    if (options?.history) {
      for (const item of options.history) {
        if (item.role === "system") {
          messages.push({ role: "system", content: item.content });
          continue;
        }

        if (item.role === "tool" || item.toolResponses) {
           for (const resp of (item.toolResponses || [])) {
              messages.push({
                 role: "tool",
                 tool_call_id: resp.id || resp.name,
                 name: resp.name,
                 content: JSON.stringify(resp.response)
              });
           }
           continue;
        }

        if (item.originalParts && item.originalParts.length === 1 && item.originalParts[0].tool_calls) {
           messages.push(item.originalParts[0]);
           continue;
        }

        if (item.toolCalls) {
           messages.push({
              role: "assistant",
              tool_calls: item.toolCalls.map((c, i) => ({
                 id: c.id || \`\${c.name}_\${i}\`,
                 type: "function",
                 function: {
                    name: c.name,
                    arguments: typeof c.args === "string" ? c.args : JSON.stringify(c.args)
                 }
              }))
           });
           continue;
        }

        messages.push({
           role: item.role === "assistant" || item.role === "model" ? "assistant" : "user",
           content: item.content || ""
        });
      }
    }

    if (prompt && prompt.trim()) {
      messages.push({ role: "user", content: prompt });
    }
    
    return messages;
  }`;

content = content.replace(oldFormat, newFormat);
fs.writeFileSync('packages/ai/src/providers/groq.provider.ts', content);
