import { Document, Paragraph, TextRun, HeadingLevel, Packer } from "docx";

/**
 * Parses inline formatting: **bold**, *italic*, `code`.
 */
function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);

  for (const token of tokens) {
    if (!token) continue;
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true }));
    } else if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      runs.push(new TextRun({ text: token.slice(1, -1), italics: true }));
    } else if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      runs.push(new TextRun({ text: token.slice(1, -1), font: "Courier New" }));
    } else {
      runs.push(new TextRun({ text: token }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun(text)];
}

/**
 * Converts markdown text into a well-structured .docx Buffer.
 */
export async function markdownToDocx(markdown: string, defaultTitle = "Document"): Promise<Buffer> {
  const lines = markdown.split(/\r?\n/);
  const children: Paragraph[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.startsWith("# ")) {
      children.push(
        new Paragraph({
          text: line.slice(2).trim(),
          heading: HeadingLevel.TITLE,
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }

    if (line.startsWith("## ")) {
      children.push(
        new Paragraph({
          text: line.slice(3).trim(),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }

    if (line.startsWith("### ")) {
      children.push(
        new Paragraph({
          text: line.slice(4).trim(),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 160, after: 80 },
        })
      );
      continue;
    }

    if (line.startsWith("#### ")) {
      children.push(
        new Paragraph({
          text: line.slice(5).trim(),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 120, after: 60 },
        })
      );
      continue;
    }

    // Bullet lists
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const content = line.slice(2).trim();
      children.push(
        new Paragraph({
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
            new TextRun({ text: `${numMatch[1]}. `, bold: true }),
            ...parseInlineFormatting(numMatch[2]),
          ],
          spacing: { before: 40, after: 40 },
        })
      );
      continue;
    }

    // Standard paragraph
    children.push(
      new Paragraph({
        children: parseInlineFormatting(line),
        spacing: { before: 60, after: 60, line: 276 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children.length > 0 ? children : [new Paragraph({ text: defaultTitle })],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
