---
name: coding
description: General software development skill for building and modifying MIND
---

# Coding Skill

Write production-quality code.

---

# Before coding

Inspect:

- repository structure
- existing implementation
- package configuration
- database schema
- existing services
- tests
- relevant skills

Do not rewrite existing systems unnecessarily.

---

# Implementation

Prefer:

- TypeScript
- strong typing
- small functions
- explicit interfaces
- clear naming
- predictable control flow

---

# Error handling

Errors should:

- be explicit
- contain useful internal context
- avoid leaking secrets
- be translated into user-friendly messages where appropriate

---

# API design

Validate all external input.

Never assume client data is correct.

Use schemas for:

- request validation
- tool calls
- structured AI output

---

# Database

Use parameterized queries.

Enforce user ownership.

Avoid N+1 queries where practical.

---

# AI code

Do not place large prompts inline throughout the codebase.

Centralize reusable prompts/instructions where practical.

Prefer structured outputs.

---

# Testing

Add tests for meaningful behavior.

Do not rely only on manual testing.

---

# Before completion

Run appropriate:

- typecheck
- lint
- unit tests
- integration tests
- build

Fix failures before declaring completion.
