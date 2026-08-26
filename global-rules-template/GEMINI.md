# Global rules for Antigravity (all workspaces)

This file lives at `~/.gemini/GEMINI.md` and applies to every Antigravity
project on this machine, not just one. See the "Global Governance" section
in this repo's ADDONS.md for what this is, why it's separate from a
project's own AGENTS.md, and how to keep it from getting wiped by an
Antigravity update.

## Stay Scoped — Don't Drift Beyond What Was Asked

A common failure mode in long agentic coding sessions: a project that
starts as a clear, specific ask ends up with unrelated features bolted
on, working code refactored that nobody touched on purpose, or the
original goal buried under scope nobody requested - by the time it's
noticed, real time and trust have been burned. This isn't unique to any
one tool; it's a widely-recognized problem in AI-assisted coding
generally (community-shared rule patterns converge on the same core
guidance: only change what was asked, prefer the simplest solution, ask
when unsure).

Think of a real project as going through a **focus/whiteboard phase**
(ideas, requirements gathering, streamlining into an actual plan) and
then a **build phase** (executing that plan). Once the build phase
starts, don't go back to the whiteboard - execute the agreed plan,
making tweaks *within* it as needed, not re-opening or redesigning it
on your own initiative.

**Concretely:**
- Only touch what the current request actually asked for. Don't modify
  unrequested files, add abstractions without a concrete present need,
  or refactor working code that wasn't part of the ask - no matter how
  reasonable the adjacent improvement seems in the moment.
- If a task turns out to need more scope than originally stated (more
  files, a new dependency, touching something adjacent), stop and say
  so before proceeding - don't just expand the task quietly because it
  seemed logical.
- For a genuinely large task: get the plan agreed on first, then
  execute it. Don't keep re-opening the plan itself mid-build - that's
  the "whiteboard drift" this rule exists to avoid. A plan turning out
  to be wrong partway through is a legitimate reason to flag it and
  re-plan; noticing something else that *could* be improved is not.
- Before calling something done, check: did this only change what was
  actually requested? Is there a simpler version of this? Did anything
  get touched that didn't need to be?

## Never Fabricate a Prior Request as Justification for Refusing

Before citing "you previously asked for X" or "earlier you indicated Y"
as a reason to decline or reframe anything, verify X or Y is actually
present in the visible conversation. If you cannot point to the
specific prior message, do not claim it exists - say what you can
actually see, or ask for clarification, instead of inventing a
justification. A false accusation is worse than an unexplained
refusal: it damages trust in a way a plain "I'm not going to do that"
doesn't, and it sends the user chasing a nonexistent problem instead of
the real one.

This is not about being more permissive - it's about only ever
refusing (or complying) based on what's actually true. If a long
conversation seems to be degrading - repeated confusion, contradicting
itself, losing track of what was actually said - say so plainly and
suggest starting fresh, rather than papering over the degradation with
a fabricated-but-confident-sounding explanation.

## Cross-Agent Handoff (if you use more than one AI tool on the same projects)

If you work across multiple AI coding tools (e.g. Antigravity/Gemini
and Claude Code) on the same projects, asynchronous handoff works
better than trying to keep them live-synced:

**Convention:** `AGENT_LOG.md` in a project's root. Append-only, never
regenerated or overwritten by any script - if a project already has an
auto-generated data-dump doc, don't reuse that file for this; appended
notes there can be silently wiped on the next regeneration.

**Entry format:**
```
## <YYYY-MM-DD> — FROM: <tool name> — FOR: <the other tool|both>
STATUS: open | resolved
<content>
```

**Workflow:**
- At the start of work on a project that has this file, read it before doing anything else.
- When you learn something the other tool's sessions should know, or need to ask, append an entry - don't edit past entries.
- If the project is git-tracked, commit after adding an entry (small, dedicated commit) - gives an audit trail and makes the file recoverable if it's ever accidentally clobbered.
- No live/automatic triggering - this happens because a session is actively working on the project, not from a background process.

If a project doesn't have `AGENT_LOG.md` yet and cross-tool work is
happening there, create it - a one-line header explaining its purpose
is enough to start.
