import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SpreadsheetSchema,
  PresentationSchema,
  renderXlsx,
  renderPptx,
  invokeSkillTool,
  markdownToDocx,
  stripCodeFences,
} from "../src/index.js";
import JSZip from "jszip";

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
  const codeFilesPhrase = "MUST use this tool to generate downloadable files: DOCX, PPTX, XLSX, as well as programming code files (.py, .sql, .cpp, .js, .ts, .html, .json). Do NOT dump raw code into chat if the user asks for a script, program or lab work — output it as a real code file!";
  assert.ok(invokeSkillTool.description.includes(codeFilesPhrase));

  const strictPhrase = "MUST use this tool to generate Excel spreadsheets (.xlsx) and PowerPoint presentations (.pptx). Do NOT output markdown tables if the user asks for a table/excel. Do NOT hallucinate download links.";
  assert.ok(invokeSkillTool.description.includes(strictPhrase));

  const expectedEnum = ["docx", "md", "txt", "pptx", "xlsx", "py", "sql", "cpp", "c", "js", "ts", "html", "css", "json"];
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

test("markdownToDocx: formats document according to academic GOST standards when isGost=true", async () => {
  const markdown = `# Введение
## Глава 1. Теоретические основы
### Параграф 1.1. Понятия
Обычный абзац текста научной работы, который должен быть отформатирован строго по ГОСТ 7.32 / 2.105.
- Первый пункт перечня
- Второй пункт перечня
1. Первый нумерованный пункт
2. Второй нумерованный пункт
`;

  const buffer = await markdownToDocx(markdown, { isGost: true });
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 1000);

  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file("word/document.xml")?.async("text");
  const stylesXml = await zip.file("word/styles.xml")?.async("text");

  assert.ok(docXml, "document.xml must exist in docx");
  assert.ok(stylesXml, "styles.xml must exist in docx");

  // 1. Page Margins: Left 30mm (1700), Right 10mm (567), Top 20mm (1134), Bottom 20mm (1134)
  assert.ok(docXml.includes('w:left="1700"'), "Left margin must be 1700 twips (30mm)");
  assert.ok(docXml.includes('w:right="567"'), "Right margin must be 567 twips (10mm)");
  assert.ok(docXml.includes('w:top="1134"'), "Top margin must be 1134 twips (20mm)");
  assert.ok(docXml.includes('w:bottom="1134"'), "Bottom margin must be 1134 twips (20mm)");

  // 2. Strict font & size in styles & document: Times New Roman, 14pt (size 28)
  assert.ok(stylesXml.includes("Times New Roman"), "Default font face must be Times New Roman");
  assert.ok(stylesXml.includes('w:sz w:val="28"'), "Default size must be 28 (14pt)");
  assert.ok(stylesXml.includes('w:line="360"'), "Default line spacing must be 360 (1.5 lines)");

  // 3. Paragraph Indent & Alignment: 1.25 cm (720 twips) indent, justified alignment (both)
  assert.ok(docXml.includes('w:firstLine="720"'), "Paragraph indent must be 720 twips (1.25cm)");
  assert.ok(docXml.includes('w:jc w:val="both"'), "Paragraph alignment must be justified ('both')");
});

test("markdownToDocx: retains standard fallback formatting when isGost is false or omitted", async () => {
  const markdown = "Обычный текст без оформления по ГОСТ.";
  const buffer = await markdownToDocx(markdown, { defaultTitle: "Документ", isGost: false });

  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file("word/document.xml")?.async("text");
  assert.ok(docXml);

  // Standard fallback should not set GOST margins
  assert.ok(!docXml.includes('w:left="1700"'), "Standard docx must not enforce 30mm GOST margin");
});

test("invokeSkillTool: respects args.content directly without invoking AI", async () => {
  const artifacts: any[] = [];
  let aiCalled = false;
  const mockContext: any = {
    ai: {
      generateText: async () => {
        aiCalled = true;
        return { result: "Hallucinated AI text" };
      }
    },
    generatedArtifacts: artifacts,
    logAiRun: async () => {}
  };

  const directMarkdown = "# Утвержденный документ\n\nЭтот текст передан напрямую без генерации.";

  const res = await invokeSkillTool.execute(
    {
      skillName: "document-generation",
      prompt: "Дополни файл новыми данными",
      format: "docx",
      content: directMarkdown
    },
    mockContext
  );

  assert.equal(res.success, true);
  assert.equal(aiCalled, false, "AI must NOT be called when content is provided");
  assert.equal(artifacts.length, 1);
  assert.ok(artifacts[0]?.name.endsWith(".docx"));
});

test("invokeSkillTool: auto-detects GOST formatting from keywords in prompt", async () => {
  const artifacts: any[] = [];
  const mockContext: any = {
    ai: {
      generateText: async () => ({
        result: "# Реферат по дискретной математике\n\nТекст научной работы студента."
      })
    },
    generatedArtifacts: artifacts,
    logAiRun: async () => {}
  };

  const res = await invokeSkillTool.execute(
    {
      skillName: "document-generation",
      prompt: "Сделай реферат по ГОСТу на тему алгоритмов",
      format: "docx"
    },
    mockContext
  );

  assert.equal(res.success, true);
  assert.equal(artifacts.length, 1);
  const buffer = artifacts[0]?.content;
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file("word/document.xml")?.async("text");
  assert.ok(docXml?.includes('w:left="1700"'), "Prompt matching /по ГОСТу/ must trigger GOST 30mm margin");
});

test("invokeSkillTool: persists skillContent to database for docx artifacts", async () => {
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
      generateText: async () => ({
        result: "# Курсовая работа\n\nТекст первой главы."
      })
    },
    generatedArtifacts: artifacts,
    logAiRun: async () => {},
    db: mockDb,
    user: { id: "user-docx-test" },
    conversationId: "conv-docx-test"
  };

  const res = await invokeSkillTool.execute(
    {
      skillName: "document-generation",
      prompt: "Напиши курсовую работу",
      format: "docx"
    },
    mockContext
  );

  assert.equal(res.success, true);
  assert.equal(insertedRows.length, 1);
  assert.equal(insertedRows[0]?.type, "docx");
  assert.equal(insertedRows[0]?.content, "# Курсовая работа\n\nТекст первой главы.");
  assert.ok(insertedRows[0]?.name.endsWith(".docx"));
});

test("stripCodeFences: strips standard markdown code fences with language tags", () => {
  const fenced = "```python\ndef hello():\n    return 'world'\n```";
  assert.equal(stripCodeFences(fenced), "def hello():\n    return 'world'");
});

test("stripCodeFences: handles template literals inside code without breaking", () => {
  const jsCode = "```ts\nconst msg = `hello ${name}`;\nconsole.log(msg);\n```";
  assert.equal(stripCodeFences(jsCode), "const msg = `hello ${name}`;\nconsole.log(msg);");
});

test("stripCodeFences: extracts code from fenced block embedded inside text", () => {
  const textWithBlock = "Вот ваш скрипт на Python:\n```python\nimport os\nprint(os.getcwd())\n```\nНадеюсь, помог!";
  assert.equal(stripCodeFences(textWithBlock), "import os\nprint(os.getcwd())");
});

test("stripCodeFences: preserves pure code without fences untouched", () => {
  const rawCode = "SELECT id, name FROM users WHERE active = true;";
  assert.equal(stripCodeFences(rawCode), rawCode);
});

test("invokeSkillTool: generates pure Python code file (.py) and strips markdown code fences", async () => {
  const artifacts: any[] = [];
  const mockContext: any = {
    ai: {
      generateText: async () => ({
        result: "```python\nimport requests\n\ndef fetch_data(url):\n    response = requests.get(url)\n    return response.json()\n```"
      })
    },
    generatedArtifacts: artifacts,
    logAiRun: async () => {}
  };

  const res = await invokeSkillTool.execute(
    {
      prompt: "Напиши скрипт парсера на Python",
      format: "py"
    },
    mockContext
  );

  assert.equal(res.success, true);
  assert.equal(artifacts.length, 1);
  assert.ok(artifacts[0]?.name.endsWith(".py"));
  assert.ok(Buffer.isBuffer(artifacts[0]?.content));

  const codeString = artifacts[0]?.content.toString("utf-8");
  assert.ok(!codeString.includes("```"), "Generated code file must NOT contain markdown code fences");
  assert.ok(codeString.includes("import requests"));
  assert.ok(codeString.includes("def fetch_data(url):"));
});

test("invokeSkillTool: respects explicit filename in args or prompt", async () => {
  const artifacts: any[] = [];
  const mockContext: any = {
    ai: {
      generateText: async () => ({
        result: "def solve():\n    pass"
      })
    },
    generatedArtifacts: artifacts,
    logAiRun: async () => {}
  };

  const res = await invokeSkillTool.execute(
    {
      prompt: "Напиши скрипт парсера и сохрани в parser.py",
      format: "py",
      filename: "parser.py"
    },
    mockContext
  );

  assert.equal(res.success, true);
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0]?.name, "parser.py");
});

test("invokeSkillTool: auto-detects code format from prompt keywords", async () => {
  const testCases = [
    { prompt: "Напиши функцию на python для поиска пути", expectedExt: ".py" },
    { prompt: "Создай скрипт бд с таблицами пользователей create table", expectedExt: ".sql" },
    { prompt: "Напиши программу на c++ для сортировки массива", expectedExt: ".cpp" },
    { prompt: "Сделай typescript модуль для валидации", expectedExt: ".ts" },
    { prompt: "Сверстай веб-страницу профиля пользователя", expectedExt: ".html" }
  ];

  for (const tc of testCases) {
    const artifacts: any[] = [];
    const mockContext: any = {
      ai: {
        generateText: async () => ({
          result: "// test code content"
        })
      },
      generatedArtifacts: artifacts,
      logAiRun: async () => {}
    };

    const res = await invokeSkillTool.execute(
      { prompt: tc.prompt },
      mockContext
    );

    assert.equal(res.success, true, `Failed for prompt: ${tc.prompt}`);
    assert.equal(artifacts.length, 1);
    assert.ok(artifacts[0]?.name.endsWith(tc.expectedExt), `Expected ${tc.expectedExt} for prompt: ${tc.prompt}, got ${artifacts[0]?.name}`);
  }
});

test("invokeSkillTool: persists code artifacts to database with pure code content", async () => {
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
      generateText: async () => ({
        result: "```sql\nCREATE TABLE students (id SERIAL PRIMARY KEY, name TEXT);\n```"
      })
    },
    generatedArtifacts: artifacts,
    logAiRun: async () => {},
    db: mockDb,
    user: { id: "user-sql-test" },
    conversationId: "conv-sql-test"
  };

  const res = await invokeSkillTool.execute(
    {
      prompt: "Создай SQL скрипт схемы базы данных",
      format: "sql"
    },
    mockContext
  );

  assert.equal(res.success, true);
  assert.equal(insertedRows.length, 1);
  assert.equal(insertedRows[0]?.type, "sql");
  assert.equal(insertedRows[0]?.content, "CREATE TABLE students (id SERIAL PRIMARY KEY, name TEXT);");
  assert.ok(insertedRows[0]?.name.endsWith(".sql"));
});


