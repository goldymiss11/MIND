import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  TableOfContents,
  WidthType,
  Footer,
  PageNumber,
} from "docx";

// ГОСТ 7.32-2017: поля 30/15/20/20 мм, абзацный отступ 1,25 см. Значения в twips.
const GOST_INDENT = 709;
const GOST_MARGIN = { left: 1700, right: 850, top: 1134, bottom: 1134 };
const GOST_FONT = "Times New Roman";
const GOST_SIZE = 28;
const STRUCTURAL_HEADING = /^(содержание|оглавление|введение|заключение|выводы?|реферат|список\s|перечень\s|приложение|определения|обозначения|термины)/i;

export interface GostTitlePage {
  organization?: string;
  department?: string;
  workType?: string;
  title?: string;
  subject?: string;
  author?: string;
  group?: string;
  teacher?: string;
  city?: string;
  year?: string;
}

const TITLE_PAGE_KEYS: Record<string, keyof GostTitlePage> = {
  organization: "organization",
  department: "department",
  work_type: "workType",
  title: "title",
  subject: "subject",
  author: "author",
  group: "group",
  teacher: "teacher",
  city: "city",
  year: "year",
};

/** Splits a leading `---` block with title page fields from the document body. */
export function parseFrontMatter(markdown: string): { titlePage: GostTitlePage | null; body: string } {
  const match = markdown.match(/^\s*---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) return { titlePage: null, body: markdown };

  const titlePage: GostTitlePage = {};
  let recognized = false;
  for (const line of (match[1] ?? "").split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = TITLE_PAGE_KEYS[line.slice(0, separator).trim().toLowerCase()];
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && value) {
      titlePage[key] = value;
      recognized = true;
    }
  }
  return recognized ? { titlePage, body: markdown.slice(match[0].length) } : { titlePage: null, body: markdown };
}

function buildGostTitlePage(page: GostTitlePage): Paragraph[] {
  const line = (text: string, opts?: { bold?: boolean; before?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; caps?: boolean }) =>
    new Paragraph({
      alignment: opts?.align ?? AlignmentType.CENTER,
      spacing: { before: opts?.before ?? 0, line: 360, lineRule: "auto" },
      children: [new TextRun({ text, font: GOST_FONT, size: GOST_SIZE, bold: opts?.bold, allCaps: opts?.caps })],
    });

  const paragraphs: Paragraph[] = [];
  if (page.organization) paragraphs.push(line(page.organization));
  if (page.department) paragraphs.push(line(page.department));
  paragraphs.push(line(page.workType ?? "Отчёт", { bold: true, before: 2800, caps: true }));
  if (page.subject) paragraphs.push(line(`по дисциплине «${page.subject}»`));
  if (page.title) paragraphs.push(line(`на тему: «${page.title}»`, { bold: true }));

  const right = AlignmentType.RIGHT;
  const author = [page.author, page.group ? `группа ${page.group}` : ""].filter(Boolean).join(", ");
  paragraphs.push(line(`Выполнил: ${author || "________________"}`, { before: 2400, align: right }));
  paragraphs.push(line(`Проверил: ${page.teacher || "________________"}`, { align: right }));

  const place = [page.city, page.year ?? String(new Date().getFullYear())].filter(Boolean).join(" ");
  paragraphs.push(line(place, { before: 2400 }));
  return paragraphs;
}

function isTableLine(line: string): boolean {
  return line.startsWith("|") && line.endsWith("|") && line.length > 1;
}

function parseTableCells(line: string): string[] {
  return line.slice(1, -1).split("|").map((cell) => cell.trim());
}

function buildTable(rows: string[][], isGost: boolean): Table {
  const columnCount = Math.max(...rows.map((row) => row.length));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (row, rowIndex) =>
        new TableRow({
          tableHeader: rowIndex === 0,
          children: Array.from({ length: columnCount }, (_, i) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: parseInlineFormatting(row[i] ?? "", {
                    font: isGost ? GOST_FONT : undefined,
                    size: isGost ? GOST_SIZE : undefined,
                    defaultBold: rowIndex === 0,
                  }),
                }),
              ],
            })
          ),
        })
    ),
  });
}

export interface MarkdownToDocxOptions {
  defaultTitle?: string;
  isGost?: boolean;
  /** Adds an auto-updating table of contents. Defaults to true for GOST documents with several sections. */
  includeToc?: boolean;
}

/**
 * Parses inline formatting: **bold**, *italic*, `code`.
 */
function parseInlineFormatting(
  text: string,
  options?: { font?: string; size?: number; defaultBold?: boolean }
): TextRun[] {
  const runs: TextRun[] = [];
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);

  for (const token of tokens) {
    if (!token) continue;
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      runs.push(
        new TextRun({
          text: token.slice(2, -2),
          bold: true,
          font: options?.font,
          size: options?.size,
        })
      );
    } else if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          italics: true,
          font: options?.font,
          size: options?.size,
          bold: options?.defaultBold,
        })
      );
    } else if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          font: "Courier New",
          size: options?.size,
          bold: options?.defaultBold,
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: token,
          font: options?.font,
          size: options?.size,
          bold: options?.defaultBold,
        })
      );
    }
  }

  return runs.length > 0
    ? runs
    : [
        new TextRun({
          text,
          font: options?.font,
          size: options?.size,
          bold: options?.defaultBold,
        }),
      ];
}

/**
 * Converts markdown text into a well-structured .docx Buffer.
 */
export async function markdownToDocx(
  markdown: string,
  optionsOrTitle?: string | MarkdownToDocxOptions
): Promise<Buffer> {
  const options: MarkdownToDocxOptions =
    typeof optionsOrTitle === "string"
      ? { defaultTitle: optionsOrTitle }
      : optionsOrTitle || {};

  const defaultTitle = options.defaultTitle || "Document";
  const isGost = Boolean(options.isGost);

  const { titlePage, body } = isGost ? parseFrontMatter(markdown) : { titlePage: null, body: markdown };
  const lines = body.split(/\r?\n/);
  const children: (Paragraph | Table | TableOfContents)[] = [];
  const sectionCount = lines.filter((l) => l.trim().startsWith("## ")).length;
  const tocEntries = lines.flatMap((l) => {
    const match = l.trim().match(/^(#{2,3})\s+(.+)$/);
    if (!match?.[1] || !match[2]) return [];
    const title = match[2].replace(/[*`]/g, "");
    return [{ title: STRUCTURAL_HEADING.test(title) ? title.toUpperCase() : title, level: match[1].length - 1 }];
  });
  const includeToc = isGost && (options.includeToc ?? sectionCount >= 2);
  let documentTitle = titlePage?.title;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableRows.length > 0) {
      children.push(buildTable(tableRows, isGost));
      children.push(new Paragraph({ children: [] }));
      tableRows = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (isTableLine(line)) {
      // The |---|---| row only separates the header from the body.
      if (!/^\|[\s:|-]+\|$/.test(line)) {
        tableRows.push(parseTableCells(line));
      }
      continue;
    }
    flushTable();

    if (!line) {
      continue;
    }

    if (line.startsWith("# ")) {
      const headingText = line.slice(2).trim();
      documentTitle = documentTitle ?? headingText;
      // A title page already shows the document title.
      if (isGost && titlePage) continue;
      children.push(
        new Paragraph({
          children: parseInlineFormatting(headingText, {
            font: isGost ? "Times New Roman" : undefined,
            size: isGost ? 32 : undefined,
            defaultBold: true,
          }),
          heading: HeadingLevel.TITLE,
          alignment: isGost ? AlignmentType.CENTER : undefined,
          spacing: isGost
            ? { before: 240, after: 120, line: 360, lineRule: "auto" }
            : { before: 240, after: 120 },
        })
      );
      continue;
    }

    if (line.startsWith("## ")) {
      const headingText = line.slice(3).trim();
      // ГОСТ: структурные элементы — по центру прописными, разделы — с абзацного отступа; все с новой страницы.
      const isStructural = isGost && STRUCTURAL_HEADING.test(headingText);
      children.push(
        new Paragraph({
          children: parseInlineFormatting(isStructural ? headingText.toUpperCase() : headingText, {
            font: isGost ? GOST_FONT : undefined,
            size: isGost ? GOST_SIZE : undefined,
            defaultBold: true,
          }),
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: isGost || undefined,
          alignment: isStructural ? AlignmentType.CENTER : undefined,
          indent: isGost && !isStructural ? { firstLine: GOST_INDENT } : undefined,
          spacing: isGost
            ? { before: 240, after: 120, line: 360, lineRule: "auto" }
            : { before: 200, after: 100 },
        })
      );
      continue;
    }

    if (line.startsWith("### ")) {
      const headingText = line.slice(4).trim();
      children.push(
        new Paragraph({
          children: parseInlineFormatting(headingText, {
            font: isGost ? "Times New Roman" : undefined,
            size: isGost ? 28 : undefined,
            defaultBold: true,
          }),
          heading: HeadingLevel.HEADING_2,
          alignment: isGost ? AlignmentType.JUSTIFIED : undefined,
          indent: isGost ? { firstLine: GOST_INDENT } : undefined,
          spacing: isGost
            ? { before: 200, after: 100, line: 360, lineRule: "auto" }
            : { before: 160, after: 80 },
        })
      );
      continue;
    }

    if (line.startsWith("#### ")) {
      const headingText = line.slice(5).trim();
      children.push(
        new Paragraph({
          children: parseInlineFormatting(headingText, {
            font: isGost ? "Times New Roman" : undefined,
            size: isGost ? 28 : undefined,
            defaultBold: true,
          }),
          heading: HeadingLevel.HEADING_3,
          indent: isGost ? { firstLine: GOST_INDENT } : undefined,
          spacing: isGost
            ? { before: 160, after: 80, line: 360, lineRule: "auto" }
            : { before: 120, after: 60 },
        })
      );
      continue;
    }

    // Bullet lists
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const content = line.slice(2).trim();
      children.push(
        isGost
          ? // ГОСТ 2.105: перечисления оформляются тире с абзацного отступа.
            new Paragraph({
              children: parseInlineFormatting(`– ${content}`, { font: GOST_FONT, size: GOST_SIZE }),
              alignment: AlignmentType.JUSTIFIED,
              indent: { firstLine: GOST_INDENT },
              spacing: { before: 0, after: 0, line: 360, lineRule: "auto" },
            })
          : new Paragraph({
              children: parseInlineFormatting(content),
              bullet: { level: 0 },
              spacing: { before: 40, after: 40 },
            })
      );
      continue;
    }

    // Numbered lists
    const numMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch && numMatch[1] && numMatch[2]) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${numMatch[1]}. `,
              bold: !isGost,
              font: isGost ? "Times New Roman" : undefined,
              size: isGost ? 28 : undefined,
            }),
            ...parseInlineFormatting(numMatch[2], {
              font: isGost ? "Times New Roman" : undefined,
              size: isGost ? 28 : undefined,
            }),
          ],
          indent: isGost ? { firstLine: GOST_INDENT } : undefined,
          spacing: isGost
            ? { before: 40, after: 40, line: 360, lineRule: "auto" }
            : { before: 40, after: 40 },
        })
      );
      continue;
    }

    // Standard paragraph
    children.push(
      new Paragraph({
        children: parseInlineFormatting(line, {
          font: isGost ? "Times New Roman" : undefined,
          size: isGost ? 28 : undefined,
        }),
        alignment: isGost ? AlignmentType.JUSTIFIED : undefined,
        indent: isGost ? { firstLine: GOST_INDENT } : undefined,
        spacing: isGost
          ? { before: 0, after: 0, line: 360, lineRule: "auto" }
          : { before: 60, after: 60, line: 276 },
      })
    );
  }

  flushTable();

  const frontMatter: (Paragraph | TableOfContents)[] = [];
  if (isGost && titlePage) {
    frontMatter.push(...buildGostTitlePage({ ...titlePage, title: documentTitle }));
  }
  if (includeToc) {
    frontMatter.push(
      new Paragraph({
        pageBreakBefore: Boolean(titlePage),
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "СОДЕРЖАНИЕ", font: GOST_FONT, size: GOST_SIZE, bold: true })],
      }),
      // Cached entries show the outline in viewers that do not update fields, such as phone previews.
      // Page numbers are left to Word, which recalculates them when the file opens.
      new TableOfContents("Содержание", {
        hyperlink: true,
        headingStyleRange: "1-3",
        cachedEntries: tocEntries,
      })
    );
  }

  const body_children = [...frontMatter, ...children];

  const doc = new Document({
    features: includeToc ? { updateFields: true } : undefined,
    styles: isGost
      ? {
          default: {
            document: {
              run: {
                font: "Times New Roman",
                size: 28,
              },
              paragraph: {
                spacing: {
                  line: 360,
                  lineRule: "auto",
                },
              },
            },
            heading1: {
              run: {
                font: "Times New Roman",
                size: GOST_SIZE,
                bold: true,
                color: "000000",
              },
              paragraph: {
                spacing: { before: 240, after: 120, line: 360, lineRule: "auto" },
              },
            },
            heading2: {
              run: {
                font: "Times New Roman",
                size: 28,
                bold: true,
                color: "000000",
              },
              paragraph: {
                indent: { firstLine: GOST_INDENT },
                spacing: { before: 200, after: 100, line: 360, lineRule: "auto" },
              },
            },
          },
        }
      : undefined,
    sections: [
      {
        properties: isGost
          ? {
              // Титульный лист входит в нумерацию, но номер на нём не ставится.
              titlePage: Boolean(titlePage),
              page: { margin: GOST_MARGIN },
            }
          : {},
        footers: isGost
          ? {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ children: [PageNumber.CURRENT], font: GOST_FONT, size: GOST_SIZE })],
                  }),
                ],
              }),
            }
          : undefined,
        children:
          body_children.length > 0
            ? body_children
            : [
                new Paragraph({
                  children: parseInlineFormatting(defaultTitle, {
                    font: isGost ? "Times New Roman" : undefined,
                    size: isGost ? 28 : undefined,
                  }),
                  alignment: isGost ? AlignmentType.JUSTIFIED : undefined,
                  indent: isGost ? { firstLine: GOST_INDENT } : undefined,
                  spacing: isGost ? { line: 360, lineRule: "auto" } : undefined,
                }),
              ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
