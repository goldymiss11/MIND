const TASK_TOOLS = [
  {
    functionDeclarations: [
      { name: "update_task", description: "updates a task", parameters: { type: "OBJECT" } }
    ]
  }
];

const groqTools = [];
for (const tool of TASK_TOOLS) {
  if (tool.functionDeclarations) {
    for (const decl of tool.functionDeclarations) {
      groqTools.push({
        type: "function",
        function: {
          name: decl.name,
          description: decl.description,
          parameters: decl.parameters
        }
      });
    }
  } else if (tool.googleSearch) {
      // Ignored for Groq
  }
}
console.log(JSON.stringify(groqTools, null, 2));
