---
name: mind-miniapp
description: Telegram Mini App UX and frontend architecture for MIND
---

# MIND Mini App

The Mini App is the visual control center of MIND.

Telegram remains the primary conversational interface.

The Mini App provides organization, visualization and control.

---

# Main screens

Initial screens:

1. Home
2. Inbox
3. Tasks
4. Memory
5. Artifacts
6. Timeline
7. Settings

---

# Home

Home should show:

- greeting
- global Ask MIND input
- today's tasks
- upcoming deadlines
- active AI work
- recent artifacts
- important reminders

---

# Inbox

Inbox contains captured information:

- messages
- files
- links
- voice notes
- screenshots
- ideas

MIND can classify items into:

- task
- memory
- document
- event
- person
- idea

---

# Tasks

Tasks should display:

- title
- deadline
- status
- progress
- project
- AI actions

Possible actions:

- Continue
- Generate draft
- Research
- Create document
- Remind me
- Complete

---

# Memory

Memory should feel like the user's personal brain.

Categories:

- People
- Projects
- Facts
- Preferences
- Decisions
- Documents
- Education
- Work

Users should be able to search and inspect memories.

---

# Artifacts

Show:

- generated files
- versions
- creation date
- related task/project
- available actions

Actions:

- open
- download
- regenerate
- improve
- create new version

---

# Timeline

Timeline combines:

- events
- tasks
- deadlines
- reminders
- AI work

The goal is to provide temporal context.

---

# UX principles

Prefer:

- minimal UI
- clear hierarchy
- fast interactions
- conversational actions
- progressive disclosure

Avoid:

- unnecessary dashboards
- excessive settings
- complex forms
- enterprise-style interfaces

---

# Global command

The Mini App should have a global:

```text
Ask MIND...
```

input.

Users should be able to ask natural-language requests from anywhere.

---

# Frontend architecture

Use:

* React
* TypeScript
* Next.js
* Tailwind

Keep business logic out of UI components.

Use API/application services.

---

# Telegram authentication

Verify Telegram Mini App initialization data on the backend.

Never trust client-provided user identity.

---

# Mobile first

The Mini App should primarily be designed for mobile Telegram usage.

Desktop layouts may be supported later.

---

# Product principle

The Mini App should organize the user's brain.

It should not become another productivity app the user has to manually maintain.
