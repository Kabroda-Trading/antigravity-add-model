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
