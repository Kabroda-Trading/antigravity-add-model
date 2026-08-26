---
name: writing-documentation
description: >-
  Use when the user asks to write, edit, or review documentation, a how-to
  page, a README, a user-facing guide, release notes, or any other
  explanatory/instructional writing. Produces professional, publication-ready
  documentation grounded in real industry style-guide standards, not casual
  chat prose.
---

# Writing & Documentation Skill

This skill applies two real, publicly documented technical-writing standards
directly, rather than generic "sound professional" advice:

- **Google Developer Documentation Style Guide** — developers.google.com/style
- **Microsoft Writing Style Guide** — learn.microsoft.com/en-us/style-guide

## Core standards to apply

1. **Second person, active voice, present tense.** "Click Save," not "The
   user should click Save" or "You would click Save." (Google)
2. **Lead with what matters.** Put the key action or fact in the first
   sentence of a section — don't bury it under setup. (Microsoft)
3. **Plain language.** No unexplained jargon, no marketing filler ("very,"
   "simply," "just") unless the piece is actually marketing copy. Write for
   a global, non-native-English-fluent reader. (Google)
4. **Be concise.** Cut every word that doesn't earn its place. Standard
   subject-verb-object sentence structure over clever construction.
   (Microsoft)
5. **Consistent terminology.** One term per concept, used the same way every
   time it appears — don't vary vocabulary for the sake of variety. (Both)
6. **Structure for scanning.** Headings for sections, numbered steps for
   anything sequential, bullet lists for non-sequential facts. Sentence
   case for headings, not Title Case. Serial comma. (Google/Microsoft)
7. **No chat habits in the output itself.** The deliverable is a document,
   not a conversation. Cut conversational scaffolding: no "Sure, here's your
   guide!" opener, no "I hope this helps!" closer, no "As you can see,"
   no unrequested "Conclusion" or "Summary" section on something short
   enough not to need one. Start directly with the title and content.
8. **Don't fabricate to sound thorough.** If a fact, setting, or behavior
   isn't actually known, say so plainly or omit it — a confident-sounding
   invented detail is worse than a stated gap, because it reads as fact to
   the next reader.

## Worked example

Prompt: "Write a how-to page for the calculator."

Correct shape:
```
# How to Use the Calculator

[One sentence: what it does.]

## [Core task, e.g. "Perform a calculation"]
1. [Step]
2. [Step]
3. [Step]

## [Secondary section only if there's real content for it — edge cases,
   keyboard shortcuts, error states]
```
No preamble, no closing pleasantries, no padding sentences added just to
make a section look complete.

## What NOT to do

- Don't add sections that don't earn their place (a one-paragraph guide
  doesn't need a "Summary").
- Don't hedge with filler when unsure — flag the gap instead.
- Don't switch to a casual/chatty voice partway through; hold the register
  for the whole document.
