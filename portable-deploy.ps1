# Antigravity Portable Deploy - No Admin Required
# Uses bundled node_modules, works entirely in user-writable directories
# Run from the extracted portable folder

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Antigravity Portable Deploy (No Admin)" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan

# 1. Try to stop Antigravity (may fail without admin - that's OK)
Write-Host ""
Write-Host "[1/6] Stopping Antigravity if running..." -ForegroundColor Yellow
Stop-Process -Name "Antigravity" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "language_server" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "   OK (or already stopped)" -ForegroundColor Green

# 2. Define paths
$ScriptDir = $PSScriptRoot
$AsarPath = "$env:LOCALAPPDATA\Programs\antigravity\resources\app.asar"
$BackupAsar = "$AsarPath.backup"
$TempDir = Join-Path $env:TEMP "antigravity_portable_deploy"
$CustomModelsDest = "$env:USERPROFILE\.gemini\antigravity\custom_models.json"
$LsBinary = "$env:LOCALAPPDATA\Programs\antigravity\resources\bin\language_server.exe"

# 3. Backup existing asar
Write-Host "[2/6] Backing up app.asar..." -ForegroundColor Yellow
if (Test-Path $AsarPath) {
    if (-not (Test-Path $BackupAsar)) {
        Copy-Item $AsarPath $BackupAsar -Force
        Write-Host "   Backup created: $BackupAsar" -ForegroundColor Green
    } else {
        Write-Host "   Backup already exists" -ForegroundColor Green
    }
} else {
    Write-Host "   ERROR: app.asar not found at $AsarPath" -ForegroundColor Red
    Write-Host "   Is Antigravity installed?" -ForegroundColor Red
    pause
    exit 1
}

# 4. Extract asar using bundled module
Write-Host "[3/6] Extracting app.asar..." -ForegroundColor Yellow
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }

$AsarBin = Join-Path $ScriptDir "node_modules\.bin\asar.cmd"
if (-not (Test-Path $AsarBin)) {
    # Fallback: use npx if available
    Write-Host "   Using npx fallback..." -ForegroundColor Yellow
    $env:NODE_OPTIONS = "--max-old-space-size=4096"
    npx -y @electron/asar extract $BackupAsar $TempDir
} else {
    & $AsarBin extract $BackupAsar $TempDir
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ERROR: asar extract failed!" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "   OK" -ForegroundColor Green

# 5. Copy dist folder
Write-Host "[4/6] Deploying patch files..." -ForegroundColor Yellow
$srcDist = Join-Path $ScriptDir "dist"
$destDist = Join-Path $TempDir "dist"

if (-not (Test-Path $srcDist)) {
    Write-Host "   ERROR: dist folder not found in portable package!" -ForegroundColor Red
    pause
    exit 1
}

if (Test-Path $destDist) { Remove-Item $destDist -Recurse -Force }
Copy-Item $srcDist $destDist -Recurse -Force
Write-Host "   OK - dist deployed" -ForegroundColor Green

# 6. Re-pack asar
Write-Host "[5/6] Re-packing app.asar..." -ForegroundColor Yellow
$AsarUnpacked = "$AsarPath.unpacked"
if (Test-Path $AsarUnpacked) { Remove-Item $AsarUnpacked -Recurse -Force }

if (-not (Test-Path $AsarBin)) {
    npx -y @electron/asar pack $TempDir $AsarPath --unpack-dir "node_modules"
} else {
    & $AsarBin pack $TempDir $AsarPath --unpack-dir "node_modules"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ERROR: Pack failed! Restoring backup..." -ForegroundColor Red
    Copy-Item $BackupAsar $AsarPath -Force
    Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    pause
    exit 1
}
Write-Host "   OK" -ForegroundColor Green

# Cleanup temp
Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue

# 7. Binary patch language_server.exe
Write-Host "[6/6] Patching language server..." -ForegroundColor Yellow
$OriginalUrl = "https://daily-cloudcode-pa.googleapis.com"
$PatchedUrl = "http://localhost:50999/v1internal/xxxxxxx"

if (Test-Path $LsBinary) {
    $content = [System.IO.File]::ReadAllText($LsBinary, [System.Text.Encoding]::ASCII)
    if ($content.Contains($PatchedUrl)) {
        Write-Host "   OK - Already patched" -ForegroundColor Green
    } else {
        $offset = $content.IndexOf($OriginalUrl, [StringComparison]::Ordinal)
        if ($offset -ge 0) {
            $LsBackup = "$LsBinary.bak"
            if (-not (Test-Path $LsBackup)) { Copy-Item $LsBinary $LsBackup -Force }
            $replaceBytes = [System.Text.Encoding]::ASCII.GetBytes($PatchedUrl)
            $outBytes = [System.IO.File]::ReadAllBytes($LsBinary)
            [System.Array]::Copy($replaceBytes, 0, $outBytes, $offset, $replaceBytes.Length)
            [System.IO.File]::WriteAllBytes($LsBinary, $outBytes)
            Write-Host "   OK - Binary patched" -ForegroundColor Green
        } else {
            Write-Host "   WARNING: URL not found in binary - may already be patched or updated" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "   WARNING: language_server.exe not found" -ForegroundColor Yellow
}

# 8. Copy custom_models.json
Write-Host ""
Write-Host "   Copying custom_models.json..." -ForegroundColor Yellow
$srcModels = Join-Path $ScriptDir "custom_models.json"
if (Test-Path $srcModels) {
    $destDir = Split-Path $CustomModelsDest -Parent
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item $srcModels $CustomModelsDest -Force
    Write-Host "   OK - Models config deployed" -ForegroundColor Green
} else {
    Write-Host "   WARNING: custom_models.json not found in package" -ForegroundColor Yellow
}

# Done
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  DEPLOY COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Gray
Write-Host "  1. Start Antigravity" -ForegroundColor Gray
Write-Host "  2. Go to Settings -> Models" -ForegroundColor Gray
Write-Host "  3. Your custom models should appear" -ForegroundColor Gray
Write-Host "  4. Select one from the chat dropdown" -ForegroundColor Gray
Write-Host ""
Write-Host "  If models don't appear, run this script again." -ForegroundColor Gray
Write-Host "  (Antigravity updates overwrite the patch)" -ForegroundColor Gray
Write-Host ""
pause
