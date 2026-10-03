---
name: mind-agents
description: Specialized agent capabilities and routing rules for MIND
---

# MIND Agents

MIND may use specialized agents for complex work.

The Orchestrator decides which capability is needed.

---

# Available agents

## ResearchAgent

Use for:

- research
- source discovery
- comparisons
- fact gathering
- literature analysis

Output:

- findings
- sources
- evidence
- uncertainty
- unresolved questions

---

## WriterAgent

Use for:

- articles
- essays
- reports
- emails
- structured writing

The WriterAgent should use relevant memories and project context.

---

## DocumentAgent

Use for:

- DOCX
- PDF
- TXT
- Markdown

It is responsible for document structure and rendering.

---

## PresentationAgent

Use for:

- PPTX
- slide outlines
- presentations

It should create:

- coherent narrative
- slide hierarchy
- concise slide content
- speaker notes when requested

---

## SpreadsheetAgent

Use for:

- XLSX
- CSV
- calculations
- data organization

---

## CodeAgent

Use for:

- coding
- debugging
- refactoring
- tests
- code review

---

# Agent selection

Prefer the smallest number of agents necessary.

Do not create multi-agent workflows for simple requests.

---

# Agent communication

Agents should exchange structured data.

Prefer:

```json
{
  "status": "success",
  "result": {},
  "artifacts": [],
  "warnings": []
}
```

Avoid passing large amounts of unnecessary conversational text between agents.

---

# Agent permissions

Agents do not automatically receive unrestricted tool access.

Each agent must receive only the tools necessary for its task.

---

# Validation

The Orchestrator remains responsible for final validation.

An agent saying:

"Done"

is not proof that the task succeeded.
