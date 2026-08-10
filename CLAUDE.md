# CLAUDE.md — Guidance for Claude Code

This file is read by **Claude Code** (the agent in VS Code) when working on this project.

## What This Project Is

**antigravity-add-model** is a patch for Google Antigravity that lets the user use **any AI model** — including local models via Ollama (DeepSeek, Llama, Gemma, Qwen, Hermes, etc.) — alongside the built-in Gemini models.

It works by:
- Injecting a local proxy into Antigravity that intercepts API calls
- Adding a "Custom Models" dashboard in Antigravity Settings
- Encrypting API keys at rest (AES-256-GCM)
- Re-applying via `repatch.bat` after every Antigravity update (Google overwrites the patch on update)

## Related Project: Secured Research

There is a **related research capability** in `C:\Users\Shadow\Workspace\Secured Research\`. It includes a read-only collector that fetches publicly-available text from GitHub, Hugging Face, and web search, plus a safety scanner that checks for malware/phishing.

**There is an active coding task** to add a research capability to the modded Antigravity system. Read the task spec here:

**→ `C:\Users\Shadow\Workspace\Secured Research\BRIEF.md`** (read this first)

## How to Coordinate

- **Antigravity** handles: research, strategy, understanding, planning
- **Claude Code** handles: deep code reading, refactoring, implementation
- Use `C:\Users\Shadow\Workspace\Secured Research\AGENT_LOG.md` to leave notes for the other agent (append-only, never overwrite)
- When you complete a task, append an entry to `AGENT_LOG.md` with what you did

## Important Notes

- The modded Antigravity must **survive updates** — Google overwrites patches, so `repatch.bat` re-applies them. Any new capability must follow the same re-apply pattern.
- The research collector is **read-only** (fetches text, never downloads/executes files).
- **Decontamination is mandatory** before any collected material is treated as safe.
- If anything seems ambiguous, **ask for clarification** — this is legitimate, safe software engineering.
