@echo off
REM Runs before Antigravity opens, every time - checks whether the patch
REM survived since last launch and silently re-applies it if not (see
REM ensure-patched.ps1). Only adds real delay when a repair is actually
REM needed; otherwise it's a sub-second check.
powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0ensure-patched.ps1"
REM A shell hosted inside another Electron app (VS Code, etc.) passes
REM ELECTRON_RUN_AS_NODE=1 down to anything it starts, which makes
REM Antigravity.exe run as plain Node and exit instantly. Clear it.
set "ELECTRON_RUN_AS_NODE="
start "" "%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe"
