# Repoints the Antigravity Start Menu shortcut at launch-antigravity.bat,
# so opening Antigravity always checks (and silently re-applies, if needed)
# the patch first, instead of waiting on the scheduled task's next tick.
# Idempotent - safe to re-run. Preserves the shortcut's icon so it still
# looks like Antigravity.
# Run this from the antigravity-add-model folder (no admin required - it's
# only touching your own user Start Menu shortcut).

$ShortcutPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Antigravity.lnk"
$WrapperPath = Join-Path $PSScriptRoot "launch-antigravity.bat"

if (-not (Test-Path $ShortcutPath)) {
    Write-Host "ERROR: Could not find the Antigravity Start Menu shortcut at:" -ForegroundColor Red
    Write-Host "  $ShortcutPath" -ForegroundColor Red
    Write-Host "If Antigravity is pinned/launched some other way, that launch path won't get the auto-check - the scheduled task still covers it on its normal interval." -ForegroundColor Yellow
    exit 1
}

$sh = New-Object -ComObject WScript.Shell
$lnk = $sh.CreateShortcut($ShortcutPath)

if ($lnk.TargetPath -eq $WrapperPath) {
    Write-Host "Shortcut already points at the wrapper - nothing to do." -ForegroundColor Green
    exit 0
}

$originalTarget = $lnk.TargetPath
$iconLocation = $lnk.IconLocation
if (-not $iconLocation -or $iconLocation -eq ",0") {
    $iconLocation = "$originalTarget,0"
}

$lnk.TargetPath = $WrapperPath
$lnk.IconLocation = $iconLocation
$lnk.WorkingDirectory = Split-Path $originalTarget -Parent
$lnk.Save()

Write-Host "Done - the Start Menu shortcut now checks the patch before opening Antigravity." -ForegroundColor Green
Write-Host "  Was: $originalTarget" -ForegroundColor Gray
Write-Host "  Now: $WrapperPath" -ForegroundColor Gray
