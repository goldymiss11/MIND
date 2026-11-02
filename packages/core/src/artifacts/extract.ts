import path from "node:path";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export class UnsupportedFileError extends Error {}

export interface ExtractedFile {
  /** Artifact type: the format the file can be edited and re-rendered in. */
  type: string;
  /** Editable source: Markdown, plain text, code, or the JSON the xlsx/pptx renderers accept. */
  content: string;
}

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "csv", "py", "sql", "cpp", "c", "h", "js", "ts", "html", "css", "json", "java", "go", "rs", "cs", "xml", "yaml", "yml",
]);
const EDITABLE_CODE_TYPES = new Set(["py", "sql", "cpp", "c", "js", "ts", "html", "css", "json"]);

async function extractDocx(data: Buffer): Promise<string> {
  // convertToMarkdown is public mammoth API, but missing from its type declarations.
  const { value } = await (mammoth as any).convertToMarkdown({ buffer: data });
  return String(value)
    .replace(/<a id="[^"]*"><\/a>/g, "")
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, "$1")
    .trim();
}

async function extractXlsx(data: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("В книге нет листов");

  const cellText = (value: ExcelJS.CellValue): string | number | boolean | null => {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === "object") {
      if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
      if ("richText" in value) return value.richText.map((part) => part.text).join("");
      if ("text" in value) return String(value.text);
      return null;
    }
    return value;
  };

  const rows: (string | number | boolean | null)[][] = [];
  sheet.eachRow((row) => {
    const cells: (string | number | boolean | null)[] = [];
    for (let i = 1; i <= sheet.columnCount; i++) cells.push(cellText(row.getCell(i).value));
    rows.push(cells);
  });

  // Tables made by hand often have a title in a lone cell above the header row.
  const headerIndex = sheet.columnCount > 1 && rows.length > 1 && rows[0]!.filter((c) => c !== null).length === 1 ? 1 : 0;
  const title = headerIndex === 1 ? String(rows[0]!.find((c) => c !== null)) : undefined;
  const columns = (rows[headerIndex] ?? []).map((cell, i) => (cell === null ? `Колонка ${i + 1}` : String(cell)));
  if (columns.length === 0) throw new Error("Лист пуст");

  return JSON.stringify({ title, sheetName: sheet.name, columns, rows: rows.slice(headerIndex + 1) }, null, 2);
}

async function extractPptx(data: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(data);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));

  const decode = (text: string) =>
    text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

  const slides = [];
  for (const name of slideFiles) {
    const xml = await zip.file(name)!.async("string");
    const paragraphs = (xml.match(/<a:p>[\s\S]*?<\/a:p>|<a:p [\s\S]*?<\/a:p>/g) ?? [])
      .map((p) => decode((p.match(/<a:t>([^<]*)<\/a:t>/g) ?? []).map((t) => t.replace(/<\/?a:t>/g, "")).join("")).trim())
      .filter(Boolean);
    slides.push({ title: paragraphs[0] ?? "Слайд", bullets: paragraphs.slice(1) });
  }
  if (slides.length === 0) throw new Error("В презентации нет слайдов");

  return JSON.stringify({ title: slides[0]!.title, slides }, null, 2);
}

async function extractPdf(data: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(data) });
  try {
    const { text } = await parser.getText();
    // pdf-parse marks page boundaries with its own "-- 1 of 3 --" lines.
    return text.replace(/^-- \d+ of \d+ --$/gm, "").trim();
  } finally {
    await parser.destroy();
  }
}

/**
 * Turns an uploaded file into editable source text.
 * Throws UnsupportedFileError when the format cannot be read.
 */
export async function extractFile(filename: string, data: Buffer): Promise<ExtractedFile> {
  const extension = path.extname(filename).slice(1).toLowerCase();

  let extracted: ExtractedFile;
  if (extension === "docx") {
    extracted = { type: "docx", content: await extractDocx(data) };
  } else if (extension === "xlsx") {
    extracted = { type: "xlsx", content: await extractXlsx(data) };
  } else if (extension === "pptx") {
    extracted = { type: "pptx", content: await extractPptx(data) };
  } else if (extension === "pdf") {
    extracted = { type: "pdf", content: await extractPdf(data) };
  } else if (TEXT_EXTENSIONS.has(extension)) {
    const type = extension === "md" ? "markdown" : EDITABLE_CODE_TYPES.has(extension) ? extension : "txt";
    extracted = { type, content: data.toString("utf-8") };
  } else {
    throw new UnsupportedFileError(`Формат .${extension || "?"} не поддерживается`);
  }

  if (!extracted.content.trim()) {
    throw new UnsupportedFileError("В файле не нашлось текста (возможно, это скан)");
  }
  return extracted;
}
