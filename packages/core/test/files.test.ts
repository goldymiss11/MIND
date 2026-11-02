import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { extractFile, UnsupportedFileError } from "../src/artifacts/extract.js";
import { markdownToDocx, parseFrontMatter } from "../src/artifacts/docx.renderer.js";
import { renderXlsx } from "../src/artifacts/xlsx-renderer.js";
import { renderPptx } from "../src/artifacts/pptx-renderer.js";
import { SpreadsheetSchema, PresentationSchema } from "../src/artifacts/schemas.js";
import { editArtifactTool, forgetMemoryTool, setTimezoneTool } from "../src/tools/definitions.js";

test("extractFile: docx round-trips through the renderer", async () => {
  const buffer = await markdownToDocx("# Отчёт\n\n## Введение\n\nТекст **важный**.\n\n- пункт");
  const { type, content } = await extractFile("отчёт.docx", buffer);
  assert.equal(type, "docx");
  assert.ok(content.includes("Отчёт"));
  assert.ok(content.includes("Введение"));
  assert.ok(content.includes("важный"));
});

test("extractFile: xlsx produces JSON the renderer accepts", async () => {
  const source = SpreadsheetSchema.parse({ title: "Бюджет", sheetName: "Лист", columns: ["Статья", "Сумма"], rows: [["Еда", 100]] });
  const { type, content } = await extractFile("b.xlsx", await renderXlsx(source));
  assert.equal(type, "xlsx");
  const parsed = SpreadsheetSchema.parse(JSON.parse(content));
  assert.deepEqual(parsed.columns, ["Статья", "Сумма"]);
  assert.deepEqual(parsed.rows, [["Еда", 100]]);
});

test("extractFile: xlsx treats a lone cell above the header as the title", async () => {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Л");
  sheet.addRow(["Бюджет"]);
  sheet.addRow(["Статья", "Сумма"]);
  sheet.addRow(["Еда", 100]);
  const { content } = await extractFile("b.xlsx", Buffer.from(await workbook.xlsx.writeBuffer()));
  const parsed = JSON.parse(content);
  assert.equal(parsed.title, "Бюджет");
  assert.deepEqual(parsed.columns, ["Статья", "Сумма"]);
  assert.deepEqual(parsed.rows, [["Еда", 100]]);
});

test("extractFile: pptx produces JSON the renderer accepts", async () => {
  const source = PresentationSchema.parse({ title: "Доклад", slides: [{ title: "Первый", bullets: ["один", "два"] }] });
  const { type, content } = await extractFile("p.pptx", await renderPptx(source));
  assert.equal(type, "pptx");
  const parsed = PresentationSchema.parse(JSON.parse(content));
  const text = JSON.stringify(parsed);
  assert.ok(text.includes("Первый") && text.includes("один") && text.includes("два"));
});

test("extractFile: text and code files keep their type", async () => {
  assert.equal((await extractFile("a.py", Buffer.from("print(1)"))).type, "py");
  assert.equal((await extractFile("a.md", Buffer.from("# x"))).type, "markdown");
  assert.equal((await extractFile("a.java", Buffer.from("class A {}"))).type, "txt");
});

test("extractFile: rejects unknown formats and empty files", async () => {
  await assert.rejects(extractFile("a.exe", Buffer.from("x")), UnsupportedFileError);
  await assert.rejects(extractFile("a.txt", Buffer.from("  ")), UnsupportedFileError);
});

test("parseFrontMatter: separates title page fields, ignores unrelated blocks", () => {
  const { titlePage, body } = parseFrontMatter("---\ntitle: Тема\nwork_type: Реферат\n---\n## Введение");
  assert.deepEqual(titlePage, { title: "Тема", workType: "Реферат" });
  assert.equal(body, "## Введение");
  assert.equal(parseFrontMatter("---\nfoo: bar\n---\nтекст").titlePage, null);
  assert.equal(parseFrontMatter("текст").titlePage, null);
});

test("markdownToDocx: GOST title page, contents, page numbers, tables", async () => {
  const buffer = await markdownToDocx(
    `---
organization: МГУ
work_type: Реферат
title: Графы
author: Иванов И. И.
---
## Введение

Текст.

## 1 Основы

| Имя | Значение |
|---|---|
| a | 1 |

## Заключение

Итог.`,
    { isGost: true }
  );
  const zip = await JSZip.loadAsync(buffer);
  const doc = await zip.file("word/document.xml")!.async("text");
  const footers = Object.keys(zip.files).filter((n) => /word\/footer\d+\.xml/.test(n));
  const footer = await zip.file(footers[0]!)!.async("text");
  const settings = await zip.file("word/settings.xml")!.async("text");

  assert.ok(doc.includes("МГУ") && doc.includes("Иванов И. И."), "title page fields");
  assert.ok(doc.includes("<w:titlePg"), "no page number on the title page");
  assert.ok(doc.includes("СОДЕРЖАНИЕ") && doc.includes("TOC"), "contents field");
  assert.ok(doc.includes("ВВЕДЕНИЕ") && doc.includes("ЗАКЛЮЧЕНИЕ"), "structural headings in capitals");
  assert.ok(doc.includes("1 Основы"), "numbered sections keep their case");
  assert.ok(doc.includes("<w:pageBreakBefore"), "sections start on a new page");
  assert.ok(doc.includes("<w:tbl>") && !doc.includes("|---|"), "tables are real tables");
  assert.ok(footer.includes("PAGE"), "page number field");
  assert.ok(settings.includes("updateFields"), "contents update on open");
});

function artifactDb(artifact: any) {
  const inserted: any[] = [];
  return {
    inserted,
    insert: () => ({ values: (v: any) => { inserted.push(v); return { returning: async () => [{ id: "new-id" }] }; } }),
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => (artifact ? [artifact] : []) }) }) }) }),
  };
}

const editContext = (db: any, result: string) => ({
  db,
  user: { id: "u1" },
  generatedArtifacts: [] as any[],
  ai: { generateText: async () => ({ result, usage: {} }) },
});

test("edit_artifact: edits a docx and sends a new version, keeping GOST", async () => {
  const db = artifactDb({ id: "a1", name: "r.docx", type: "docx", content: "# Тема\n\nСтарый текст.", isGost: true });
  const context = editContext(db, "# Тема\n\nНовый длинный текст.");
  const res = await editArtifactTool.execute({ instruction: "замени текст в таблице" }, context);

  assert.equal(res.success, true);
  assert.ok(context.generatedArtifacts[0].name.endsWith(".docx"), "the word 'таблице' must not change the format");
  const doc = await (await JSZip.loadAsync(context.generatedArtifacts[0].content)).file("word/document.xml")!.async("text");
  assert.ok(doc.includes('w:left="1700"'), "GOST kept");
  assert.equal(db.inserted[0].content, "# Тема\n\nНовый длинный текст.");
  assert.equal(db.inserted[1].data, context.generatedArtifacts[0].content, "binary stored");
});

test("edit_artifact: re-renders xlsx from JSON", async () => {
  const source = JSON.stringify({ sheetName: "Л", columns: ["A"], rows: [["1"]] });
  const db = artifactDb({ id: "a1", name: "t.xlsx", type: "xlsx", content: source, isGost: false });
  const context = editContext(db, "```json\n" + JSON.stringify({ sheetName: "Л", columns: ["A", "B"], rows: [["1", "2"]] }) + "\n```");
  const res = await editArtifactTool.execute({ instruction: "добавь колонку B" }, context);
  assert.equal(res.success, true);
  assert.ok(context.generatedArtifacts[0].name.endsWith(".xlsx"));
});

test("edit_artifact: refuses output that lost most of the content", async () => {
  const db = artifactDb({ id: "a1", name: "r.docx", type: "docx", content: "x".repeat(1000), isGost: false });
  const context = editContext(db, "...остальное без изменений");
  const res = await editArtifactTool.execute({ instruction: "исправь опечатку" }, context);
  assert.equal(res.success, false);
  assert.equal(context.generatedArtifacts.length, 0);
});

test("edit_artifact: explains when a file has no stored source", async () => {
  const db = artifactDb({ id: "a1", name: "old.pptx", type: "pptx", content: null, isGost: false });
  const res = await editArtifactTool.execute({ instruction: "x" }, editContext(db, "y"));
  assert.equal(res.success, false);
  assert.match(res.error, /прислать файл/);
});

function memoryDb(matches: any[]) {
  const deleted: any[] = [];
  return {
    deleted,
    select: () => ({ from: () => ({ where: () => ({ limit: async () => matches }) }) }),
    delete: () => ({ where: async (c: any) => { deleted.push(c); } }),
  };
}

test("forget_memory: deletes a single match, asks when several match", async () => {
  const one = memoryDb([{ id: "m1", content: "Живёт в Казани" }]);
  assert.equal((await forgetMemoryTool.execute({ query: "Казан" }, { db: one, user: { id: "u" } })).forgotten, "Живёт в Казани");
  assert.equal(one.deleted.length, 1);

  const two = memoryDb([{ id: "m1", content: "a" }, { id: "m2", content: "b" }]);
  const res = await forgetMemoryTool.execute({ query: "a" }, { db: two, user: { id: "u" } });
  assert.equal(res.needsChoice, true);
  assert.equal(two.deleted.length, 0);
});

test("set_timezone: validates the zone", async () => {
  const updates: any[] = [];
  const db = { update: () => ({ set: (v: any) => ({ where: async () => { updates.push(v); } }) }) };
  assert.equal((await setTimezoneTool.execute({ timezone: "Asia/Omsk" }, { db, user: { id: "u" } })).success, true);
  assert.equal(updates[0].timezone, "Asia/Omsk");
  assert.equal((await setTimezoneTool.execute({ timezone: "Omsk" }, { db, user: { id: "u" } })).success, false);
});
