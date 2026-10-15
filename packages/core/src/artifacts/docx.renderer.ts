import { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } from "docx";

export interface MarkdownToDocxOptions {
  defaultTitle?: string;
  isGost?: boolean;
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

  const lines = markdown.split(/\r?\n/);
  const children: Paragraph[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.startsWith("# ")) {
      const headingText = line.slice(2).trim();
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
      children.push(
        new Paragraph({
          children: parseInlineFormatting(headingText, {
            font: isGost ? "Times New Roman" : undefined,
            size: isGost ? 32 : undefined,
            defaultBold: true,
          }),
          heading: HeadingLevel.HEADING_1,
          alignment: isGost ? AlignmentType.CENTER : undefined,
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
          indent: isGost ? { firstLine: 720 } : undefined,
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
          indent: isGost ? { firstLine: 720 } : undefined,
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
        new Paragraph({
          children: parseInlineFormatting(content, {
            font: isGost ? "Times New Roman" : undefined,
            size: isGost ? 28 : undefined,
          }),
          bullet: { level: 0 },
          indent: isGost ? { firstLine: 720 } : undefined,
          spacing: isGost
            ? { before: 40, after: 40, line: 360, lineRule: "auto" }
            : { before: 40, after: 40 },
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
              bold: true,
              font: isGost ? "Times New Roman" : undefined,
              size: isGost ? 28 : undefined,
            }),
            ...parseInlineFormatting(numMatch[2], {
              font: isGost ? "Times New Roman" : undefined,
              size: isGost ? 28 : undefined,
            }),
          ],
          indent: isGost ? { firstLine: 720 } : undefined,
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
        indent: isGost ? { firstLine: 720 } : undefined,
        spacing: isGost
          ? { before: 0, after: 0, line: 360, lineRule: "auto" }
          : { before: 60, after: 60, line: 276 },
      })
    );
  }

  const doc = new Document({
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
                size: 32,
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
                indent: { firstLine: 720 },
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
              page: {
                margin: {
                  left: 1700, // 30 mm
                  right: 567, // 10 mm
                  top: 1134,  // 20 mm
                  bottom: 1134, // 20 mm
                },
              },
            }
          : {},
        children:
          children.length > 0
            ? children
            : [
                new Paragraph({
                  children: parseInlineFormatting(defaultTitle, {
                    font: isGost ? "Times New Roman" : undefined,
                    size: isGost ? 28 : undefined,
                  }),
                  alignment: isGost ? AlignmentType.JUSTIFIED : undefined,
                  indent: isGost ? { firstLine: 720 } : undefined,
                  spacing: isGost ? { line: 360, lineRule: "auto" } : undefined,
                }),
              ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
