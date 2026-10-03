---
name: mind-tasks
description: Intelligent task, deadline and project management for MIND
---

# MIND Tasks

MIND tasks are intelligent work objects, not simple TODO items.

---

# Task structure

A task may contain:

```text
id
user_id
title
description
status
priority
deadline
project_id
progress
dependencies
context
source
autonomy_level
created_at
updated_at
completed_at
```

---

# Task states

Use:

```text
inbox
planned
in_progress
blocked
completed
cancelled
```

---

# Task creation

Tasks can be created from:

* explicit user requests
* conversations
* documents
* detected deadlines
* calendar events
* projects

---

# Avoid over-creation

Do not create tasks from every sentence.

Example:

"Мне надо завтра купить молоко."

Create a task/reminder.

Example:

"Сегодня я много работал."

Do not create a task.

---

# Deadline detection

When a deadline is detected:

1. normalize the date
2. resolve timezone
3. verify ambiguity
4. associate with task
5. optionally create reminder

If the date is ambiguous, ask the user when necessary.

---

# Projects

Tasks may belong to projects.

Example:

```text
Project:
University

Course:
Discrete Mathematics

Task:
Write assignment

Deadline:
October 17
```

---

# Task context

Tasks should preserve useful context.

Example:

```text
Task:
Prepare discrete mathematics paper

Context:
- university course
- attached PDF
- previous research
- required format DOCX
```

This context allows MIND to continue working later.

---

# Task autonomy

Supported autonomy levels:

```text
suggest
confirm
autonomous
```

---

# Progress

Progress can be represented as:

```text
0-100
```

Do not invent progress.

Progress should come from:

* user statements
* completed subtasks
* verified artifacts
* actual work performed

---

# Task completion

A task is completed only when:

* user explicitly completes it
* or a verified workflow confirms completion

Never mark a task complete simply because a draft was generated.

---

# Dependencies

Example:

```text
Research
↓
Outline
↓
Draft
↓
Review
↓
Final document
```

MIND should understand dependencies when they materially affect execution.

---

# Reminders

Reminders should be tied to task context.

Do not spam users.

Use:

* importance
* deadline
* inactivity
* previous notifications
* user preferences

---

# Example

User:

"Мне нужно сдать эссе по математике до понедельника."

MIND should consider:

* create task
* detect deadline
* associate with course/project
* offer planning
* schedule useful reminder
* retain context

Do not create five unrelated tasks unless requested.
