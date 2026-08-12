# AGENTS.md — Guidance for Antigravity/DeepSeek

This file is read by **Antigravity** (DeepSeek) when working on this project. Claude Code reads the equivalent `CLAUDE.md` — same content, kept in sync, since each agent only auto-loads its own file.

## What This Project Is

**antigravity-add-model** is a patch for Google Antigravity that lets the user use **any AI model** — including local models via Ollama (DeepSeek, Llama, Gemma, Qwen, Hermes, etc.) — alongside the built-in Gemini models.

It works by:
- Injecting a local proxy into Antigravity that intercepts API calls
- Adding a "Custom Models" dashboard in Antigravity Settings
- Encrypting API keys at rest (AES-256-GCM)
- Re-applying via `repatch.bat` after every Antigravity update (Google overwrites the patch on update)
- Optionally routing "cheap" agent-loop turns (pure tool-call results) to a local fast-tier model via the `localFastTier` config field (`src/proxy/routing.ts`)

Deployed identically across three of the user's machines. GitHub (`github.com/Kabroda-Trading/antigravity-add-model`, public) is the single source of truth — don't hand-maintain local copies elsewhere.

## Standing Principle (read this before proposing new capabilities)

**Any new capability must be built directly into this proxy/mod** — wired into `src/proxy.ts`'s request flow and `custom_models.json`, not a separate standalone script or side Python project. If it isn't reachable from the actual Antigravity dropdown/chat flow, it doesn't count as done. This was stated explicitly by the user after watching the local fast-tier routing feature get built this way — treat it as the template for how anything else gets added.

## Current Status & Roadmap

See `AGENT_LOG.md` for the full session-by-session history — **read it before starting work**, it's append-only and is the real source of truth for what's actually built vs. still just an idea.

Short version as of 2026-08-12:
- Core proxy, multi-provider support, local fast-tier routing: **built, tested, deployed on all 3 machines.**
- Full multi-agent orchestration (CrewAI-style): **deferred, not started.** The routing layer is a deliberate first step toward this, not the thing itself.
- Devstral as an additional local coding-tier model: **mentioned once, never pulled or configured.** Not real yet.
- The old Secured Research integration task (dark-web/Tor research tooling) referenced by an earlier `BRIEF.md`: **set aside**, not active. See `AGENT_LOG.md` for why — don't resume it without checking with the user first.

## How to Coordinate

- Use `AGENT_LOG.md` in this project's root to leave notes for the other agent (append-only, never overwrite)
- When you complete a task, append an entry to `AGENT_LOG.md` with what you did

## Important Notes

- The modded Antigravity must **survive updates** — Google overwrites patches. `deploy.ps1`/`portable-deploy.ps1` re-apply them and now self-refresh their backup when Antigravity's version changes. `ensure-patched.ps1` + the scheduled task from `install-auto-repair-task.ps1` do this automatically on a 2-hour check, without interrupting an active session.
- If anything seems ambiguous, **ask for clarification**.
