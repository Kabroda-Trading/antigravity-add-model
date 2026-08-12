# Installs (or updates) a Windows scheduled task that runs ensure-patched.ps1
# every 2 hours, so custom models come back automatically after an
# Antigravity update instead of waiting for someone to notice and re-run
# repatch.bat by hand. Safe to re-run any time - replaces any existing task
# of the same name so it always points at this exact folder.
# Run this from an elevated PowerShell in the antigravity-add-model folder.

$TaskName = "AntigravityAutoRepair"
$ScriptPath = Join-Path $PSScriptRoot "ensure-patched.ps1"

if (-not (Test-Path $ScriptPath)) {
    Write-Host "ERROR: ensure-patched.ps1 not found next to this script." -ForegroundColor Red
    exit 1
}

$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 2) -RepetitionDuration ([TimeSpan]::MaxValue)
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings `
    -Description "Checks every 2 hours whether the antigravity-add-model patch survived an Antigravity update, and silently re-applies it if not." | Out-Null

Write-Host "Scheduled task '$TaskName' installed, running every 2 hours from:" -ForegroundColor Green
Write-Host "  $ScriptPath" -ForegroundColor Gray
