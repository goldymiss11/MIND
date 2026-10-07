import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SpreadsheetSchema,
  PresentationSchema,
  renderXlsx,
  renderPptx,
  invokeSkillTool,
} from "../src/index.js";

test("SpreadsheetSchema: validates correctly with valid columns and rows", () => {
  const validData = {
    title: "Финансовый отчет 2026",
    sheetName: "Q1 Report",
    columns: [
      { header: "Категория", key: "category", width: 25 },
      "Сумма (руб)",
      "Статус"
    ],
    rows: [
      ["Серверы", 50000, "Оплачено"],
      { category: "Маркетинг", "Сумма (руб)": 30000, "Статус": "В обработке" }
    ]
  };

  const parsed = SpreadsheetSchema.parse(validData);
  assert.equal(parsed.sheetName, "Q1 Report");
  assert.equal(parsed.columns.length, 3);
  assert.equal(parsed.rows.length, 2);
});

test("SpreadsheetSchema: fails when required columns are missing", () => {
  const invalidData = {
    sheetName: "Empty Columns",
    columns: [],
    rows: []
  };

  assert.throws(() => {
    SpreadsheetSchema.parse(invalidData);
  });
});

test("PresentationSchema: validates correctly with slides and bullets", () => {
  const validData = {
    title: "MIND AI OS Overview",
    author: "MIND Team",
    subtitle: "The Personal AI Operating System",
    slides: [
      {
        title: "Введение в MIND",
        bullets: [
          "Персональная AI-операционная система",
          "Работает через Telegram Bot и Mini App",
          "Долговременная память и детерминированные артефакты"
        ],
        subtitle: "Архитектура и цели",
        notes: "Подчеркнуть важность второго мозга"
      },
      {
        title: "Возможности системы",
        bullets: [
          "Генерация документов DOCX",
          "Генерация таблиц XLSX",
          "Генерация презентаций PPTX"
        ]
      }
    ]
  };

  const parsed = PresentationSchema.parse(validData);
  assert.equal(parsed.title, "MIND AI OS Overview");
  assert.equal(parsed.slides.length, 2);
  assert.equal(parsed.slides[0]?.bullets.length, 3);
});

test("PresentationSchema: fails when slides array is empty", () => {
  const invalidData = {
    title: "No Slides",
    slides: []
  };

  assert.throws(() => {
    PresentationSchema.parse(invalidData);
  });
});

test("renderXlsx: generates valid binary XLSX buffer with zip magic header", async () => {
  const data = {
    title: "Продажи",
    sheetName: "Продажи 2026",
    columns: ["Товар", "Количество", "Цена", "Итого"],
    rows: [
      ["Ноутбук", 5, 120000, 600000],
      ["Монитор", 10, 25000, 250000],
      ["Клавиатура", 15, 8000, 120000]
    ]
  };

  const buffer = await renderXlsx(data);

  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 1000);
  // Check ZIP / OOXML magic bytes (PK\x03\x04)
  assert.equal(buffer[0], 0x50); // 'P'
  assert.equal(buffer[1], 0x4b); // 'K'
  assert.equal(buffer[2], 0x03);
  assert.equal(buffer[3], 0x04);
});

test("renderPptx: generates valid binary PPTX buffer with zip magic header", async () => {
  const data = {
    title: "Квартальный отчет",
    author: "Аналитический отдел",
    slides: [
      {
        title: "Итоги квартала",
        bullets: [
          "Рост выручки на 24%",
          "Привлечено 15 новых клиентов",
          "Запущен новый продукт"
        ]
      }
    ]
  };

  const buffer = await renderPptx(data);

  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 2000);
  // Check ZIP / OOXML magic bytes (PK\x03\x04)
  assert.equal(buffer[0], 0x50); // 'P'
  assert.equal(buffer[1], 0x4b); // 'K'
  assert.equal(buffer[2], 0x03);
  assert.equal(buffer[3], 0x04);
});

test("invokeSkillTool: generates binary XLSX artifact when format='xlsx' requested", async () => {
  const artifacts: any[] = [];
  const mockContext: any = {
    ai: {
      generateText: async () => ({
        result: JSON.stringify({
          title: "Бюджет",
          sheetName: "Бюджет 2026",
          columns: ["Статья", "План", "Факт"],
          rows: [
            ["Инфраструктура", 100000, 95000],
            ["Разработка", 250000, 240000]
          ]
        }),
        model: "gemini-2.5-flash"
      })
    },
    generatedArtifacts: artifacts,
    logAiRun: async () => {}
  };

  const res = await invokeSkillTool.execute(
    {
      skillName: "spreadsheet-generation",
      prompt: "Создай таблицу бюджета в excel",
      format: "xlsx"
    },
    mockContext
  );

  assert.equal(res.success, true);
  assert.equal(artifacts.length, 1);
  assert.ok(artifacts[0]?.name.endsWith(".xlsx"));
  assert.ok(Buffer.isBuffer(artifacts[0]?.content));
  assert.ok(artifacts[0]?.content.length > 1000);
});

test("invokeSkillTool: generates binary PPTX artifact when format='pptx' requested", async () => {
  const artifacts: any[] = [];
  const mockContext: any = {
    ai: {
      generateText: async () => ({
        result: "```json\n" + JSON.stringify({
          title: "Стратегия развития",
          author: "CEO",
          slides: [
            {
              title: "Цели на год",
              bullets: ["Масштабирование платформы", "Выход на международный рынок"]
            }
          ]
        }) + "\n```",
        model: "gemini-2.5-flash"
      })
    },
    generatedArtifacts: artifacts,
    logAiRun: async () => {}
  };

  const res = await invokeSkillTool.execute(
    {
      skillName: "presentation-generation",
      prompt: "Сделай презентацию стратегии",
      format: "pptx"
    },
    mockContext
  );

  assert.equal(res.success, true);
  assert.equal(artifacts.length, 1);
  assert.ok(artifacts[0]?.name.endsWith(".pptx"));
  assert.ok(Buffer.isBuffer(artifacts[0]?.content));
  assert.ok(artifacts[0]?.content.length > 2000);
});

test("invokeSkillTool: definition conforms to strict requirements", () => {
  const strictPhrase = "MUST use this tool to generate Excel spreadsheets (.xlsx) and PowerPoint presentations (.pptx). Do NOT output markdown tables if the user asks for a table/excel. Do NOT hallucinate download links.";
  assert.ok(invokeSkillTool.description.includes(strictPhrase));

  const expectedEnum = ["docx", "md", "txt", "pptx", "xlsx"];
  const formatEnum = invokeSkillTool.inputSchema.properties.format.enum;
  assert.deepEqual(formatEnum, expectedEnum);

  const extensionEnum = invokeSkillTool.inputSchema.properties.extension.enum;
  assert.deepEqual(extensionEnum, expectedEnum);
});

test("invokeSkillTool: handles direct structured arguments for PPTX without calling ai", async () => {
  const artifacts: any[] = [];
  let aiCalled = false;
  const mockContext: any = {
    ai: {
      generateText: async () => {
        aiCalled = true;
        return { result: "" };
      }
    },
    generatedArtifacts: artifacts,
    logAiRun: async () => {}
  };

  const res = await invokeSkillTool.execute(
    {
      prompt: "Создай презентацию о проекте",
      format: "pptx",
      title: "Презентация проекта",
      slides: [
        { title: "Слайд 1", bullets: ["Пункт 1", "Пункт 2"] }
      ]
    },
    mockContext
  );

  assert.equal(res.success, true);
  assert.equal(aiCalled, false);
  assert.equal(artifacts.length, 1);
  assert.ok(artifacts[0]?.name.endsWith(".pptx"));
  assert.ok(Buffer.isBuffer(artifacts[0]?.content));
});

test("invokeSkillTool: handles direct structured arguments for XLSX without calling ai", async () => {
  const artifacts: any[] = [];
  let aiCalled = false;
  const mockContext: any = {
    ai: {
      generateText: async () => {
        aiCalled = true;
        return { result: "" };
      }
    },
    generatedArtifacts: artifacts,
    logAiRun: async () => {}
  };

  const res = await invokeSkillTool.execute(
    {
      prompt: "Сделай таблицу расходов",
      format: "xlsx",
      title: "Расходы",
      columns: ["Категория", "Сумма"],
      rows: [["Еда", 1500]]
    },
    mockContext
  );

  assert.equal(res.success, true);
  assert.equal(aiCalled, false);
  assert.equal(artifacts.length, 1);
  assert.ok(artifacts[0]?.name.endsWith(".xlsx"));
  assert.ok(Buffer.isBuffer(artifacts[0]?.content));
});

test("invokeSkillTool: auto-corrects to pptx when format='docx' was mistakenly passed for presentation prompt", async () => {
  const artifacts: any[] = [];
  const mockContext: any = {
    ai: {
      generateText: async () => ({
        result: JSON.stringify({
          title: "Презентация",
          slides: [{ title: "Слайд", bullets: ["А"] }]
        })
      })
    },
    generatedArtifacts: artifacts,
    logAiRun: async () => {}
  };

  const res = await invokeSkillTool.execute(
    {
      prompt: "Сделай презентацию о космосе",
      format: "docx" // mistakenly passed
    },
    mockContext
  );

  assert.equal(res.success, true);
  assert.equal(artifacts.length, 1);
  assert.ok(artifacts[0]?.name.endsWith(".pptx"));
  assert.ok(Buffer.isBuffer(artifacts[0]?.content));
});

test("invokeSkillTool: handles txt format correctly", async () => {
  const artifacts: any[] = [];
  const mockContext: any = {
    ai: {
      generateText: async () => ({ result: "Plain text content" })
    },
    generatedArtifacts: artifacts,
    logAiRun: async () => {}
  };

  const res = await invokeSkillTool.execute(
    {
      prompt: "Создай текстовый файл со списком",
      format: "txt"
    },
    mockContext
  );

  assert.equal(res.success, true);
  assert.equal(artifacts.length, 1);
  assert.ok(artifacts[0]?.name.endsWith(".txt"));
  assert.ok(Buffer.isBuffer(artifacts[0]?.content));
  assert.equal(artifacts[0]?.content.toString("utf-8"), "Plain text content");
});

test("invokeSkillTool: persists artifact to database when db and user are provided", async () => {
  const artifacts: any[] = [];
  const insertedRows: any[] = [];
  const mockDb = {
    insert: (_table: any) => ({
      values: async (data: any) => {
        insertedRows.push(data);
        return [data];
      }
    })
  };

  const mockContext: any = {
    ai: {
      generateText: async () => ({ result: "# Тестовый документ\n\nСодержимое статьи" })
    },
    generatedArtifacts: artifacts,
    logAiRun: async () => {},
    db: mockDb,
    user: { id: "user-uuid-123" },
    conversationId: "conv-uuid-456"
  };

  const res = await invokeSkillTool.execute(
    {
      prompt: "Создай документ с описанием проекта",
      format: "md"
    },
    mockContext
  );

  assert.equal(res.success, true);
  assert.equal(artifacts.length, 1);
  assert.equal(insertedRows.length, 1);
  assert.equal(insertedRows[0]?.userId, "user-uuid-123");
  assert.equal(insertedRows[0]?.conversationId, "conv-uuid-456");
  assert.equal(insertedRows[0]?.type, "markdown");
  assert.equal(insertedRows[0]?.content, "# Тестовый документ\n\nСодержимое статьи");
  assert.ok(insertedRows[0]?.name.endsWith(".md"));
});

