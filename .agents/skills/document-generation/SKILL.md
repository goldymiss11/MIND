---
name: document-generation
description: High-quality DOCX and PDF document generation
---

# Document Generation

Create professional documents from structured content.

---

# Process

```text
Understand requirements
→ create outline
→ generate content
→ review structure
→ render
→ validate
→ deliver
```

---

# Document structure

Prefer:

* title
* introduction
* sections
* headings
* lists
* tables when useful
* conclusion
* references when appropriate

---

# DOCX

Use python-docx.

Use proper:

* heading styles
* paragraphs
* tables
* spacing
* page structure

Avoid manually simulating formatting with excessive whitespace.

---

# PDF

Use reportlab or an appropriate deterministic PDF renderer.

Validate generated PDF.

---

# Quality

Before delivery check:

* missing sections
* repeated text
* broken formatting
* empty pages
* incorrect headings
* obvious factual inconsistencies

---

# User requirements

Preserve:

* requested language
* requested length
* requested structure
* requested tone
* requested formatting
