import { ToolDefinition } from "../types/execution.js";
import { Type } from "@mind/ai";
import { and, eq } from "drizzle-orm";
import { schema } from "@mind/db";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Need to safely resolve skill paths.
export function resolveSkillPath(skillName: string): string | null {
  const safeSkillName = path.basename(skillName);
  const candidates: string[] = [];

  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    candidates.push(
      path.resolve(currentDir, "../../../../agents/skills", safeSkillName, "SKILL.md")
    );
  } catch {
    // fallback
  }

  candidates.push(
    path.resolve(process.cwd(), "packages/agents/skills", safeSkillName, "SKILL.md"),
    path.resolve(process.cwd(), ".agents/skills", safeSkillName, "SKILL.md")
  );

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export const updateTaskTool: ToolDefinition = {
  name: "update_task",
  description: "Обновляет статус или дедлайн существующей активной задачи пользователя.",
  inputSchema: {
    type: Type.OBJECT,
    properties: {
      taskId: { type: Type.STRING, description: "UUID задачи" },
      status: { type: Type.STRING, enum: ["inbox", "in_progress", "blocked", "completed", "cancelled"], description: "Статус задачи" },
      deadline: { type: Type.STRING, description: "Дедлайн (опционально, ISO дата)" }
    },
    required: ["taskId"]
  },
  sideEffect: "internal_write",
  requiresConfirmation: false,
  execute: async (args: any, context: any) => {
    const { db, user } = context;
    const taskId = args.taskId?.trim();
    const status = args.status?.trim();
    const deadline = args.deadline;

    if (!taskId) return { success: false, error: "taskId is required" };

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (status) {
      updateData.status = status;
      if (status === "completed") updateData.completedAt = new Date();
    }
    if (deadline !== undefined) {
      if (deadline === null || deadline === "") updateData.deadline = null;
      else {
        const parsed = new Date(deadline);
        if (!isNaN(parsed.getTime())) updateData.deadline = parsed;
      }
    }

    const updated = await db.update(schema.tasks)
      .set(updateData)
      .where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.userId, user.id)))
      .returning();

    const updatedRecord = updated?.[0];
    if (updatedRecord) {
      return {
        success: true,
        taskId,
        status: updatedRecord.status,
        deadline: updatedRecord.deadline ? new Date(updatedRecord.deadline).toISOString() : null
      };
    } else {
      return { success: false, error: `Task with id ${taskId} not found or unauthorized` };
    }
  }
};

export const invokeSkillTool: ToolDefinition = {
  name: "invoke_skill",
  description: "Вызывает специализированный навык (agent skill), например 'document-generation' для создания структурированных текстов, лонгридов, статей и документов в формате Markdown.",
  inputSchema: {
    type: Type.OBJECT,
    properties: {
      skillName: { type: Type.STRING, description: "Название навыка (например, 'document-generation')" },
      prompt: { type: Type.STRING, description: "Подробный запрос или задание для выполнения навыком" }
    },
    required: ["skillName", "prompt"]
  },
  sideEffect: "internal_write", // It generates an artifact which is an internal write
  requiresConfirmation: false,
  execute: async (args: any, context: any) => {
    const { ai, generatedArtifacts } = context;
    const skillName = args.skillName?.trim();
    const prompt = args.prompt?.trim();

    if (!skillName || !prompt) return { success: false, error: "skillName and prompt are required" };

    const skillPath = resolveSkillPath(skillName);
    if (!skillPath) return { success: false, error: `Skill '${skillName}' not found` };

    const skillMdContent = fs.readFileSync(skillPath, "utf-8");
    const skillResponse = await ai.generateText(prompt, {
      tier: "complex",
      systemInstruction: skillMdContent,
    });
    
    // We should probably log this Ai run, but context will handle it if needed.
    if (context.logAiRun) {
       await context.logAiRun(`skill_${path.basename(skillName)}`, skillResponse);
    }

    const artifactName = `${skillName}_${Date.now()}.md`;
    generatedArtifacts.push({ name: artifactName, content: skillResponse.result });

    return {
      success: true,
      message: "Файл успешно сгенерирован и будет прикреплен к сообщению автоматически. Просто скажи юзеру, что документ готов.",
      artifactName
    };
  }
};
