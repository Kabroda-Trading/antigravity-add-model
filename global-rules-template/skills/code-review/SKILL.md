---
name: code-review
description: >-
  Use when reviewing code that already exists — your own before calling a
  task done, or someone else's change — for correctness, design, and
  maintainability. Not for planning code that doesn't exist yet, and not a
  substitute for actually writing the implementation.
---

# Code Review Skill

Sourced from Google's Engineering Practices Code Review Developer Guide
(google.github.io/eng-practices/review) — a real, publicly published
standard, not invented review criteria.

## Use this skill when
- Reviewing a diff or change before it's considered done
- The user asks "does this look right" or "review this" about existing code
- Checking your own just-written code before reporting a task complete

## Do not use this skill when
- The code doesn't exist yet (see `system-architecture` for planning, or
  just write the implementation)
- The request is purely style/formatting (a linter question, not a review)

## What to actually check, in priority order

1. **Design.** Does this change make sense in the context of the overall
   system? Is this the right approach, not just a working one?
2. **Functionality.** Does the code do what the author intended, and is
   that good for whoever uses it? Check edge cases explicitly — don't just
   trace the happy path.
3. **Complexity.** Could this be simpler? Would someone else understand
   this quickly when they hit it later? Overly clever code is a defect,
   not a flex.
4. **Tests.** Are there correct, well-designed automated tests for this
   change? Do they actually assert meaningful behavior, or just execute
   the code?
5. **Naming.** Are names clear enough that a reader doesn't need to open
   the implementation to guess what something does?
6. **Consistency & style.** Does this match the codebase's existing
   conventions — not just "is it valid syntax"?

**Core principle from the source:** prioritize technical facts and data
over personal preference. The point of a review is to make the code's
health better over time, not to enforce taste.

## What NOT to do
- Don't rubber-stamp by only checking that it compiles or runs — "it
  works" and "it's good" are different questions; this skill is about the
  second one.
- Don't review only the happy path — naming one specific untested edge
  case is more useful than a general "looks good."
- Don't let style nitpicks substitute for an actual design/correctness
  review — a review that's all naming comments and no functionality or
  design feedback has skipped the parts that actually matter.
