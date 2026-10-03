import { Type } from "@mind/ai";

export const EXECUTION_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    goal: { type: Type.STRING, description: "Main goal of the execution" },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Unique step ID (e.g., 'step_1')" },
          type: { 
            type: Type.STRING, 
            enum: ["think", "retrieve_context", "tool_execution", "generate_artifact", "send_response"],
            description: "Step type" 
          },
          description: { type: Type.STRING, description: "Detailed description of what the step does" },
          dependencies: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of step IDs that must be completed before this step"
          },
          requiredTools: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of tool names required for this step"
          }
        },
        required: ["id", "type", "description"]
      }
    }
  },
  required: ["goal", "steps"]
};
