import { z } from "zod";

/**
 * Column definition schema for a spreadsheet.
 * Can be a simple string (the header name) or an object with additional formatting options.
 */
export const SpreadsheetColumnSchema = z.union([
  z.string().min(1),
  z.object({
    header: z.string().min(1),
    key: z.string().optional(),
    width: z.number().positive().optional(),
  }),
]);

export type SpreadsheetColumn = z.infer<typeof SpreadsheetColumnSchema>;

/**
 * Row data schema for a spreadsheet.
 * Supports array of cell values or key-value object where keys correspond to column keys/headers.
 */
export const SpreadsheetRowSchema = z.union([
  z.array(z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])),
  z.record(z.string(), z.any()),
]);

export type SpreadsheetRow = z.infer<typeof SpreadsheetRowSchema>;

/**
 * Complete spreadsheet schema for LLM structured output.
 */
export const SpreadsheetSchema = z.object({
  title: z.string().optional(),
  sheetName: z.string().min(1).default("Лист 1"),
  columns: z.array(SpreadsheetColumnSchema).min(1),
  rows: z.array(SpreadsheetRowSchema).default([]),
});

export type SpreadsheetData = z.infer<typeof SpreadsheetSchema>;

/**
 * Single slide schema within a presentation.
 */
export const SlideSchema = z.object({
  title: z.string().min(1),
  bullets: z.array(z.string()).default([]),
  subtitle: z.string().optional(),
  notes: z.string().optional(),
});

export type SlideData = z.infer<typeof SlideSchema>;

/**
 * Complete presentation schema for LLM structured output.
 */
export const PresentationSchema = z.object({
  title: z.string().min(1),
  author: z.string().optional(),
  subtitle: z.string().optional(),
  slides: z.array(SlideSchema).min(1),
});

export type PresentationData = z.infer<typeof PresentationSchema>;
