---
name: mind-telegram
description: Telegram Bot architecture and interaction rules for MIND
---

# MIND Telegram

Telegram is the primary conversational interface of MIND.

The Telegram interface should feel natural and conversational.

---

# Framework

Use:

```text
grammY
```

---

# Input types

Support:

* text
* voice
* documents
* images
* links
* commands
* callbacks
* Mini App interactions

---

# Handler architecture

Telegram handlers should:

1. authenticate user
2. normalize input
3. call application services
4. return result

Handlers must NOT contain business logic.

---

# Example

Bad:

```text
Telegram handler
→ call Gemini
→ parse task
→ insert database
→ schedule reminder
```

Better:

```text
Telegram handler
→ ApplicationService
→ Orchestrator
→ tools/services
→ result
→ Telegram response
```

---

# Commands

Useful commands may include:

```text
/start
/help
/tasks
/memory
/today
/settings
```

Natural language remains the primary interface.

Commands should not replace conversational interaction.

---

# Long-running requests

Do not block Telegram handlers during expensive operations.

Example:

```text
User:
"Сделай презентацию на 30 слайдов."

↓

Telegram
↓

Create background job

↓

"Начал работать над презентацией."

↓

Worker

↓

Generate

↓

Validate

↓

Send PPTX
```

---

# User experience

Responses should be:

* concise
* clear
* actionable

Avoid unnecessary technical details.

---

# Progress

For long-running work, provide meaningful status updates.

Example:

```text
Изучаю документ...
Готовлю структуру...
Создаю слайды...
Проверяю презентацию...
Готово.
```

Do not send excessive progress messages.

---

# Files

When receiving a document:

1. identify user
2. validate file metadata
3. download safely
4. store in controlled storage
5. associate with user
6. process asynchronously when appropriate

Never trust filenames or paths.

---

# Telegram identity

Never trust user identity supplied by AI.

Authentication must come from verified Telegram data.

---

# Errors

User-facing errors should be understandable.

Bad:

```text
ECONNRESET at WorkerService.ts:231
```

Better:

```text
Не удалось обработать файл. Попробую ещё раз.
```

Internal logs may contain technical details.

---

# Telegram and Mini App

Telegram Bot and Mini App must use the same backend domain logic.

Do not duplicate business rules between them.
