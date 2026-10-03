---
name: mind-artifacts
description: Generation, validation and versioning of real user files
---

# MIND Artifacts

MIND must generate real files when the user requests a document, presentation, spreadsheet, code project or other artifact.

Do not return only text when the user expects a file.

---

# Supported formats

- DOCX
- PPTX
- XLSX
- PDF
- CSV
- TXT
- Markdown
- ZIP
- source code

---

# Core architecture

AI generates a structured specification.

A deterministic renderer creates the actual file.

Pipeline:

```text
User request
→ structured specification
→ renderer
→ validation
→ storage
→ version
→ delivery
```

---

# Never

Do not ask the language model to manually construct binary file data.

Do not trust an artifact merely because generation completed.

---

# DOCX

Use:

```text
python-docx
```

Validate:

* file exists
* file opens
* expected headings exist
* expected sections exist
* document is not empty

---

# PPTX

Use:

```text
python-pptx
```

Validate:

* file opens
* slide count is correct
* slides are not empty
* text exists
* no obvious overflow when detectable
* requested structure is present

---

# XLSX

Use:

```text
openpyxl
```

Validate:

* workbook opens
* expected sheets exist
* expected columns exist
* formulas are structurally valid
* data types are reasonable

---

# PDF

Use:

```text
reportlab
```

Validate:

* file exists
* file opens
* expected pages exist
* content is present

---

# Code artifacts

Code should be generated as real files.

Examples:

```text
.ts
.tsx
.js
.py
.sql
.html
.css
.json
```

When possible:

1. generate
2. format
3. lint
4. typecheck
5. test
6. package

---

# ZIP projects

For multi-file projects:

```text
create files
→ validate paths
→ validate files
→ create ZIP
→ verify ZIP
```

Prevent path traversal.

---

# Artifact versions

Never silently overwrite important artifacts.

Use versions:

```text
artifact v1
artifact v2
artifact v3
```

Store:

* artifact_id
* version
* created_at
* source_task
* generation metadata

---

# Artifact naming

Use readable names.

Example:

```text
discrete-mathematics-report-v2.docx
```

Avoid:

```text
file_1738291_final_final2.docx
```

---

# Delivery

After successful generation:

1. store artifact
2. record artifact metadata
3. verify availability
4. deliver through the appropriate interface
5. tell the user what was created

Never claim a file exists if storage failed.
