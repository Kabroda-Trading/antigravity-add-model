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

if ($needsPatch) {
    # Admin install ships deploy.ps1; the portable/non-admin package only
    # ever has portable-deploy.ps1 (build-portable.ps1 doesn't copy the
    # admin one over) - use whichever is actually present so this one
    # script works unmodified in both packages.
    $adminDeploy = Join-Path $PSScriptRoot "deploy.ps1"
    $portableDeploy = Join-Path $PSScriptRoot "portable-deploy.ps1"
    $deployScript = if (Test-Path $adminDeploy) { $adminDeploy } else { $portableDeploy }
    $log = Join-Path $PSScriptRoot "ensure-patched.log"
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Patch missing, running $(Split-Path $deployScript -Leaf)..." | Out-File $log -Append
    & powershell -ExecutionPolicy Bypass -File $deployScript *>> $log
} else {
    $log = Join-Path $PSScriptRoot "ensure-patched.log"
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Already patched, nothing to do." | Out-File $log -Append
}
