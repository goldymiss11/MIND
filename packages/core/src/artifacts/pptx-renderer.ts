import pptxgen from "pptxgenjs";
import { PresentationData, PresentationSchema } from "./schemas.js";

/**
 * Deterministically renders a presentation from structured JSON data into a PPTX Buffer.
 * Adheres to MIND deterministic artifact rendering principles.
 */
export async function renderPptx(input: PresentationData | unknown): Promise<Buffer> {
  const data = PresentationSchema.parse(input);

  // pptxgen default import can be instantiated
  const pptx = new (pptxgen as any)();

  pptx.layout = "LAYOUT_16x9";
  pptx.author = data.author || "MIND AI OS";
  pptx.company = "MIND Personal AI OS";
  pptx.title = data.title;

  // 1. Cover / Title Slide
  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: "0F172A" }; // Deep Slate / Navy background

  coverSlide.addText(data.title, {
    x: 1.0,
    y: 2.2,
    w: 11.3,
    h: 1.8,
    fontSize: 38,
    bold: true,
    color: "FFFFFF",
    align: "left",
    valign: "middle",
    fontFace: "Calibri",
  });

  const coverSubtitle = data.subtitle || (data.author ? `Автор: ${data.author}` : "Сгенерировано в MIND AI OS");
  coverSlide.addText(coverSubtitle, {
    x: 1.0,
    y: 4.2,
    w: 11.3,
    h: 0.8,
    fontSize: 20,
    color: "94A3B8", // Subtle cool gray
    align: "left",
    fontFace: "Calibri",
  });

  // Small brand badge at bottom
  coverSlide.addText("MIND • Personal AI OS", {
    x: 1.0,
    y: 6.2,
    w: 5.0,
    h: 0.4,
    fontSize: 12,
    color: "64748B",
    fontFace: "Calibri",
  });

  // 2. Content Slides
  for (const slideData of data.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    // Slide Header: Title
    slide.addText(slideData.title, {
      x: 0.8,
      y: 0.6,
      w: 11.7,
      h: 0.9,
      fontSize: 26,
      bold: true,
      color: "0F172A",
      fontFace: "Calibri",
      valign: "top",
    });

    // Subtitle if provided
    let contentTop = 1.6;
    if (slideData.subtitle) {
      slide.addText(slideData.subtitle, {
        x: 0.8,
        y: 1.4,
        w: 11.7,
        h: 0.5,
        fontSize: 15,
        color: "64748B",
        fontFace: "Calibri",
        valign: "top",
      });
      contentTop = 2.0;
    }

    // Top Accent line under header
    slide.addShape(pptx.ShapeType.line, {
      x: 0.8,
      y: contentTop - 0.2,
      w: 11.7,
      h: 0,
      line: { color: "E2E8F0", width: 1.5 },
    });

    // Slide Bullets / Content
    if (slideData.bullets && slideData.bullets.length > 0) {
      const textObjects = slideData.bullets.map((bullet) => ({
        text: bullet,
        options: {
          bullet: true,
          fontSize: 16,
          color: "334155",
          breakLine: true,
          fontFace: "Calibri",
        },
      }));

      slide.addText(textObjects, {
        x: 0.8,
        y: contentTop,
        w: 11.7,
        h: 6.8 - contentTop,
        lineSpacing: 26,
        paraSpaceAfter: 10,
        valign: "top",
      });
    }

    // Speaker notes if provided
    if (slideData.notes) {
      slide.addNotes(slideData.notes);
    }
  }

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}
