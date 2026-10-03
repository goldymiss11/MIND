import { Type } from "@mind/ai";

export const INTENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.STRING,
      enum: ["chat", "task", "reminder", "memory", "research", "document", "artifact", "complex"],
      description: "The primary user intent."
    },
    confidence: { type: Type.NUMBER, description: "Confidence score from 0.0 to 1.0" },
    requiresPlan: { type: Type.BOOLEAN, description: "True if the request is complex and requires a multi-step execution plan" }
  },
  required: ["intent", "confidence", "requiresPlan"]
};
