@echo off
REM Runs before Antigravity opens, every time - checks whether the patch
REM survived since last launch and silently re-applies it if not (see
REM ensure-patched.ps1). Only adds real delay when a repair is actually
REM needed; otherwise it's a sub-second check.
powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0ensure-patched.ps1"
start "" "%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe"
