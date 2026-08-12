# Antigravity Custom Model Enabler — Setup Guide

## Quick Fix (read this first)

**Symptom:** You open Antigravity and your custom models are gone from the dropdown — only Gemini/Claude/GPT-OSS show up.

**Cause:** Antigravity auto-updated itself and wiped the patch. This is expected — it happens on every update.

**Fix:**
1. Go to **[github.com/Kabroda-Trading/antigravity-add-model](https://github.com/Kabroda-Trading/antigravity-add-model)**
2. Click the green **Code** button → **Download ZIP**
3. Extract it, right-click **`repatch.bat`** → **Run as administrator**
4. Wait for "SUCCESS!" — your custom models are back

If Antigravity shows a **black or blank screen** instead (rare, but can happen), run **`RESTORE_IF_BLACK_SCREEN.bat`** first, then `repatch.bat`. Either way, your saved models and API keys are never lost — they're stored separately from the app itself.

---

This package patches **Google Antigravity** to let you use **any AI model** — including local models running on your own machine via Ollama (DeepSeek, Llama, etc.) — alongside the built-in Gemini models.

## What This Does

- Injects a local proxy into Antigravity that intercepts API calls
- Lets you add models from OpenAI, Anthropic, Ollama (local), or any OpenAI-compatible provider
- Adds a "Custom Models" dashboard in Antigravity Settings
- All your API keys are encrypted at rest

---

## Prerequisites

Before running the installer, you need these installed:

### 1. Antigravity (Required)
Download and install from Google's official source. Make sure it runs at least once before proceeding.

### 2. Node.js (Required)
Download from: https://nodejs.org/ (LTS version, default install settings)
- This is needed to build the patch files
- After installing, restart your computer or log out/in

### 3. Ollama (Optional — for local models like DeepSeek)
Download from: https://ollama.com/download
- After installing, open a terminal and pull a model:
  ```powershell
  ollama pull deepseek-r1
  ```
  or for a smaller/faster model:
  ```powershell
  ollama pull llama3.2
  ```
- Ollama runs in the background automatically after install

---

## Installation

### One-Click Install

1. **Right-click** `repatch.bat` and select **"Run as administrator"**
2. The script will:
   - ✅ Check that Node.js is installed
   - ✅ Install dependencies automatically
   - ✅ Build the TypeScript source code
   - ✅ Stop Antigravity if running
   - ✅ Deploy the patch to Antigravity
   - ✅ Restart Antigravity
3. That's it! You're done.

### What to Do After Installing

1. Open Antigravity
2. Go to **Settings → Models**
3. You should see a **"Custom Models"** section
4. Click **"Add Model"** to configure your models:
   - **DeepSeek R1 (Local)**: Select provider "Ollama" — it's pre-configured
   - **GPT-4o**: Select provider "OpenAI" — enter your API key
   - **Claude**: Select provider "Anthropic" — enter your API key
5. Select your custom model from the chat dropdown and start using it!

---

## After Antigravity Updates

Whenever Antigravity auto-updates, the patch gets overwritten. Simply:

1. Open the `antigravity-add-model` folder
2. Right-click **`repatch.bat`** → **Run as administrator**

That's it. The patch is re-applied in about 30 seconds.

---

## Troubleshooting

### "Node.js is not installed"
Download and install Node.js from https://nodejs.org/, then run `repatch.bat` again.

### "Build failed"
Make sure you have a working internet connection. The script downloads dependencies automatically.

### Custom models don't appear in chat
1. Run `repatch.bat` again (Antigravity may have updated)
2. Check that Ollama is running (look for the Ollama icon in your system tray)
3. Make sure you've pulled a model: `ollama pull deepseek-r1`

### Antigravity shows a black or blank screen after running repatch.bat
Right-click **`RESTORE_IF_BLACK_SCREEN.bat`** → **Run as administrator**. It reverts to
the last known-good version automatically, no download needed. Once Antigravity opens
normally again, run `repatch.bat` to turn custom models back on. If it still won't
open after that, the script will tell you to uninstall and reinstall Antigravity fresh —
your custom models and API keys are stored separately and won't be lost either way.

### "Access denied" errors
Right-click `repatch.bat` and select **"Run as administrator"**.

### Port 50999 already in use
The proxy auto-falls back to a random port. This is handled automatically.

---

## Files in This Package

| File | What it does |
|------|-------------|
| `repatch.bat` | **One-click installer** — double-click this |
| `RESTORE_IF_BLACK_SCREEN.bat` | Emergency recovery if Antigravity won't open after patching |
| `deploy.ps1` | Deploys the patch to Antigravity (called by repatch.bat) |
| `custom_models.json` | Template with pre-configured local models |
| `src/` | TypeScript source code for the patch |
| `dist/` | Pre-compiled JavaScript (what gets deployed) |

---

## Security Notes

- API keys are encrypted at rest using AES-256-GCM
- No data is sent to external servers except the AI providers you configure
- The local proxy only runs on your machine (127.0.0.1)
- Your API keys are never logged or transmitted anywhere
