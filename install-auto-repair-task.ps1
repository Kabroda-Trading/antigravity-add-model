# Installs (or updates) a Windows scheduled task that runs ensure-patched.ps1
# every 15 minutes AND immediately at every logon, so custom models come
# back automatically after an Antigravity update instead of waiting for
# someone to notice and re-run repatch.bat by hand. The logon trigger
# covers the common case (update installs, machine reboots/you log back
# in); the 15-minute interval covers in-place updates that don't require
# a reboot. The check itself is nearly free (a string search in one file),
# so a tight interval costs effectively nothing. Safe to re-run any time -
# replaces any existing task of the same name so it always points at this
# exact folder.
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

$IntervalTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15)
# RepetitionDuration has no clean "forever" value in this cmdlet - an empty
# duration string in the underlying XML means "repeat indefinitely".
$IntervalTrigger.Repetition.Duration = ""

$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger @($LogonTrigger, $IntervalTrigger) -Settings $Settings `
    -Description "Checks every 15 minutes and at every logon whether the antigravity-add-model patch survived an Antigravity update, and silently re-applies it if not." | Out-Null

Write-Host "Scheduled task '$TaskName' installed - runs at logon and every 15 minutes, from:" -ForegroundColor Green
Write-Host "  $ScriptPath" -ForegroundColor Gray
