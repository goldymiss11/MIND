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

/**
 * Strips markdown code fences (```lang ... ```) and returns strictly valid, executable code.
 */
export function stripCodeFences(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();

  // 1. Entire string wrapped in code fences (e.g. ```python\n...\n```)
  const fullBlockMatch = trimmed.match(/^```[a-zA-Z0-9_+#.-]*\r?\n([\s\S]*)\r?\n```$/);
  if (fullBlockMatch && fullBlockMatch[1] !== undefined) {
    return fullBlockMatch[1].trim();
  }

  // 2. Fenced block inside text
  const blockMatch = trimmed.match(/```[a-zA-Z0-9_+#.-]*\r?\n([\s\S]*?)\r?\n```/);
  if (blockMatch && blockMatch[1] !== undefined) {
    return blockMatch[1].trim();
  }

  // 3. Single-line code fence
  const singleLineMatch = trimmed.match(/^```[a-zA-Z0-9_+#.-]*\s*([\s\S]*?)\s*```$/);
  if (singleLineMatch && singleLineMatch[1] !== undefined) {
    return singleLineMatch[1].trim();
  }

  // 4. Fallback: strip leading ```lang or trailing ``` if unmatched
  return trimmed
    .replace(/^```[a-zA-Z0-9_+#.-]*\r?\n?/, "")
    .replace(/\r?\n?```$/, "")
    .trim();
}

export const invokeSkillTool: ToolDefinition = {
  name: "invoke_skill",
  description: "MUST use this tool to generate downloadable files: DOCX, PPTX, XLSX, as well as programming code files (.py, .sql, .cpp, .js, .ts, .html, .json). Do NOT dump raw code into chat if the user asks for a script, program or lab work — output it as a real code file! MUST use this tool to generate Excel spreadsheets (.xlsx) and PowerPoint presentations (.pptx). Do NOT output markdown tables if the user asks for a table/excel. Do NOT hallucinate download links.",
  inputSchema: {
    type: Type.OBJECT,
    properties: {
      skillName: { type: Type.STRING, description: "Название навыка: 'document-generation', 'presentation-generation', 'spreadsheet-generation', 'coding'" },
      prompt: { type: Type.STRING, description: "Подробный запрос или задание для выполнения навыком" },
      format: {
        type: Type.STRING,
        enum: ["docx", "md", "txt", "pptx", "xlsx", "py", "sql", "cpp", "c", "js", "ts", "html", "css", "json"],
        description: "Формат файла: 'docx', 'md', 'txt', 'pptx', 'xlsx', 'py', 'sql', 'cpp', 'c', 'js', 'ts', 'html', 'css', 'json'"
      },
      extension: {
        type: Type.STRING,
        enum: ["docx", "md", "txt", "pptx", "xlsx", "py", "sql", "cpp", "c", "js", "ts", "html", "css", "json"],
        description: "Расширение файла: 'docx', 'md', 'txt', 'pptx', 'xlsx', 'py', 'sql', 'cpp', 'c', 'js', 'ts', 'html', 'css', 'json'"
      },
      content: { type: Type.STRING, description: "Опциональный готовый текст или JSON-контент для артефакта" },
      filename: { type: Type.STRING, description: "Опциональное имя файла (например, 'script.py', 'main.cpp', 'schema.sql')" },
      isGost: { type: Type.BOOLEAN, description: "Применять ли оформление по ГОСТ 7.32 / 2.105 (Times New Roman 14pt, 1.5 интервал, поля 30/10/20/20 мм, абзацный отступ 1.25 см)" }
    },
    required: ["prompt"]
  },
  sideEffect: "internal_write", // It generates an artifact which is an internal write
  requiresConfirmation: false,
  execute: async (args: any, context: any) => {
    const { ai, generatedArtifacts, db, user } = context;
    const prompt = args.prompt?.trim();
    let skillName = args.skillName?.trim();
    const rawFormat = (args.format || args.extension || "").toLowerCase().trim();
    const directContent = args.content;
    const isGost = Boolean(
      args.isGost === true ||
      args.options?.isGost === true ||
      /гост|реферат|курсов|лабораторн|отч[её]т|по стандарту/i.test(prompt || "")
    );

    const persistArtifact = async (name: string, type: string, textContent: string | null = null) => {
      if (db && user?.id) {
        try {
          await db.insert(schema.artifacts).values({
            userId: user.id,
            conversationId: context.conversationId ?? null,
            name,
            type,
            content: textContent,
            storagePath: null,
            taskId: context.taskId ?? null,
          });
        } catch (dbErr: any) {
          console.warn("[invokeSkillTool] Failed to persist artifact to DB:", dbErr);
        }
      }
    };

    if (!prompt) return { success: false, error: "prompt is required" };

    let format = rawFormat;
    if (!format) {
      if (skillName === "presentation-generation" || /(\.pptx|pptx|презентаци|слайд|powerpoint)/i.test(prompt)) {
        format = "pptx";
      } else if (/(\.sql|sql|баз[аы] данных|скрипт бд|create table)/i.test(prompt)) {
        format = "sql";
      } else if (/(\.py|python|питон)/i.test(prompt)) {
        format = "py";
      } else if (skillName === "spreadsheet-generation" || /(\.xlsx|xlsx|таблиц|excel|эксель)/i.test(prompt)) {
        format = "xlsx";
      } else if (/(\.cpp|c\+\+|плюс[ыа])/i.test(prompt)) {
        format = "cpp";
      } else if (/(\.c\b)/i.test(prompt)) {
        format = "c";
      } else if (/(\.ts|typescript)/i.test(prompt)) {
        format = "ts";
      } else if (/(\.js|javascript)/i.test(prompt)) {
        format = "js";
      } else if (/(\.html|веб-страниц|верстк)/i.test(prompt)) {
        format = "html";
      } else if (/(\.css|стили)/i.test(prompt)) {
        format = "css";
      } else if (/(\.json|json)/i.test(prompt)) {
        format = "json";
      } else if (/(txt|текст)/i.test(prompt)) {
        format = "txt";
      } else if (/(\.docx|docx|в docx|в ворд|word)/i.test(prompt)) {
        format = "docx";
      } else {
        format = "md";
      }
    }

    // Guard against presentation, spreadsheet or code mistakenly routed with docx format
    if (format === "docx" && !/(\.docx|docx|в docx|в ворд|word)/i.test(prompt)) {
      if (skillName === "presentation-generation" || /(\.pptx|pptx|презентаци|слайд|powerpoint)/i.test(prompt)) {
        format = "pptx";
      } else if (/(\.sql|sql|баз[аы] данных|скрипт бд|create table)/i.test(prompt)) {
        format = "sql";
      } else if (/(\.py|python|питон)/i.test(prompt)) {
        format = "py";
      } else if (skillName === "spreadsheet-generation" || /(\.xlsx|xlsx|таблиц|excel|эксель)/i.test(prompt)) {
        format = "xlsx";
      } else if (/(\.cpp|c\+\+|плюс[ыа])/i.test(prompt)) {
        format = "cpp";
      } else if (/(\.c\b)/i.test(prompt)) {
        format = "c";
      } else if (/(\.ts|typescript)/i.test(prompt)) {
        format = "ts";
      } else if (/(\.js|javascript)/i.test(prompt)) {
        format = "js";
      } else if (/(\.html|веб-страниц|верстк)/i.test(prompt)) {
        format = "html";
      }
    }

    const codeFormats = ["py", "sql", "cpp", "c", "js", "ts", "html", "css", "json"];
    const isCodeFormat = codeFormats.includes(format);

    // Auto-infer skillName if omitted
    if (!skillName) {
      if (format === "pptx") {
        skillName = "presentation-generation";
      } else if (format === "xlsx") {
        skillName = "spreadsheet-generation";
      } else if (isCodeFormat) {
        skillName = "coding";
      } else {
        skillName = "document-generation";
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
      } else if (isCodeFormat || skillName === "coding") {
        skillMdContent = `Ты senior software engineer. Напиши чистый, рабочий, готовый к выполнению исходный код на ${format}.`;
      } else {
        skillMdContent = "Ты эксперт по созданию артефактов и файлов.";
      }
    }

    let skillContent = typeof directContent === "string" ? directContent.trim() : "";

    // Determine if structured input was provided directly in args
    const hasDirectPptxData = Array.isArray(args.slides) ||
      (typeof directContent === "object" && directContent !== null && Array.isArray((directContent as any).slides)) ||
      (typeof args.data === "object" && args.data !== null && Array.isArray((args.data as any).slides));

    const hasDirectXlsxData = Array.isArray(args.columns) ||
      (typeof directContent === "object" && directContent !== null && Array.isArray((directContent as any).columns)) ||
      (typeof args.data === "object" && args.data !== null && Array.isArray((args.data as any).columns));

    const hasDirectStructuredData = (format === "pptx" && hasDirectPptxData) || (format === "xlsx" && hasDirectXlsxData);

    // Generate content with AI if not already provided
    if (!skillContent && !hasDirectStructuredData && typeof directContent !== "object") {
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
} \n\nВАЖНО: Никаких markdown code blocks, только чистый JSON!`;
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
      } else if (isCodeFormat) {
        systemInstruction += `\n\nВАЖНО: Ты создаешь файл исходного кода с расширением .${format}.
Верни ТОЛЬКО валидный исполняемый код программы без пояснительного текста до и после кода. Оберни код в блок \`\`\`${format} ... \`\`\` или верни чистый код. Никаких вводных слов и пояснений.`;
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

    switch (format) {
      case "pptx": {
        try {
          let rawJson: any;
          if (Array.isArray(args.slides)) {
            rawJson = {
              title: args.title || "Презентация",
              author: args.author || "MIND",
              subtitle: args.subtitle,
              slides: args.slides
            };
          } else if (typeof directContent === "object" && directContent !== null) {
            rawJson = directContent;
          } else if (typeof args.data === "object" && args.data !== null) {
            rawJson = args.data;
          } else {
            rawJson = extractJsonFromText(skillContent);
          }

          const validated = PresentationSchema.parse(rawJson);
          const pptxBuffer = await renderPptx(validated);
          const cleanTitle = (validated.title || "презентация")
            .replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "_")
            .slice(0, 30);
          const artifactName = `${cleanTitle}_${Date.now()}.pptx`;
          generatedArtifacts.push({ name: artifactName, content: pptxBuffer });
          await persistArtifact(artifactName, "pptx", null);

          return {
            success: true,
            message: `Файл ${artifactName} успешно сгенерирован в формате PPTX и отправлен пользователю. ВАЖНО: Файл УЖЕ прикреплен к твоему ответу платформой. НИКОГДА НЕ ПИШИ ссылки на скачивание (никаких sandbox:/ или markdown-ссылок). Просто скажи текстом, что презентация готова.`,
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

      case "xlsx": {
        try {
          let rawJson: any;
          if (Array.isArray(args.columns)) {
            rawJson = {
              title: args.title,
              sheetName: args.sheetName || "Лист 1",
              columns: args.columns,
              rows: Array.isArray(args.rows) ? args.rows : []
            };
          } else if (typeof directContent === "object" && directContent !== null) {
            rawJson = directContent;
          } else if (typeof args.data === "object" && args.data !== null) {
            rawJson = args.data;
          } else {
            rawJson = extractJsonFromText(skillContent);
          }

          const validated = SpreadsheetSchema.parse(rawJson);
          const xlsxBuffer = await renderXlsx(validated);
          const cleanTitle = (validated.title || validated.sheetName || "таблица")
            .replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "_")
            .slice(0, 30);
          const artifactName = `${cleanTitle}_${Date.now()}.xlsx`;
          generatedArtifacts.push({ name: artifactName, content: xlsxBuffer });
          await persistArtifact(artifactName, "xlsx", null);

          return {
            success: true,
            message: `Файл ${artifactName} успешно сгенерирован в формате XLSX и отправлен пользователю. ВАЖНО: Файл УЖЕ прикреплен к твоему ответу платформой. НИКОГДА НЕ ПИШИ ссылки на скачивание (никаких sandbox:/ или markdown-ссылок). Просто скажи текстом, что таблица готова.`,
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

      case "py":
      case "sql":
      case "cpp":
      case "c":
      case "js":
      case "ts":
      case "html":
      case "css":
      case "json": {
        const rawContent = skillContent || (typeof directContent === "string" ? directContent : (typeof directContent === "object" && directContent !== null ? JSON.stringify(directContent, null, 2) : ""));
        const cleanCode = stripCodeFences(rawContent);
        const codeBuffer = Buffer.from(cleanCode, "utf-8");

        const explicitFileMatch = typeof prompt === "string" ? prompt.match(new RegExp(`\\b([a-zA-Z0-9_\\-]+\\.${format})\\b`, "i")) : null;
        const explicitName = (args.filename || args.name || (explicitFileMatch ? explicitFileMatch[1] : null))?.trim();

        let artifactName: string;
        if (explicitName) {
          const baseExplicit = path.basename(explicitName);
          artifactName = baseExplicit.toLowerCase().endsWith(`.${format}`) ? baseExplicit : `${baseExplicit}.${format}`;
        } else {
          let cleanTitle = "code";
          if (args.title) {
            cleanTitle = String(args.title).replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "_").slice(0, 30);
          } else {
            const commentTitleMatch = cleanCode.match(/^(?:#|\/\/|\/\*|--)\s*(?:file:?\s*)?([a-zA-Z0-9_.-]+)/im);
            if (commentTitleMatch && commentTitleMatch[1]) {
              cleanTitle = commentTitleMatch[1].replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "_").slice(0, 30);
            } else if (prompt) {
              const promptKeywords = prompt.replace(/[^a-zA-Zа-яА-Я0-9_]/g, "_").replace(/_+/g, "_").slice(0, 20);
              cleanTitle = promptKeywords || format;
            } else {
              cleanTitle = format;
            }
          }
          cleanTitle = cleanTitle.replace(/^_+|_+$/g, "") || format;
          artifactName = `${cleanTitle}_${Date.now()}.${format}`;
        }

        generatedArtifacts.push({ name: artifactName, content: codeBuffer });
        await persistArtifact(artifactName, format, cleanCode);

        return {
          success: true,
          message: `Файл ${artifactName} successfully generated and attached to response. ВАЖНО: Файл УЖЕ прикреплен к твоему ответу платформой. Не дублируй весь код простыней в чат, просто подтверди пользователю создание файла.`,
          artifactName
        };
      }

      case "docx": {
        const titleMatch = typeof skillContent === "string" ? skillContent.match(/^#\s+(.+)$/m) : null;
        const cleanTitle = titleMatch && titleMatch[1]
          ? titleMatch[1].replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "_").slice(0, 30)
          : path.basename(skillName);

        try {
          const docxBuffer = await markdownToDocx(skillContent, {
            defaultTitle: titleMatch?.[1] || "Документ",
            isGost,
          });
          const artifactName = `${cleanTitle}_${Date.now()}.docx`;
          generatedArtifacts.push({ name: artifactName, content: docxBuffer });
          await persistArtifact(artifactName, "docx", skillContent);

          return {
            success: true,
            message: `Файл ${artifactName} успешно сгенерирован в формате DOCX и отправлен пользователю. Подтверди пользователю, что ты отправил файл именно в формате .docx.`,
            artifactName
          };
        } catch (docxErr: any) {
          console.warn("[invokeSkillTool] DOCX conversion failed, falling back to markdown:", docxErr);
          const artifactName = `${cleanTitle}_${Date.now()}.md`;
          generatedArtifacts.push({ name: artifactName, content: skillContent });
          await persistArtifact(artifactName, "markdown", skillContent);

          return {
            success: true,
            message: "Файл успешно сгенерирован в формате Markdown и будет прикреплен к сообщению автоматически.",
            artifactName
          };
        }
      }

      case "txt": {
        const titleMatch = typeof skillContent === "string" ? skillContent.match(/^#\s+(.+)$/m) : null;
        const cleanTitle = titleMatch && titleMatch[1]
          ? titleMatch[1].replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "_").slice(0, 30)
          : path.basename(skillName);

        const txtBuffer = Buffer.from(skillContent, "utf-8");
        const artifactName = `${cleanTitle}_${Date.now()}.txt`;
        generatedArtifacts.push({ name: artifactName, content: txtBuffer });
        await persistArtifact(artifactName, "txt", skillContent);

        return {
          success: true,
          message: `Файл ${artifactName} успешно сгенерирован в формате TXT и отправлен пользователю.`,
          artifactName
        };
      }

      case "md":
      default: {
        const titleMatch = typeof skillContent === "string" ? skillContent.match(/^#\s+(.+)$/m) : null;
        const cleanTitle = titleMatch && titleMatch[1]
          ? titleMatch[1].replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "_").slice(0, 30)
          : path.basename(skillName);

        const artifactName = `${cleanTitle}_${Date.now()}.md`;
        generatedArtifacts.push({ name: artifactName, content: skillContent });
        await persistArtifact(artifactName, "markdown", skillContent);

        return {
          success: true,
          message: "Файл успешно сгенерирован и будет прикреплен к сообщению автоматически. Просто скажи юзеру, что документ готов.",
          artifactName
        };
      }
    }
  }
};
