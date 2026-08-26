# Lightweight auto-repair check, meant to run on a schedule (see install-auto-repair-task.ps1).
# Only touches Antigravity (stops/restarts it) when the patch has actually
# been wiped by an update - does nothing, silently, the rest of the time.

$LsBinary = "$env:LOCALAPPDATA\Programs\antigravity\resources\bin\language_server.exe"
$PatchedMarker = "http://localhost:50999/v1internal/xxxxxxx"

$needsPatch = $true
if (Test-Path $LsBinary) {
    $content = [System.IO.File]::ReadAllText($LsBinary, [System.Text.Encoding]::ASCII)
    if ($content.Contains($PatchedMarker)) {
        $needsPatch = $false
    }
}

$log = Join-Path $PSScriptRoot "ensure-patched.log"

if ($needsPatch) {
    # Admin install ships deploy.ps1; the portable/non-admin package only
    # ever has portable-deploy.ps1 (build-portable.ps1 doesn't copy the
    # admin one over) - use whichever is actually present so this one
    # script works unmodified in both packages.
    $adminDeploy = Join-Path $PSScriptRoot "deploy.ps1"
    $portableDeploy = Join-Path $PSScriptRoot "portable-deploy.ps1"
    $deployScript = if (Test-Path $adminDeploy) { $adminDeploy } else { $portableDeploy }
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Patch missing, running $(Split-Path $deployScript -Leaf)..." | Out-File $log -Append
    & powershell -ExecutionPolicy Bypass -File $deployScript *>> $log
} else {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Already patched, nothing to do." | Out-File $log -Append
}

# ─── Protect ~/.gemini/GEMINI.md from the same "wiped by an update" failure ───
# Confirmed happening in practice (not hypothetical): a user's global
# Antigravity rules file went from real content to empty between two
# Antigravity updates, with nothing checking or restoring it. This mirrors
# it against a local known-good snapshot the same way app.asar gets a
# local backup - the snapshot itself is never committed to the shared repo
# (it's personal instruction content, machine-specific, not something to
# push onto anyone else's machine). Create the snapshot yourself once with:
#   Copy-Item "$env:USERPROFILE\.gemini\GEMINI.md" "$env:USERPROFILE\.gemini\GEMINI.md.known-good"
# Nothing happens here until that snapshot exists.
$GeminiRules = "$env:USERPROFILE\.gemini\GEMINI.md"
$GeminiRulesBackup = "$env:USERPROFILE\.gemini\GEMINI.md.known-good"
$geminiHealthy = (Test-Path $GeminiRules) -and (Get-Item $GeminiRules).Length -ge 100

if (-not $geminiHealthy -and (Test-Path $GeminiRulesBackup)) {
    Copy-Item $GeminiRulesBackup $GeminiRules -Force
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - GEMINI.md was missing/emptied (likely wiped by an Antigravity update) - restored from local backup." | Out-File $log -Append
} elseif ($geminiHealthy) {
    # Keep the backup mirroring the latest confirmed-good content, so a
    # future restore doesn't roll back legitimate edits made since the
    # snapshot was first taken.
    Copy-Item $GeminiRules $GeminiRulesBackup -Force
}
