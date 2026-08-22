# Build Portable Package for Work Computer
# Assembles everything needed into a single zip file

$ScriptDir = $PSScriptRoot
$PortableDir = Join-Path $ScriptDir "portable"
$ZipPath = Join-Path $ScriptDir "portable-antigravity-work.zip"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Building Portable Antigravity Package" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan

# Clean and create portable dir
if (Test-Path $PortableDir) { Remove-Item $PortableDir -Recurse -Force }
New-Item -ItemType Directory -Path $PortableDir -Force | Out-Null

# 1. Copy deploy script + auto-repair/launch-wrapper scripts
Write-Host "[1/5] Copying deploy + auto-repair scripts..." -ForegroundColor Yellow
Copy-Item (Join-Path $ScriptDir "portable-deploy.ps1") $PortableDir -Force
Copy-Item (Join-Path $ScriptDir "ensure-patched.ps1") $PortableDir -Force
Copy-Item (Join-Path $ScriptDir "launch-antigravity.bat") $PortableDir -Force
Copy-Item (Join-Path $ScriptDir "install-launch-wrapper.ps1") $PortableDir -Force
Write-Host "   OK" -ForegroundColor Green

# 2. Copy dist
Write-Host "[2/5] Copying dist folder..." -ForegroundColor Yellow
Copy-Item (Join-Path $ScriptDir "dist") (Join-Path $PortableDir "dist") -Recurse -Force
Write-Host "   OK" -ForegroundColor Green

# 3. Copy node_modules (only what's needed for asar)
Write-Host "[3/5] Copying node_modules..." -ForegroundColor Yellow
$srcNM = Join-Path $ScriptDir "node_modules"
$destNM = Join-Path $PortableDir "node_modules"

# Only copy @electron and .bin - that's all the deploy script needs
$asarDir = Join-Path $srcNM "@electron"
$binDir = Join-Path $srcNM ".bin"

if (Test-Path $asarDir) {
    New-Item -ItemType Directory -Path (Join-Path $destNM "@electron") -Force | Out-Null
    Copy-Item $asarDir (Join-Path $destNM "@electron") -Recurse -Force
}
if (Test-Path $binDir) {
    Copy-Item $binDir (Join-Path $destNM ".bin") -Recurse -Force
}
Write-Host "   OK" -ForegroundColor Green

# 4. Copy custom_models.json
Write-Host "[4/5] Copying model config..." -ForegroundColor Yellow
Copy-Item (Join-Path $ScriptDir "custom_models.json") $PortableDir -Force
Write-Host "   OK" -ForegroundColor Green

# 5. Create README
Write-Host "[5/5] Creating README..." -ForegroundColor Yellow
$readme = @"
============================================
  ANTIGRAVITY PORTABLE CUSTOM MODELS
  Work Computer Setup
============================================

WHAT THIS DOES:
  Patches Antigravity to use your custom cloud models
  (DeepSeek V4 Pro, DeepSeek V4 Flash, Dolphin, Euryale)

WHAT YOU NEED:
  - Antigravity already installed
  - Node.js installed (https://nodejs.org/)
  - Internet connection (for the cloud models)

HOW TO INSTALL:

  1. Right-click "portable-deploy.ps1"
  2. Select "Run with PowerShell"
  3. Let it finish (takes about 30 seconds)
  4. Right-click "install-launch-wrapper.ps1" -> Run with PowerShell
     (one-time - makes opening Antigravity check the patch first)
  5. Start Antigravity
  6. Go to Settings -> Models
  7. Your custom models should appear in the dropdown

AFTER ANTIGRAVITY UPDATES:
  Nothing to do by hand - step 4 above means opening Antigravity from
  the Start Menu now checks and re-applies the patch automatically
  every time, before the window even shows up. If you ever skip step 4,
  just run portable-deploy.ps1 again manually instead.

NO ADMIN REQUIRED - everything runs in your user folder.

============================================
"@
$readme | Out-File -FilePath (Join-Path $PortableDir "README.txt") -Encoding UTF8
Write-Host "   OK" -ForegroundColor Green

# Create zip
Write-Host ""
Write-Host "Creating zip file..." -ForegroundColor Yellow
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

# Use Compress-Archive (built into PowerShell)
$portableItems = Get-ChildItem $PortableDir
Compress-Archive -Path $portableItems.FullName -DestinationPath $ZipPath -Force

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  PACKAGE BUILT!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Location: $ZipPath" -ForegroundColor Gray
Write-Host ""
Write-Host "  Copy this zip to your work computer," -ForegroundColor Gray
Write-Host "  extract it anywhere, and run portable-deploy.ps1" -ForegroundColor Gray
Write-Host ""
