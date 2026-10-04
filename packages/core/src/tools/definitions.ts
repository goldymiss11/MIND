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
      path.resolve(currentDir, "../../../agents/skills", safeSkillName, "SKILL.md"),
      path.resolve(currentDir, "../../../../agents/skills", safeSkillName, "SKILL.md")
    );
  } catch {
    // fallback
  }

  candidates.push(
    path.resolve(process.cwd(), "packages/agents/skills", safeSkillName, "SKILL.md"),
    path.resolve(process.cwd(), "../agents/skills", safeSkillName, "SKILL.md"),
    path.resolve(process.cwd(), "../../packages/agents/skills", safeSkillName, "SKILL.md"),
    path.resolve(process.cwd(), ".agents/skills", safeSkillName, "SKILL.md"),
    path.resolve(process.cwd(), "../.agents/skills", safeSkillName, "SKILL.md")
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

export const deleteTaskTool: ToolDefinition = {
  name: "delete_task",
  description: "Удаляет задачу пользователя из базы данных по её taskId или названию.",
  inputSchema: {
    type: Type.OBJECT,
    properties: {
      taskId: { type: Type.STRING, description: "UUID задачи для удаления (если известен из активных задач)" },
      taskTitle: { type: Type.STRING, description: "Название или ключевые слова задачи, если ID неизвестен" }
    }
  },
  sideEffect: "internal_write",
  requiresConfirmation: false,
  execute: async (args: any, context: any) => {
    const { db, user } = context;
    const taskId = args.taskId?.trim();
    const taskTitle = args.taskTitle?.trim();

    if (!taskId && !taskTitle) {
      return { success: false, error: "Укажите taskId или taskTitle для удаления" };
    }

    let targetTask = null;
    if (taskId) {
      targetTask = await db.query.tasks.findFirst({
        where: and(eq(schema.tasks.id, taskId), eq(schema.tasks.userId, user.id))
      });
    }

    if (!targetTask && taskTitle) {
      const allTasks = await db.select().from(schema.tasks).where(eq(schema.tasks.userId, user.id));
      targetTask = allTasks.find((t: any) =>
        t.title.toLowerCase().includes(taskTitle.toLowerCase()) ||
        taskTitle.toLowerCase().includes(t.title.toLowerCase())
      );
    }

    if (!targetTask) {
      return { success: false, error: "Задача не найдена среди ваших активных задач." };
    }

    await db.delete(schema.tasks).where(and(eq(schema.tasks.id, targetTask.id), eq(schema.tasks.userId, user.id)));

    return {
      success: true,
      message: `Задача «${targetTask.title}» успешно удалена.`
    };
  }
};

import { markdownToDocx } from "../artifacts/docx.renderer.js";
import { renderXlsx } from "../artifacts/xlsx-renderer.js";
import { renderPptx } from "../artifacts/pptx-renderer.js";
import { SpreadsheetSchema, PresentationSchema } from "../artifacts/schemas.js";

/**
 * Extracts and parses a JSON object from text that may contain markdown formatting or fences.
 */
function extractJsonFromText(raw: string): any {
  const trimmed = raw.trim();
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const toParse = codeBlockMatch && codeBlockMatch[1] ? codeBlockMatch[1].trim() : trimmed;

  try {
    return JSON.parse(toParse);
  } catch {
    const firstBrace = toParse.indexOf("{");
    const lastBrace = toParse.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(toParse.slice(firstBrace, lastBrace + 1));
    }
    throw new Error(`Не удалось распарсить JSON структуры артефакта`);
  }
}

export const invokeSkillTool: ToolDefinition = {
  name: "invoke_skill",
  description: "Вызывает специализированный навык (agent skill): 'document-generation' для создания документов (.docx, .md), 'presentation-generation' для создания презентаций (.pptx), или 'spreadsheet-generation' для таблиц (.xlsx).",
  inputSchema: {
    type: Type.OBJECT,
    properties: {
      skillName: { type: Type.STRING, description: "Название навыка: 'document-generation', 'presentation-generation', 'spreadsheet-generation'" },
      prompt: { type: Type.STRING, description: "Подробный запрос или задание для выполнения навыком" },
      format: { type: Type.STRING, enum: ["docx", "xlsx", "pptx", "md"], description: "Формат файла: 'docx' (документы), 'xlsx' (таблицы), 'pptx' (презентации) или 'md'" },
      content: { type: Type.STRING, description: "Опциональный готовый текст или JSON-контент для артефакта" }
    },
    required: ["skillName", "prompt"]
  },
  sideEffect: "internal_write", // It generates an artifact which is an internal write
  requiresConfirmation: false,
  execute: async (args: any, context: any) => {
    const { ai, generatedArtifacts } = context;
    const skillName = args.skillName?.trim();
    const prompt = args.prompt?.trim();
    const rawFormat = (args.format || "").toLowerCase().trim();
    const directContent = args.content;

    if (!skillName || !prompt) return { success: false, error: "skillName and prompt are required" };

    let format = rawFormat;
    if (!format) {
      if (skillName === "presentation-generation" || /(\.pptx|pptx|презентаци|слайд|powerpoint)/i.test(prompt)) {
        format = "pptx";
      } else if (skillName === "spreadsheet-generation" || /(\.xlsx|xlsx|таблиц|excel|эксель)/i.test(prompt)) {
        format = "xlsx";
      } else if (/(\.docx|docx|в docx|в ворд|word)/i.test(prompt)) {
        format = "docx";
      } else {
        format = "md";
      }
    }

    const skillPath = resolveSkillPath(skillName);
    let skillMdContent = skillPath ? fs.readFileSync(skillPath, "utf-8") : "";

    if (!skillMdContent) {
      if (format === "xlsx" || skillName === "spreadsheet-generation") {
        skillMdContent = "Ты эксперт по анализу данных и созданию таблиц. Сформируй валидный JSON структуры SpreadsheetSchema.";
      } else if (format === "pptx" || skillName === "presentation-generation") {
        skillMdContent = "Ты эксперт по созданию презентаций. Сформируй валидный JSON структуры PresentationSchema.";
      } else if (format === "docx" || skillName === "document-generation") {
        skillMdContent = "Ты эксперт по созданию документов. Сформируй структурированный Markdown.";
      } else {
        return { success: false, error: `Skill '${skillName}' not found` };
      }
    }

    let skillContent = typeof directContent === "string" ? directContent.trim() : "";

    // Generate content with AI if not already provided
    if (!skillContent && typeof directContent !== "object") {
      let systemInstruction = skillMdContent;
      if (format === "xlsx") {
        systemInstruction += `\n\nВАЖНО: Верни строго валидный JSON в формате SpreadsheetSchema без markdown-обёртки:
{
  "title": "Название таблицы",
  "sheetName": "Лист 1",
  "columns": ["Колонка 1", "Колонка 2"],
  "rows": [
    ["Значение 1", "Значение 2"]
  ]
}`;
      } else if (format === "pptx") {
        systemInstruction += `\n\nВАЖНО: Верни строго валидный JSON в формате PresentationSchema без markdown-обёртки:
{
  "title": "Название презентации",
  "author": "MIND",
  "subtitle": "Подзаголовок",
  "slides": [
    {
      "title": "Заголовок слайда",
      "bullets": ["Пункт 1", "Пункт 2"],
      "subtitle": "Подзаголовок слайда"
    }
  ]
}`;
      }

      const skillResponse = await ai.generateText(prompt, {
        tier: "complex",
        systemInstruction,
      });

      skillContent = skillResponse?.result?.trim();
      if (!skillContent) {
        return {
          success: false,
          error: "Навык вернул пустой результат. Файл не был создан."
        };
      }

      if (context.logAiRun) {
        await context.logAiRun(`skill_${path.basename(skillName)}`, skillResponse);
      }
    }

    // 1. XLSX Spreadsheets
    if (format === "xlsx") {
      try {
        const rawJson = typeof directContent === "object" && directContent !== null
          ? directContent
          : extractJsonFromText(skillContent);
        const validated = SpreadsheetSchema.parse(rawJson);
        const xlsxBuffer = await renderXlsx(validated);
        const cleanTitle = (validated.title || validated.sheetName || "таблица")
          .replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "_")
          .slice(0, 30);
        const artifactName = `${cleanTitle}_${Date.now()}.xlsx`;
        generatedArtifacts.push({ name: artifactName, content: xlsxBuffer });

        return {
          success: true,
          message: `Файл ${artifactName} успешно сгенерирован в формате XLSX и отправлен пользователю. Подтверди пользователю, что ты отправил файл таблицы в формате .xlsx.`,
          artifactName
        };
      } catch (xlsxErr: any) {
        console.warn("[invokeSkillTool] XLSX rendering error:", xlsxErr);
        return {
          success: false,
          error: `Ошибка при генерации таблицы XLSX: ${xlsxErr.message}`
        };
      }
    }

    // 2. PPTX Presentations
    if (format === "pptx") {
      try {
        const rawJson = typeof directContent === "object" && directContent !== null
          ? directContent
          : extractJsonFromText(skillContent);
        const validated = PresentationSchema.parse(rawJson);
        const pptxBuffer = await renderPptx(validated);
        const cleanTitle = (validated.title || "презентация")
          .replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "_")
          .slice(0, 30);
        const artifactName = `${cleanTitle}_${Date.now()}.pptx`;
        generatedArtifacts.push({ name: artifactName, content: pptxBuffer });

        return {
          success: true,
          message: `Файл ${artifactName} успешно сгенерирован в формате PPTX и отправлен пользователю. Подтверди пользователю, что ты отправил презентацию в формате .pptx.`,
          artifactName
        };
      } catch (pptxErr: any) {
        console.warn("[invokeSkillTool] PPTX rendering error:", pptxErr);
        return {
          success: false,
          error: `Ошибка при генерации презентации PPTX: ${pptxErr.message}`
        };
      }
    }

    // 3. DOCX Documents
    const titleMatch = typeof skillContent === "string" ? skillContent.match(/^#\s+(.+)$/m) : null;
    const cleanTitle = titleMatch && titleMatch[1]
      ? titleMatch[1].replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "_").slice(0, 30)
      : path.basename(skillName);

    if (format === "docx") {
      try {
        const docxBuffer = await markdownToDocx(skillContent, titleMatch?.[1] || "Документ");
        const artifactName = `${cleanTitle}_${Date.now()}.docx`;
        generatedArtifacts.push({ name: artifactName, content: docxBuffer });

        return {
          success: true,
          message: `Файл ${artifactName} успешно сгенерирован в формате DOCX и отправлен пользователю. Подтверди пользователю, что ты отправил файл именно в формате .docx.`,
          artifactName
        };
      } catch (docxErr: any) {
        console.warn("[invokeSkillTool] DOCX conversion failed, falling back to markdown:", docxErr);
      }
    }

    // 4. Markdown fallback
    const artifactName = `${cleanTitle}_${Date.now()}.md`;
    generatedArtifacts.push({ name: artifactName, content: skillContent });

    return {
      success: true,
      message: "Файл успешно сгенерирован и будет прикреплен к сообщению автоматически. Просто скажи юзеру, что документ готов.",
      artifactName
    };
  }
};
