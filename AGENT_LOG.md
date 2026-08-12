# AGENT_LOG.md — Cross-Agent Handoff

This file is the shared dialogue between **Antigravity/DeepSeek** and **Claude Code** on this project. It is **append-only** — never regenerated or overwritten.

**How to use:**
- Read this file before starting work.
- Append an entry when you learn something the other agent should know, or need to ask it something.
- Never edit or delete past entries.

---

## 2026-08-12 — FROM: Claude Code — FOR: Antigravity/DeepSeek
STATUS: open

**Context for whoever picks this up next:** this project used to point at a "Secured Research" integration task (see old `BRIEF.md` at `C:\Users\Shadow\Workspace\Secured Research\`). That direction was **set aside**, not completed — during review, the actual Secured Research tooling turned out to include Tor/dark-web crawling that the handoff docs had described only as "reads public GitHub/Hugging Face text." Claude Code flagged the mismatch to the user directly rather than building the integration as briefed. The user did not ask to resume it. Don't treat that BRIEF as active without checking with the user first.

**What actually got built this session instead** (all committed and pushed to `github.com/Kabroda-Trading/antigravity-add-model`, deployed live on all 3 of the user's machines — Shadow, Broc's (`griffin`), Dawson's (`desktop-7694gpp`)):

1. Fixed a real bug where `deploy.ps1` reused a stale `app.asar` backup after Antigravity auto-updates, causing a version mismatch (black-screened one user). Added a version-guard that refreshes the backup whenever Antigravity's own version changes. Same fix ported to `portable-deploy.ps1`.
2. Fixed `detectModelCapabilities`'s image-support detection (`src/proxy/modelUtils.ts`) — it was defaulting most cloud models (including DeepSeek) to "can't read images" based on an incomplete name-keyword regex.
3. Added `ensure-patched.ps1` + `install-auto-repair-task.ps1` — a scheduled task (every 2h) that silently re-patches only when the patch has actually been wiped, without interrupting an active session otherwise. Running on all 3 machines.
4. **Local fast-tier routing** (`src/proxy/routing.ts`, new `localFastTier` field on custom model configs): opt-in per model. If a model's config sets `localFastTier` to another model's `name`, turns that are purely a tool-call result being handed back (no fresh reasoning) get silently served by that other (typically local) model instead — verified end-to-end against a live DeepSeekLive conversation. Currently enabled on DeepSeekLive and the Qwen Coder variants across all 3 machines, pointed at a local Phi-4 Mini.
5. GitHub repo consolidated: `Kabroda-Trading/antigravity-add-model` (public, forked-in-spirit from `vahapogut/antigravity-add-model` upstream) is now the single source of truth. Stale duplicate local folders/zips were deleted.

**The user's explicit standing principle for this project going forward** (stated directly, worth respecting): any new capability must be built **directly into this proxy/mod** — not as a separate standalone script or side Python project. If something isn't wired into the actual dropdown/proxy flow, it doesn't count as done.

**Deferred, explicitly not built, no timeline:**
- **Full multi-agent orchestration** (CrewAI-style agent teams/roles) — the `localFastTier` routing above is a deliberately minimal foundation for this, not the thing itself. Note: earlier research conflated **CrewAI** (orchestration framework) with **Crawl4AI** (an unrelated web-scraping tool) — only CrewAI-style orchestration is actually relevant here.
- **Devstral** — an open-weight coding-agent model, mentioned once as a candidate for the local tier, never pulled or configured anywhere. Same category as Phi-4-mini before it got actually built in.

If you pick up either of the deferred items, follow the same pattern as the routing layer: tied into `src/proxy.ts`/`custom_models.json`, tested, deployed and verified against a live Antigravity conversation — not a side script.
