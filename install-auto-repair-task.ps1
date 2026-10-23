# Installs (or updates) a Windows scheduled task that runs ensure-patched.ps1
# at every logon, so custom models come back automatically after a logon
# instead of waiting for someone to notice and re-run repatch.bat by hand.
# Deliberately logon-only, not also on an interval - explicit user call
# (2026-10-07): an in-session Antigravity update relaunches Antigravity.exe
# directly, which this trigger does NOT catch (it only fires on a real
# Windows logon) - known and accepted, since launch-antigravity.bat already
# re-checks every time Antigravity is opened via the Start Menu/Desktop
# shortcut, and the user preferred no periodic background task over closing
# that specific remaining gap.
# Safe to re-run any time - replaces any existing task of the same name so
# it always points at this exact folder.
# Run this from an elevated PowerShell in the antigravity-add-model folder.

$TaskName = "AntigravityAutoRepair"
$ScriptPath = Join-Path $PSScriptRoot "ensure-patched.ps1"

if (-not (Test-Path $ScriptPath)) {
    Write-Host "ERROR: ensure-patched.ps1 not found next to this script." -ForegroundColor Red
    exit 1
}

$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""

# Scoped to the current user specifically (rather than "any user logs on")
# so this can be registered by a standard, non-elevated process - matters
# since this also needs to work unattended over SSH with no one available
# to click a UAC prompt.
$LogonTrigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"

$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $LogonTrigger -Settings $Settings `
    -Description "Checks at logon whether the antigravity-add-model patch survived an Antigravity update, and silently re-applies it if not." | Out-Null

Write-Host "Scheduled task '$TaskName' installed - runs at logon only, from:" -ForegroundColor Green
Write-Host "  $ScriptPath" -ForegroundColor Gray
