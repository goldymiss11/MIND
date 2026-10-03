---
name: mind-memory
description: Persistent memory, retrieval and personalization system for MIND
---

# MIND Memory

Memory is one of the core capabilities of MIND.

The goal is not to store everything.

The goal is to remember the information that makes future interactions more useful.

---

# Core principle

A message is not automatically a memory.

Example:

"Я сегодня устал."

Usually this should not become permanent memory.

Example:

"Я учусь на втором курсе Computer Science."

This may become persistent memory.

Example:

"Мне нравится получать ответы коротко и по делу."

This should become a preference memory.

---

# Memory types

Supported memory types:

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

---

# Memory lifecycle

A candidate memory may be:

1. ignored
2. temporary context
3. persistent memory
4. update to existing memory
5. expired
6. deleted

Do not create permanent memory unless it has future value.

---

# Memory object

A memory should conceptually contain:

```text
id
user_id
type
content
importance
confidence
source
source_message_id
created_at
updated_at
expires_at
embedding
```

---

# Importance

Use a simple importance scale:

```text
0 = ephemeral
1 = useful
2 = important
3 = permanent
```

Examples:

0:
"Сегодня хочу кофе."

1:
"Сегодня у меня встреча."

2:
"Я работаю над проектом X."

3:
"Я учусь на Computer Science."

---

# Confidence

Memory confidence represents how certain the system is that the information is valid.

Examples:

Explicit user statement:

```text
confidence = high
```

AI inference:

```text
confidence = lower
```

Never treat an inference as an explicit user fact.

---

# Deduplication

Before creating a new memory:

1. search for similar existing memories
2. determine whether the information already exists
3. update existing memory if appropriate
4. otherwise create new memory

Do not create duplicate memories.

---

# Updating memory

Example:

Existing:

"User lives in Amsterdam."

User later says:

"I moved to Rotterdam."

The system should update or supersede the old memory.

Do not keep both as equally current facts.

---

# Retrieval

Never load all user memories into the model context.

Build a small context pack.

Retrieval should combine:

1. semantic similarity
2. structured filters
3. recency
4. active project
5. active task
6. relevant documents
7. user preferences

---

# Context pack

The model should receive only relevant information.

Example:

```text
Current user
Active project
Relevant memories
Relevant tasks
Relevant documents
Recent conversation
User preferences
```

Do not send the entire database.

---

# Memory and privacy

Memory belongs to exactly one user.

Every query must be scoped by user_id.

Never expose memory belonging to another user.

Never use another user's data as context.

---

# Example

User:

"I have an exam in discrete mathematics on October 17."

Possible actions:

1. detect deadline
2. create/update course information
3. create task
4. associate task with course
5. schedule reminder
6. save useful educational memory

Do not blindly save the entire raw message as permanent memory.

---

# Memory extraction

Memory extraction should happen through structured output.

Example:

```json
{
  "should_store": true,
  "type": "educational",
  "content": "User has an exam in discrete mathematics on October 17.",
  "importance": 2,
  "confidence": 0.98
}
```

The backend must validate this output.

---

# Never

Never:

* store every message
* expose private memories
* assume inferred facts are certain
* duplicate memories
* send all memories to the model
* allow the model to bypass user ownership
