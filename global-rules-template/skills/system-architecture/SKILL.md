---
name: system-architecture
description: >-
  Use when a project's requirements are agreed but its data model, API
  design, or overall structure still needs planning before implementation
  starts. Not for the initial requirements conversation itself, and not for
  reviewing code that's already written.
---

# System Architecture Skill

Sourced from the C4 model (Simon Brown, c4model.com) — a real, widely-
adopted framework for describing software architecture at different zoom
levels, not invented structure.

## Use this skill when
- Requirements are agreed but no code exists yet, and the shape of the
  system still needs deciding
- The user asks to plan a data model, API design, or overall structure
- A project is growing complex enough that "just start coding" risks
  costly rework later

## Do not use this skill when
- The code already exists and needs reviewing (see `code-review`)
- Requirements themselves aren't settled yet (see `project-scaffolding`)
- The project is small enough that the structure is obvious — a single
  script or a one-page tool doesn't need this treatment

## Method (scaled to the project's actual size)

Most real projects only need the first two levels below — don't force all
four just because the framework has four.

1. **Context.** What is the system, and what does it talk to (users, other
   systems, third-party APIs)? Settle the boundary of what's being built
   before anything else.
2. **Container.** What are the major running pieces (web app, backend API,
   database, background jobs) and how do they communicate (protocol,
   sync/async)? This is the level most small-to-medium projects actually
   need to nail down — for many projects, stopping here is correct.
3. **Component** (only for a genuinely complex container). What are the
   internal pieces inside one container, and what's each responsible for?
   Skip this for anything simple.
4. **Code.** Not an upfront planning step — this emerges during
   implementation. Don't design class/function structure before any code
   exists.

## Key discipline: name the decisions, not just the boxes

For each real structural choice (why this database, why this API pattern,
why sync vs. async), write down the reason. That's what answers "why did
we do it this way" later — a diagram without the reasoning behind each
choice doesn't hold up over time.

## What NOT to do
- Don't produce a component- or code-level plan for something that only
  needed context+container — over-architecting a simple project is a real
  failure mode, not a safe default.
- Don't skip straight to "here's the class structure" without settling the
  container level first — the exact failure mode this skill exists to
  prevent.
- Don't treat this as a one-time step for a project whose requirements are
  still shifting — that's a signal to go back to `project-scaffolding`'s
  whiteboard phase, not push forward prematurely.
