---
name: code-review
description: Code review and architectural quality checks for MIND
---

# Code Review

Review code for correctness, security, maintainability and architectural consistency.

---

# Review order

Check:

1. correctness
2. security
3. authorization
4. data integrity
5. error handling
6. performance
7. architecture
8. maintainability
9. tests

---

# Security checks

Look for:

- missing user_id filtering
- authorization bypass
- unsafe SQL
- unsafe file paths
- prompt injection
- unrestricted tools
- leaked secrets

---

# AI-specific checks

Look for:

- trusting model output
- missing schema validation
- invented tool results
- missing confirmation
- sending excessive context
- storing sensitive information unnecessarily

---

# Architecture checks

Look for:

- duplicated logic
- business logic in handlers
- direct provider dependencies
- unnecessary abstractions
- synchronous long-running work
- missing background jobs

---

# Output

Review findings should be prioritized:

```text
critical
high
medium
low
```

Do not report style issues as critical problems.

For each meaningful finding explain:

* problem
* why it matters
* location
* recommended fix
