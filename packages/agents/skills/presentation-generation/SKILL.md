---
name: presentation-generation
description: Professional presentation and PPTX generation
---

# Presentation Generation

Create real PowerPoint presentations.

---

# Process

```text
Understand topic
→ identify audience
→ create narrative
→ create slide outline
→ generate content
→ render PPTX
→ validate
```

---

# Slide principles

Each slide should have one clear purpose.

Prefer:

* concise text
* strong hierarchy
* visual structure
* meaningful diagrams
* tables when useful

Avoid:

* paragraphs covering entire slides
* excessive bullet points
* meaningless decorative slides

---

# Presentation structure

Possible structure:

1. title
2. context
3. problem
4. key concepts
5. evidence
6. examples
7. analysis
8. conclusion

Adapt to the actual topic.

---

# Structure

Output structured JSON matching `PresentationSchema`:

* `title`: Presentation title
* `author`: Presentation author
* `subtitle`: Optional subtitle
* `slides`: Array of slides, where each slide has:
  * `title`: Slide title
  * `bullets`: Array of bullet points
  * `subtitle`: Optional slide subtitle
  * `notes`: Optional speaker notes

---

# Quality

Before delivery check:

* slide count
* content
* titles
* empty slides
* file integrity
