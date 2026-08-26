---
name: project-scaffolding
description: >-
  Use when the user is starting a brand-new project and says things like
  "let's start a new project," "help me set this up," "frame this out," or
  similar - i.e. the current project folder is new or effectively empty and
  hasn't been structured yet. Not for routine work inside an already-set-up
  project.
---

# Project Scaffolding Skill

Runs a short whiteboard/framing conversation, then scaffolds the project
skeleton into the **currently open project folder** (never anywhere else -
this skill always operates on the active workspace root, not a path the
user has to specify).

## Phase 1 — Whiteboard (ask, don't assume)

Ask the user, briefly, in plain language - not a formal questionnaire:

1. What is this project, in one or two sentences?
2. Who is it for (just you, a client, other people)?
3. What does "done" look like for the *first* real milestone - not the
   whole eventual vision, just the first concrete deliverable?
4. Any hard constraints already known (deadline, required tech/stack,
   something it must integrate with)?

Do not proceed to Phase 2 until the user has actually confirmed the framing
back - a first-pass answer isn't the same as agreement. If the user is
vague or wants to think out loud, stay in this phase; don't rush to scaffold
just to have something to show.

## Phase 2 — Scaffold (only after framing is agreed)

**Hard rule: once the user answers the Phase 1 questions, your very next
action is this scaffolding — before creating any product file (no
`pyproject.toml`, no source files, no README, nothing). If you notice
you're about to create a project file and steps 1-3 below haven't happened
yet in this conversation, stop and do them first.** Answering the framing
questions is not a request to skip straight to the product - it's the
signal to do this step.

1. Run the bundled script to set up cross-agent handoff (`AGENT_LOG.md`,
   plus pointers in `CLAUDE.md`/`AGENTS.md`):
   [new-agent-project.ps1](./scripts/new-agent-project.ps1)
   ```powershell
   powershell -ExecutionPolicy Bypass -File "<this-skill-dir>/scripts/new-agent-project.ps1" "<current-project-root>"
   ```
2. Fill in the real content of `AGENTS.md` (and `CLAUDE.md`) with what was
   actually agreed in Phase 1 - the project's purpose, intended audience,
   first-milestone definition, and any constraints. Don't leave them as
   just the generic handoff pointer the script adds.
3. If (and only if) this project needs its own specialized rules, skills,
   or named agents, create them under this project's own
   `.agents/rules/`, `.agents/skills/`, `.agents/agents/` - **never** in
   the global `~/.gemini/config/` location. Global scope is for things
   meant to help *every* project (like this skill); anything specific to
   this one project's domain belongs local to it.
4. Only after 1-3 exist on disk, tell the user the skeleton is in place and
   proceed to build the actual product they described.

Once building starts, hand off to normal build work - don't keep
re-opening the framing conversation (see the global "Stay Scoped" rule in
`GEMINI.md`).

## What NOT to do

- Don't scaffold before the user has confirmed the framing.
- Don't write the product's own files (source code, `pyproject.toml`, package
  manifests, etc.) before `AGENT_LOG.md` and `AGENTS.md`/`CLAUDE.md` exist -
  a concrete, easy-to-fulfill product request is not a reason to skip the
  scaffolding step; do the scaffolding first even when the ask is small.
- Don't write project-specific content into global config.
- Don't keep re-running Phase 1 mid-build because something adjacent seems
  worth reconsidering - that's whiteboard drift, not a real re-plan trigger.
