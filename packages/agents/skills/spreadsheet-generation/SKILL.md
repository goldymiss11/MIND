---
name: spreadsheet-generation
description: Professional spreadsheet and XLSX generation
---

# Spreadsheet Generation

Create real Excel spreadsheets (.xlsx).

---

# Process

```text
Understand data requirements
→ define columns and data types
→ structure rows and records
→ format headers and cells
→ render XLSX
→ validate
```

---

# Spreadsheet principles

Each spreadsheet should have clear headers and well-structured rows.

Prefer:

* descriptive column headers
* consistent data types per column
* readable cell values
* auto-fit column widths
* clean formatting and borders

Avoid:

* empty or missing headers
* mismatched columns and values
* unstructured arbitrary text blocks

---

# Structure

Output structured JSON matching `SpreadsheetSchema`:

* `title`: Optional title of the spreadsheet
* `sheetName`: Name of the sheet (max 31 chars)
* `columns`: Array of column names or column objects
* `rows`: Array of rows (each row is an array of cell values or key-value object)

---

# Quality

Before delivery check:

* columns are defined
* rows match column count
* numeric and date values are properly formatted
* file opens and is not empty
