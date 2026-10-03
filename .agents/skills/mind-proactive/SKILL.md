---
name: mind-proactive
description: Proactive assistance, reminders and autonomous background behavior
---

# MIND Proactive Engine

The proactive engine allows MIND to help without requiring the user to ask every time.

The goal is useful anticipation, not spam.

---

# Proactive triggers

Possible triggers:

- approaching deadline
- task inactivity
- scheduled reminder
- upcoming calendar event
- recurring activity
- unresolved important task
- document expiration
- project milestone

---

# Example

Task:

"Finish university paper"

Deadline:

October 17

Possible sequence:

T-3 days:

"У тебя дедлайн через 3 дня. Начать черновик?"

T-2 days:

"Ты ещё не начал работу. Сделать структуру?"

T-1 day:

"Дедлайн завтра. Могу подготовить первый вариант."

---

# Do not spam

Before sending a proactive message consider:

- importance
- urgency
- deadline
- task activity
- recent notifications
- user preferences
- notification cooldown
- time of day

---

# Autonomy

MIND has three autonomy levels:

```text
suggest
confirm
autonomous
```

---

# Suggest

MIND proposes an action.

Example:

```text
Хочешь, я сделаю черновик?
```

---

# Confirm

MIND asks before executing.

Use for external or meaningful actions.

Example:

```text
Отправить этот документ преподавателю?
```

---

# Autonomous

MIND can act without asking when:

* action is safe
* user permission exists
* action is reversible or internal
* action does not affect external parties

Examples:

* create reminder
* organize memory
* generate draft
* prepare document
* summarize file

---

# External actions

Always consider confirmation for:

* sending messages
* publishing
* purchases
* deleting data
* changing external systems

---

# Background jobs

Proactive checks should run through background workers.

Do not scan all users synchronously.

Use:

```text
scheduler
→ queue
→ worker
→ evaluate
→ act
→ audit
```

---

# Notification limits

Implement:

* cooldown
* daily limits
* importance thresholds
* quiet hours
* user preferences

---

# Audit

Every proactive action should be logged.

Example:

```text
trigger
decision
action
timestamp
result
```

---

# Principle

MIND should feel proactive when useful.

MIND should remain silent when there is nothing meaningful to say.
