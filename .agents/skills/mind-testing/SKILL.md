---
name: mind-testing
description: Testing strategy and quality standards for MIND
---

# MIND Testing

MIND must be tested at multiple levels.

AI systems require behavioral testing, not only traditional unit tests.

---

# Unit tests

Write unit tests for:

- memory scoring
- memory deduplication
- task state transitions
- deadline parsing
- permission checks
- tool validation
- context construction
- notification rules
- artifact specifications

---

# Integration tests

Test:

- PostgreSQL operations
- Redis jobs
- Telegram handlers
- AI service
- tool execution
- artifact generation
- storage
- authentication

---

# End-to-end tests

Critical flows should be tested end-to-end.

Example:

```text
User sends message
→ intent detected
→ memory created
→ task created
→ reminder scheduled
→ worker executes
→ artifact generated
→ artifact delivered
```

---

# AI tests

Do not test only exact natural-language output.

Test structured behavior.

Example:

Input:

```text
"Напомни мне купить подарок 15 октября."
```

Expected:

```text
task/reminder created
correct date
correct user
correct reminder type
```

The exact wording of the AI response may vary.

---

# Tool tests

Every tool should test:

* valid input
* invalid input
* missing fields
* unauthorized resource
* wrong user
* malformed IDs
* model-generated unexpected values

---

# Security tests

Test:

* cross-user access
* prompt injection
* malicious file names
* path traversal
* unauthorized tools
* expired authentication
* invalid Telegram data

---

# Artifact tests

Generated files must be opened and validated.

Examples:

DOCX:

```text
open file
check sections
check content
```

PPTX:

```text
open file
check slide count
check slide content
```

XLSX:

```text
open workbook
check sheets
check values/formulas
```

---

# Regression tests

Every discovered bug should result in a regression test when practical.

Do not repeatedly fix the same class of problem manually.

---

# Definition of done

A feature is not complete if:

* tests are missing where appropriate
* authorization is missing
* error handling is missing
* generated artifacts are not validated
* background jobs are not tested
* important failure states are ignored
