import ExcelJS from "exceljs";
import { SpreadsheetData, SpreadsheetSchema } from "./schemas.js";

/**
 * Deterministically renders a spreadsheet from structured JSON data into an XLSX Buffer.
 * Adheres to MIND deterministic artifact rendering principles.
 */
export async function renderXlsx(input: SpreadsheetData | unknown): Promise<Buffer> {
  const data = SpreadsheetSchema.parse(input);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MIND AI OS";
  workbook.lastModifiedBy = "MIND AI OS";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Excel sheet names cannot exceed 31 characters and cannot contain: \ / ? * : [ ]
  const rawSheetName = data.sheetName || data.title || "Лист 1";
  const safeSheetName = rawSheetName
    .replace(/[\\/?*:[\]]/g, "_")
    .trim()
    .slice(0, 31) || "Лист 1";

  const worksheet = workbook.addWorksheet(safeSheetName, {
    views: [{ showGridLines: true }],
  });

  // Normalize column definitions
  const normalizedColumns = data.columns.map((col, idx) => {
    if (typeof col === "string") {
      return {
        header: col,
        key: `col_${idx}`,
        originalHeader: col,
        width: Math.max(col.length + 4, 14),
      };
    }
    return {
      header: col.header,
      key: col.key || `col_${idx}`,
      originalHeader: col.header,
      width: col.width || Math.max(col.header.length + 4, 14),
    };
  });

  worksheet.columns = normalizedColumns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  // Style header row (Row 1)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.font = {
    name: "Calibri",
    size: 11,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" }, // Modern dark slate header
  };
  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  // Add data rows
  for (const rawRow of data.rows) {
    if (Array.isArray(rawRow)) {
      worksheet.addRow(rawRow);
    } else if (rawRow && typeof rawRow === "object") {
      const rowValues: any[] = [];
      for (const col of normalizedColumns) {
        const val =
          rawRow[col.key] !== undefined
            ? rawRow[col.key]
            : rawRow[col.originalHeader];
        rowValues.push(val !== undefined ? val : "");
      }
      worksheet.addRow(rowValues);
    }
  }

  // Format data rows and apply borders
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.height = 22;
      row.alignment = { vertical: "middle" };
      row.font = { name: "Calibri", size: 10 };

      // Light alternating background for readability (zebra striping)
      const isEven = rowNumber % 2 === 0;
      if (isEven) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    }
  });

  // Auto-fit column widths based on maximum cell content
  worksheet.columns.forEach((column) => {
    let maxLength = column.header ? column.header.toString().length : 10;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const valStr = cell.value !== null && cell.value !== undefined ? String(cell.value) : "";
      if (valStr.length > maxLength) {
        maxLength = valStr.length;
      }
    });
    column.width = Math.min(Math.max(maxLength + 4, 12), 60);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}
