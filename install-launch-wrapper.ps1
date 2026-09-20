# Repoints the Antigravity Start Menu shortcut at launch-antigravity.bat,
# so opening Antigravity always checks (and silently re-applies, if needed)
# the patch first, instead of waiting on the scheduled task's next tick.
# Also registers an independent per-login trigger for the same check (see
# below) - confirmed necessary in practice: an Antigravity update/reinstall
# reset this shortcut back to Antigravity.exe directly, and because nothing
# else was checking, the self-healing silently stopped working for days
# until someone noticed. The login trigger doesn't depend on the shortcut
# being correct, so it catches exactly this case.
# Idempotent - safe to re-run. Preserves the shortcut's icon so it still
# looks like Antigravity.
# Run this from the antigravity-add-model folder (no admin required - it's
# only touching your own user Start Menu shortcut and your own per-user
# registry Run key, not machine-wide settings).

$ShortcutLocations = @(
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Antigravity.lnk",
    "$env:USERPROFILE\Desktop\Antigravity.lnk",
    "$env:USERPROFILE\OneDrive\Desktop\Antigravity.lnk"
)
$WrapperPath = Join-Path $PSScriptRoot "launch-antigravity.bat"
$sh = New-Object -ComObject WScript.Shell

$foundAny = $false
foreach ($ShortcutPath in $ShortcutLocations) {
    if (Test-Path $ShortcutPath) {
        $foundAny = $true
        $lnk = $sh.CreateShortcut($ShortcutPath)

        if ($lnk.TargetPath -eq $WrapperPath) {
            Write-Host "Shortcut already points at the wrapper ($ShortcutPath)." -ForegroundColor Green
        } else {
            $originalTarget = $lnk.TargetPath
            $iconLocation = $lnk.IconLocation
            if (-not $iconLocation -or $iconLocation -eq ",0") {
                $iconLocation = "$originalTarget,0"
            }

            $lnk.TargetPath = $WrapperPath
            $lnk.IconLocation = $iconLocation
            $lnk.WorkingDirectory = Split-Path $originalTarget -Parent
            $lnk.Save()

            Write-Host "Done - repointed shortcut to wrapper ($ShortcutPath)." -ForegroundColor Green
            Write-Host "  Was: $originalTarget" -ForegroundColor Gray
            Write-Host "  Now: $WrapperPath" -ForegroundColor Gray
        }
    }
}

if (-not $foundAny) {
    Write-Host "WARNING: Could not find any standard Antigravity shortcuts." -ForegroundColor Yellow
    Write-Host "If Antigravity is pinned/launched some other way, that launch path won't get the auto-check - the per-login safety net below still covers it." -ForegroundColor Yellow
}

# ─── Independent per-login safety net ────────────────────────────────────────
# Runs ensure-patched.ps1 silently once per login, regardless of how
# Antigravity actually gets launched. This is what catches the shortcut
# itself being reset (see the comment at the top of this file) - a check
# that only fires *through* the shortcut can't ever notice or fix the
# shortcut breaking. HKCU Run key: no admin needed, per-user only, standard
# Windows autostart mechanism. Always runs, whether or not the shortcut
# needed fixing above.
$RunKeyPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$RunKeyName = "AntigravityModSelfHeal"
$EnsurePatchedPath = Join-Path $PSScriptRoot "ensure-patched.ps1"
$RunKeyValue = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$EnsurePatchedPath`""

$existing = (Get-ItemProperty -Path $RunKeyPath -Name $RunKeyName -ErrorAction SilentlyContinue).$RunKeyName
if ($existing -ne $RunKeyValue) {
    Set-ItemProperty -Path $RunKeyPath -Name $RunKeyName -Value $RunKeyValue
    Write-Host "Registered a per-login self-heal check (runs silently, no visible window)." -ForegroundColor Green
} else {
    Write-Host "Per-login self-heal check already registered - nothing to do." -ForegroundColor Green
}
