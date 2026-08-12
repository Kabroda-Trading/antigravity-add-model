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
