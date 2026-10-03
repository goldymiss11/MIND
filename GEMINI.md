# MIND — Personal AI OS

## 1. Product

MIND is a Telegram-first Personal AI Operating System.

MIND is not a generic chatbot.

Its purpose is to act as a user's second brain:

- Remember
- Understand
- Find
- Plan
- Remind
- Act

The product consists of:

1. Telegram Bot — primary conversational interface
2. Telegram Mini App — visual dashboard
3. AI Orchestrator — reasoning and tool routing
4. Memory System — long-term personal context
5. Task System — goals, tasks, deadlines and progress
6. Proactive Engine — reminders and autonomous actions
7. Artifact Engine — DOCX, PPTX, XLSX, PDF, code and other files
8. Agent/Skill System — reusable workflows

---

# 2. Core Product Principle

The user should never need to think about which subsystem to use.

The user can simply say:

"Remember this."

"Remind me."

"Find what I said about X."

"Do this."

"Make a document."

"Prepare a presentation."

"Write the code."

"Handle this for me."

The system decides how to execute the request.

Do NOT expose technical concepts such as agents, embeddings, RAG, tools or workflows to the user unless necessary.

---

# 3. Technology

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Telegram Mini Apps SDK

## Backend

- Node.js
- TypeScript
- Fastify or equivalent lightweight HTTP framework
- grammY for Telegram Bot API

## Database

- PostgreSQL
- pgvector

## Queue

- Redis
- BullMQ

## Storage

- S3-compatible object storage
- Prefer Cloudflare R2

## AI

- Google Gemini API
- Official @google/genai SDK
- Prefer modern Gemini Interactions API for agentic workflows where appropriate
- Use function calling for application tools

Never use deprecated @google/generative-ai.

---

# 4. Architecture

Use a modular monolith.

Do NOT create microservices during MVP.

Main modules:

/apps/web
/apps/api
/apps/worker
/packages/core
/packages/ai
/packages/db
/packages/telegram
/packages/artifacts
/packages/memory
/packages/agents
/packages/shared

The system should remain easy to split into services later.

---

# 5. AI Architecture

Use one central Orchestrator.

The Orchestrator decides:

- intent
- required context
- required memories
- required tools
- required skill
- whether user confirmation is required
- whether work should run synchronously or in background

Example:

User:
"Make my discrete mathematics article."

Orchestrator:

1. Find relevant memories
2. Find related project
3. Find course information
4. Find relevant documents
5. Find deadline
6. Select academic-writing skill
7. Research if necessary
8. Generate content
9. Review
10. Generate DOCX
11. Save artifact
12. Notify user

---

# 6. Memory

Memory is a first-class system.

Do NOT treat memory as a single vector database.

Memory types:

- semantic
- episodic
- preference
- task
- project
- relationship
- decision
- document
- educational
- professional

Every memory should have:

- user_id
- type
- content
- importance
- confidence
- source
- created_at
- updated_at
- optional expiration
- embedding

Never store every message as permanent memory.

Use memory extraction and importance scoring.

---

# 7. Retrieval

Never send the entire user's memory to the model.

Build a context pack.

Retrieval should combine:

1. semantic search
2. structured filters
3. recent conversation
4. active project
5. active task
6. relevant documents
7. user preferences

The final context should be minimal but sufficient.

---

# 8. Tasks

Tasks are not simple TODO records.

A task may contain:

- title
- description
- deadline
- priority
- project
- progress
- dependencies
- source
- context
- autonomy level
- status

Tasks can trigger proactive actions.

---

# 9. Proactive Engine

MIND can act without a new user message.

Possible triggers:

- time
- approaching deadline
- inactivity
- calendar event
- task state
- user pattern
- document expiration
- recurring event

However, proactive behavior must avoid spam.

Use:

- relevance score
- urgency score
- cooldown
- notification limits
- user preferences

Never send unnecessary notifications.

---

# 10. Autonomy

Every action has an autonomy level:

SUGGEST
CONFIRM
AUTONOMOUS

Safe actions can be autonomous:

- save memory
- create reminder
- create draft
- generate artifact
- analyze documents

External or irreversible actions normally require confirmation:

- send email
- send message
- publish
- delete
- purchase
- modify external data

Never perform irreversible actions without explicit authorization.

---

# 11. Artifacts

MIND must create real files.

Supported artifacts:

- DOCX
- PDF
- PPTX
- XLSX
- CSV
- JSON
- TXT
- Markdown
- JS
- TS
- Python
- HTML
- CSS
- SQL
- ZIP

Do not ask the LLM to directly produce binary files.

Use deterministic renderers.

Examples:

DOCX -> python-docx
PPTX -> python-pptx
XLSX -> openpyxl
PDF -> reportlab

Generated artifacts must be saved to object storage and registered in the database.

---

# 12. Artifact Quality

Every artifact workflow should contain:

1. specification
2. generation
3. validation
4. revision if necessary
5. final export

Never return a file without basic validation.

For example:

DOCX:
- file opens
- expected sections exist

PPTX:
- presentation opens
- slide count correct
- no empty slides

XLSX:
- workbook opens
- formulas/data are valid

Code:
- syntax check
- tests when feasible

---

# 13. Agent Skills

Skills are reusable workflows.

Examples:

- research
- academic-writing
- general-writing
- document-generation
- presentation-generation
- spreadsheet-generation
- coding
- code-review
- study-planning
- project-planning
- summarization
- meeting-preparation

Each skill must contain a SKILL.md.

Do not duplicate skill instructions inside application code.

---

# 14. UX

Telegram Bot is the primary interface.

Mini App is the visual control center.

Main Mini App sections:

- Home
- Inbox
- Tasks
- Timeline
- Memory
- Artifacts
- Settings

Primary action:

"Ask MIND"

Users should be able to perform almost every action through natural language.

---

# 15. Error Handling

Never silently fail.

If a tool fails:

1. retry when safe
2. explain what failed
3. preserve partial work
4. provide a recovery action

Never tell the user "done" unless the operation actually completed.

---

# 16. Observability

Every agent execution must be traceable.

Store:

- agent_run
- tool_calls
- execution status
- duration
- errors
- model
- token usage if available
- generated artifacts

Never log secrets or private credentials.

---

# 17. Security

Treat user files and external content as untrusted.

Protect against:

- prompt injection
- malicious documents
- unsafe code execution
- path traversal
- unauthorized tool calls
- data leakage between users

Every database query must be scoped to user_id.

Never allow one user to retrieve another user's memories, documents or artifacts.

---

# 18. Development Rules

TypeScript strict mode.

Prefer simple code.

Avoid premature abstractions.

Do not add dependencies unless necessary.

Do not create a service when a module is sufficient.

Do not modify unrelated files.

Before implementing a feature:

1. inspect repository
2. understand existing architecture
3. identify affected modules
4. implement minimal coherent change
5. test
6. verify

---

# 19. Testing

Every important subsystem must have tests.

Priority:

1. memory isolation
2. task creation
3. reminder scheduling
4. tool authorization
5. artifact generation
6. Telegram authentication
7. agent orchestration

Security tests are mandatory for user-scoped data.

---

# 20. Definition of Done

A feature is not complete when code compiles.

A feature is complete when:

- implementation works
- tests pass
- error handling exists
- user-facing behavior is correct
- authorization is correct
- logs/observability exist where needed
- no unrelated behavior regresses

---

# 21. Product Philosophy

MIND should feel:

- calm
- intelligent
- proactive
- trustworthy
- personal
- fast

Never make the product feel like an enterprise dashboard.

The user should feel:

"I told MIND once. MIND remembers."

"I don't need to manage my life manually."

"MIND can actually do the work."
