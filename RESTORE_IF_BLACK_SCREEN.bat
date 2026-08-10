@echo off
title Antigravity Repair - Step 1: Restore
color 0B

echo ============================================
echo   Antigravity Repair Tool
echo   Step 1: Restore last working version
echo ============================================
echo.

set "RES=%LOCALAPPDATA%\Programs\antigravity\resources"
set "BIN=%RES%\bin"

echo Closing Antigravity if it's open...
taskkill /IM Antigravity.exe /F >nul 2>&1
taskkill /IM language_server.exe /F >nul 2>&1
timeout /t 2 >nul

if not exist "%RES%\app.asar.backup" goto :nobackup
if not exist "%BIN%\language_server.exe.bak" goto :nobackup

echo Restoring app.asar from backup...
copy /Y "%RES%\app.asar.backup" "%RES%\app.asar" >nul

if exist "%RES%\app.asar.backup.unpacked" (
    if exist "%RES%\app.asar.unpacked" rmdir /S /Q "%RES%\app.asar.unpacked"
    xcopy "%RES%\app.asar.backup.unpacked" "%RES%\app.asar.unpacked" /E /I /H /Y >nul
)

echo Restoring language_server.exe from backup...
copy /Y "%BIN%\language_server.exe.bak" "%BIN%\language_server.exe" >nul

if exist "%RES%\app.asar.backup.version" del "%RES%\app.asar.backup.version" >nul 2>&1

echo.
echo ============================================
echo   DONE. Starting Antigravity...
echo ============================================
start "" "%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe"
echo.
echo If Antigravity opened normally:
echo   Great - now run "repatch.bat" in this same folder
echo   to turn your custom models back on.
echo.
echo If it STILL shows a black or blank screen:
echo   1. Windows Settings -^> Apps -^> find "Antigravity" -^> Uninstall.
echo   2. Reinstall Antigravity fresh (same place you got it before).
echo   3. Open it once and confirm it works normally
echo      (no custom models yet at this point - that's expected).
echo   4. Then run "repatch.bat" in this folder.
echo   Your saved custom models and API keys are stored separately
echo   and will NOT be lost by any of this.
echo.
pause
goto :eof

:nobackup
echo.
echo No local backup was found on this computer, so there's
echo nothing to automatically restore.
echo.
echo Please do this instead:
echo   1. Windows Settings -^> Apps -^> find "Antigravity" -^> Uninstall.
echo   2. Reinstall Antigravity fresh (same place you got it before).
echo   3. Open it once and confirm it works normally.
echo   4. Then run "repatch.bat" in this folder.
echo   Your saved custom models and API keys are stored separately
echo   and will NOT be lost by any of this.
echo.
pause
