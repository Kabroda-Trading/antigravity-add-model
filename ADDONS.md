# Optional Add-ons

These work identically regardless of whether you installed via the admin
path (`deploy.ps1`/`deploy.sh`/`deploy_linux.sh`) or the portable/no-admin
path (`portable-deploy.ps1`) — they're proxy-level features layered on top
of your custom models, not part of the install mechanism itself.

Nothing here activates automatically. `custom_models.json` is gitignored
(machine-specific), so pulling this code onto a different machine changes
nothing there until you deliberately add a model entry for it on that
specific machine.

## Smart Router

Auto-routes a message to one of your already-configured custom models based
on what kind of task it looks like, instead of you picking a model by hand
every time.

Add to `custom_models.json`:

```json
{
  "name": "models/smart-router",
  "displayName": "🧭 Smart Router (Auto-select)",
  "description": "Auto-routes to your configured models based on message content.",
  "provider": "router",
  "apiKey": "none",
  "apiUrl": "http://localhost/router",
  "externalModelName": "smart-router",
  "encrypted": false
}
```

Edit `src/proxy/smartRouter.ts`'s `TARGET_MODEL_NAMES` and `DEFAULT_TARGET`
to point at whatever models you've actually configured — the shipped
defaults assume `models/claude-3-5-sonnet` and `models/deepseek-v4-flash`
exist in your config; adjust to match yours.

Manual override: start a message with `/claude`, `/gemini`, `/gpt`, or
`/deepseek` to force a specific target instead of auto-classifying.

## Second Opinion (cross-model critique)

The problem this solves: if you only run one AI tool, nothing catches it
drifting, fabricating, or mis-scoping an answer - the failure mode this
project itself has hit more than once (a skill that mis-scoped itself, a
scaffolding step that got silently skipped) was only caught because a
second system happened to be watching. Most people downloading this mod
won't have a second AI tool cross-checking the same files the way this
project's own Claude Code + Antigravity workflow does - this gives them
an equivalent, built into the proxy itself.

Add `secondOpinionModel` to a model's config, pointing at another already-
configured model's `name`:

```json
{
  "name": "models/claude-3-5-sonnet",
  "provider": "anthropic",
  "secondOpinionModel": "models/deepseek-v4-pro"
}
```

That model gains a proxy-synthesized `get_second_opinion(question, context)`
tool. When it's called, the proxy fires an internal request to the second
model and feeds the critique back as the tool's result - Antigravity never
sees the intermediate call, only the primary model's final answer after
incorporating it.

**Real cost, not a footnote**: a model with this set loses live token
streaming on every turn, not just the ones that trigger the tool, since
the proxy can't know in advance whether a turn will call it. See the
[Second Opinion section in README.md](README.md#second-opinion) for the
full trade-off, the one-round-trip-per-turn limit, and the graceful
fallback if the second model fails.

Like Smart Router and the skills above, this ships in the same codebase
everyone gets, but does nothing unless you set the field - none of this
project's own four machines need it, and none of them are affected by it
existing in the code.

**Test it**: configure it as above, prompt the primary model with
something likely to trigger a self-check (e.g. "review this trading
strategy backtest for overfitting"), and watch for
`[Proxy][SecondOpinion] ... asked ... for a second opinion.` in the log
referenced in the README's Troubleshooting section. Confirm a model
*without* `secondOpinionModel` set behaves identically to before -
regression check.

## Global Governance (GEMINI.md protection + anti-drift rules)

The problem this solves: `~/.gemini/GEMINI.md` is Antigravity's own global
rules file - it applies to *every* project on the machine, not just one
(a project's own `AGENTS.md` only covers that project). Two real problems
with it in practice:

1. **It gets wiped.** Confirmed happening, not hypothetical: a real global
   rules file went from real content to empty between two Antigravity
   updates, with nothing checking or restoring it - the exact same failure
   mode `deploy.ps1` exists to fix for the model patch, just a different
   file that nothing was protecting.
2. **Nobody starts with one.** The actual content that would prevent
   scope drift ("only change what was asked," "don't re-open an agreed
   plan mid-build") isn't something Antigravity ships by default - you
   have to write it yourself, and most people never do until after
   they've been burned by drift a few times.

**Setup (one-time, per machine):**

1. Copy `global-rules-template/GEMINI.md` from this repo to `~/.gemini/GEMINI.md` (or merge it into one you already have - it's just markdown).
2. Snapshot it as the known-good backup:
   ```powershell
   Copy-Item "$env:USERPROFILE\.gemini\GEMINI.md" "$env:USERPROFILE\.gemini\GEMINI.md.known-good"
   ```

That's it. `ensure-patched.ps1` - already running on every Antigravity
launch via the launch-wrapper - checks this file every time and silently
restores it from that snapshot if it's ever missing or emptied. When the
live file is healthy, the snapshot stays in sync with your latest edits,
so a future restore reflects what you actually have now, not the first
version you saved.

The snapshot is intentionally never committed to this repo - it's your
own instruction content, personal to your setup, not something to push
onto anyone else's machine. Each person who wants this protection creates
their own snapshot from their own file.

## Task-Specific Skills (writing, and more over time)

The problem this solves: `GEMINI.md` covers *global behavior* (don't drift,
handle handoffs correctly), but it doesn't give the agent task-specific
expertise - e.g. actually knowing real technical-writing standards when
asked to draft documentation, rather than defaulting to generic chat prose.

Antigravity has a real, built-in mechanism for exactly this: **Skills**
(`skills/<name>/SKILL.md`), which live at a genuinely global scope -
`~/.gemini/config/skills/` - confirmed directly from Antigravity's own
bundled documentation (`agy-customizations` builtin skill, present on every
install). A skill placed there is available in *every* project automatically,
same as `GEMINI.md`, with no per-project setup. The `description` field in
its frontmatter is what the agent matches your request against to decide
whether to load it - keep that field specific about what the skill does and
when to use it.

**Setup (one-time, per machine):**

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.gemini\config\skills\writing-documentation"
Copy-Item "global-rules-template\skills\writing-documentation\SKILL.md" "$env:USERPROFILE\.gemini\config\skills\writing-documentation\SKILL.md"
```

**`writing-documentation`** - the first one shipped here - applies real,
citable technical-writing standards (Google Developer Documentation Style
Guide, Microsoft Writing Style Guide) whenever you ask for a how-to page,
README content, release notes, or similar: active voice/second person, lead
with what matters, no chat-style preamble or sign-off, no padding sections,
no fabricated-sounding filler when something isn't actually known. Test it
by asking for something like "write a how-to page for X" and checking the
output starts directly with a title, not "Sure, here's a guide!"

**`project-scaffolding`** - answers "how do I not have to manually set up
every new project?" Trigger it by opening a new/empty folder as an
Antigravity project and saying something like "let's start a new project"
or "help me set this up." It runs a short framing conversation (what is
this, who's it for, what does the first milestone look like, any known
constraints), and only once you've actually confirmed that framing does it
scaffold the project - `AGENT_LOG.md`, `CLAUDE.md`/`AGENTS.md` filled in
with your real answers (not just boilerplate), and `.agents/rules/`,
`.agents/skills/`, `.agents/agents/` created if the project needs its own
domain-specific customizations. It explicitly never writes project-specific
content into global config - that mistake is what caused the cleanup this
skill exists partly to prevent (see the warning below). It bundles its own
copy of the cross-agent scaffolding script, so it works standalone on a
machine that doesn't have `new-agent-project.ps1` installed separately.

**Two kinds of skill, worth distinguishing when deciding what to add:**
*process skills* apply to almost any project regardless of domain
(`project-scaffolding` covers requirements+planning; `system-architecture`
and `code-review` below cover two more phases of the same generic
build lifecycle). *Domain skills* are specific to what a project is
*about* (`financial-statement-analysis`) - global scope is still correct
for these as long as the domain itself is something you work in across
multiple projects, not tied to one project's own identity (that
distinction is what the warning below is actually about).

**`system-architecture`** - sourced from the C4 model (Simon Brown,
c4model.com): once requirements are agreed but before code exists, settle
the system's boundary (context) and its major running pieces plus how
they communicate (container) - most projects don't need to go deeper than
that. Explicitly warns against over-architecting a simple project just as
much as under-architecting a complex one.

**`code-review`** - sourced from Google's Engineering Practices Code
Review Developer Guide (google.github.io/eng-practices/review): checks
design and functionality before complexity, tests, naming, or style -
prevents a review from being all naming nitpicks with no comment on
whether the approach itself is right.

**`financial-statement-analysis`** (renamed from `financial-analysis` -
same content, name now matches scope) - CFA Institute-sourced P&L/ratio
analysis. Explicitly refuses to compute liquidity/leverage ratios from a
P&L alone (they require the balance sheet) rather than fabricating them -
found to be the likely cause of "analysis goes off in left field" when
only a P&L is provided.

More task-specific skills (e.g. `budgeting-forecasting`,
`marketing-analysis`) can follow the same pattern - one folder per skill
under `global-rules-template/skills/`, each with its own `SKILL.md`, each
copied into `~/.gemini/config/skills/` to activate.

**On not having to pick a skill by hand:** skills don't require manually
opening the slash menu every time. Per Antigravity's own bundled
documentation (`agy-customizations` builtin skill), the agent reads a
skill's `description` field and decides on its own whether to activate it
for whatever you actually typed - the slash menu is a manual override, not
the only way in. The lever for "this should just work without babysitting"
is writing specific, concrete trigger language into `description` (what
kind of request this is for, in the user's own words), not adding more
manual steps. The same applies to `.agents/rules/*.md` files, which support
a `trigger` field with four modes: `always_on`, `model_decision` (same
auto-match behavior as skills), `glob` (fires on matching file paths, e.g.
`*.sql`), and `manual` (only on explicit @-mention) - prefer
`model_decision` or `glob` over `always_on` for anything that doesn't need
to be in context on every single turn.

⚠️ **Global skills are global the moment they exist - check what's actually
in that folder.** A skill dropped into `~/.gemini/config/skills/` shows up
in *every* project's menu immediately, whether that's what was intended or
not. Confirmed in practice: a set of skills built for one specific business
project ended up in the global folder instead of that project's own
`.agents/skills/` - meaning they were showing up (and cluttering the picker)
in every other project too, not just the one they were meant for. Moving
project-specific skills to the project's own `.agents/skills/` fixes that;
only put something in the global folder if you actually want it available
everywhere.

Separately, a few of those skills instructed the agent to call a
`local agent bridge` HTTP endpoint (`127.0.0.1:11435`) that doesn't exist
anywhere in this proxy - unrelated to their location, that's just broken
content that would fail if actually invoked. Worth checking any
model-routing skill's actual instructions before trusting it, regardless of
which folder it's in.
