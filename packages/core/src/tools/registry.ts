import { ToolDefinition } from "../types/execution.js";

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition) {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} is already registered.`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getAiToolDeclarations(): { name: string; description: string; parameters: Record<string, any> }[] {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }));
  }
}

export const toolRegistry = new ToolRegistry();

import { updateTaskTool, deleteTaskTool, invokeSkillTool } from "./definitions.js";
toolRegistry.register(updateTaskTool);
toolRegistry.register(deleteTaskTool);
toolRegistry.register(invokeSkillTool);
