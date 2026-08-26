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

## 2026-08-12 — FROM: Claude Code — FOR: Antigravity/DeepSeek (especially the work-computer session)
STATUS: resolved

**The `add-smart-router-and-claude-code-bridge` branch pushed from the work computer has been handled — don't redo this work.**

What happened: that branch bundled two unrelated add-ons together. The **Smart Router** (`src/proxy/smartRouter.ts`, virtual `"provider": "router"` model that classifies a message and re-dispatches to an already-configured model) was good, clean work — cherry-picked onto `main` as-is (commit `a8e63f6`), documented in `ADDONS.md`.

The **Claude Code Bridge** (`src/claudeCodeBridge.ts`) was not brought over, and the source branch has been **deleted from GitHub entirely**, not just left unmerged. It shelled out to the Claude Code CLI using its subscription OAuth login to answer Antigravity's requests, to avoid a separate paid Anthropic API key. Confirmed via web search: Anthropic's Consumer Terms explicitly restrict Claude Free/Pro/Max OAuth tokens to Claude Code and Claude.ai themselves — using them from any other product or service isn't permitted, and Anthropic already enforced this against comparable tools (OpenClaw, OpenCode) in early-to-mid 2026. This isn't about implementation quality — a version built natively into Antigravity instead of shelling out to the VS Code extension binary would have the identical problem, since the restriction is about which product consumes the token, not how the code is structured. The user agreed after seeing the sourced policy.

**If you're the work-computer session:** the user is manually removing `claudeCodeBridge.ts`/`dist/claudeCodeBridge.*`, the `languageServer.ts` wiring that starts it, and any `custom_models.json` entry pointing at `http://127.0.0.1:8137` on that machine. Don't recreate it. If Claude access in Antigravity comes up again, the answer is a real Anthropic API key (already working elsewhere in this config) — that's not a fallback, it's the actual sanctioned path for third-party integration.

## 2026-08-14 — FROM: Claude Code — FOR: Antigravity/DeepSeek
STATUS: resolved (config-level fix; code-level fix still open)

**Real incident: `localFastTier` + `allowOrchestrationTools` on the same model actively fight each other under load.** User enabled orchestration tools on DeepSeekLive, successfully spawned 6 parallel sub-agents for a research task - the feature worked - but DeepSeekLive also had `localFastTier: models/phi4-mini` set from earlier in the session. Each of those 6 agents' tool-continuation turns independently routed to the same single local Phi-4 Mini Ollama instance. Confirmed via main.log: repeated `(retry 1)/(retry 2)/(retry 3)` on `models/phi4-mini` under concurrent load, eventually `Upstream connection error: aborted` killing the whole run. Read by the user as general slowness/instability; actual cause was local-server contention from `localFastTier` never having been designed for multiple parallel callers.

**Fix applied:** removed `localFastTier` from DeepSeekLive/DeepSeek V4 Pro on Shadow (Dawson's machine still needs the same removal - unreachable when this was written, check `custom_models.json` there for `localFastTier` on any model that also has `allowOrchestrationTools: true`). Documented as a `[!WARNING]` in README's Local Fast-Tier Routing section.

**Still open, not built:** `resolveEffectiveModel` in `src/proxy/routing.ts` has no concept of how many requests are already in flight to its target model - it always redirects a matching turn regardless of current load. A real fix would track in-flight request count per target model and skip the redirect (fall back to the originally selected model) once some concurrency threshold is hit, rather than requiring these two features to be mutually exclusive by convention. Whoever picks this up: this is exactly the kind of thing that should be built into `routing.ts` properly (tested, following the existing pattern), not worked around with more manual config toggling per machine.

## 2026-08-14 — FROM: Claude Code — FOR: Antigravity/DeepSeek
STATUS: resolved

**Removed the scheduled task (`AntigravityAutoRepair`) as the default auto-repair mechanism, in favor of the launch wrapper.** Real complaint from the user: Task Scheduler launching `powershell.exe -WindowStyle Hidden` every 15 minutes caused a visible console window flash each time, occasionally stealing focus mid-click. `-WindowStyle Hidden` doesn't reliably suppress the initial console-host flash when launched via Task Scheduler - a known Windows quirk, not a bug in `ensure-patched.ps1` itself.

Given the launch-wrapper (`launch-antigravity.bat` / `install-launch-wrapper.ps1`, added earlier this session) already covers "check when Antigravity actually opens" - which is how the user (and presumably most people) actually launch it - the scheduled task's marginal safety-net value no longer justified a recurring visible disruption. Unregistered on Shadow. **Still needs unregistering on Broc's and Dawson's machines** once reachable (`Unregister-ScheduledTask -TaskName "AntigravityAutoRepair" -Confirm:$false`).

The scheduled-task scripts (`ensure-patched.ps1`, `install-auto-repair-task.ps1`) stay in the repo - not deleted, just not installed by default. They're still the right answer for anyone who launches Antigravity through a path that bypasses the Start Menu shortcut.

## 2026-08-26 — FROM: Claude Code — FOR: Antigravity/DeepSeek (and whoever else works on this project)
STATUS: resolved

**Added a "Global Governance" add-on** (`global-rules-template/GEMINI.md`, documented in `ADDONS.md`) after discovering the user's actual `~/.gemini/GEMINI.md` (Antigravity's global rules file, applies to every project on the machine) had already been silently wiped once by an Antigravity update, with nothing checking or restoring it - same failure class as the model patch getting wiped, just a different file nobody had protected yet.

**The user's framing on this is worth carrying forward as project philosophy, not just this one fix:** scope drift and "half-vague" project execution in Antigravity isn't a platform failing to blame Google for - it's a structure gap that whoever's building tooling around the platform (us) is responsible for closing. The instinct going forward should be: when a real, recurring frustration shows up, treat it the same way we've treated every bug this session - find the actual mechanism, verify against real sources (not invented specifics - see the `.antigravityrules`/`.antigravity/rules.yaml` fabrication caught and rejected earlier this same conversation), build the fix into the mod properly, and where it's genuinely generalizable, ship it as a real add-on rather than leaving it as a one-off personal patch.

**What's live now:**
- `ensure-patched.ps1` checks `~/.gemini/GEMINI.md` against a local `.known-good` snapshot on every Antigravity launch and restores it if wiped (mechanism is generic, already shipped, needed no changes for this).
- `global-rules-template/GEMINI.md` is a generalized, redacted version of the real content proven out this session (anti-scope-drift rule grounded in a real community pattern, never-fabricate-a-prior-request rule, cross-agent handoff convention) - anyone can adopt it as their own starting `~/.gemini/GEMINI.md`.

**Not done, and shouldn't be done automatically:** don't push this onto Broc's or Dawson's machines proactively. This is opt-in, personal-content territory - each person decides if and when they want it, and builds their own snapshot from their own file.

## 2026-08-26 — FROM: Claude Code — FOR: Antigravity/DeepSeek
STATUS: open

**What got built this session:** extended the Global Governance pattern from `GEMINI.md` (always-on rules) down to Antigravity's real Skills mechanism (`~/.gemini/config/skills/`, confirmed directly from the app's own bundled `agy-customizations` docs, not guessed). Two skills shipped, both live on Shadow's machine and committed to `global-rules-template/skills/`:

1. **`writing-documentation`** — real style-guide standards (Google Developer Documentation Style Guide, Microsoft Writing Style Guide), not generic "sound professional" advice.
2. **`project-scaffolding`** — runs a whiteboard/framing conversation before scaffolding a new project (`AGENT_LOG.md`, `AGENTS.md`/`CLAUDE.md`, `.agents/` folders as needed). **Caught a real bug via live testing**, not theoretical: on the first live run, the model answered the framing questions and then skipped straight to writing product code, never creating the scaffolding files at all. Fixed by making the scaffolding step a hard gate ("don't create any product file until steps 1-3 exist on disk") instead of a soft numbered list. If you're picking this up and the same skip-ahead behavior resurfaces, that's the section to look at (`## Phase 2` in the skill's `SKILL.md`).

**Also found and fixed (unrelated to the above, discovered while investigating):** the user had 11 real skills for an actual business project (Back40 Provisions / "Sourdough Biz," `C:\Users\Shadow\OneDrive\Desktop\Sourdough Biz\back40provisions`) sitting in the *global* `~/.gemini/config/skills/` folder instead of that project's own `.agents/skills/` — meaning they were cluttering every other project's skill picker, not just that one. Moved to the correct location. Separately (and still unresolved, business-project territory, not this repo's concern): five of those skills (`local-writer`, `local-researcher`, `local-auditor`, `local-coder`, `local-marketer`) instruct the agent to call `http://127.0.0.1:11435/run`, a "local agent bridge" endpoint that doesn't exist anywhere in this proxy or any other known project on this machine — broken/aspirational content, not wired to anything real.

**Community research done (real GitHub API verification, not blog-post star counts — those were inconsistent by orders of magnitude across sources and not trusted):** `sickn33/antigravity-awesome-skills` is real (45k+ genuine stars, verified via `gh api`) but is a heavyweight MCP-server/CLI catalog tool, not a curated best-practices set — its own docs disclaim certifying any skill's quality. `rmyndharis/antigravity-skills` (1,390 real stars) is a lighter, more directly comparable collection. Verdict: nothing found was worth adopting wholesale - our own skills are more disciplined (sourced from real style guides vs. buzzword capability lists). One real improvement adopted from the comparison: explicit "Use this skill when / Do not use this skill when" sections, now in both skills, to reduce false-trigger risk.

**Not done:** a `financial-analysis` skill (P&L/KPI analysis) - flagged by the user as a real recurring pain point, not yet built. Good next candidate if picked up.
