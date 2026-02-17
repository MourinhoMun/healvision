@echo off
title HealVision Launcher
cd /d "%~dp0"

echo ==========================================
echo       HealVision AI Startup Script
echo ==========================================
echo.

echo [1/3] Cleaning up ports 3001 and 5173...
:: Use PowerShell to kill processes on specific ports (more robust than netstat)
powershell -NoProfile -Command "try { Get-NetTCPConnection -LocalPort 3001,5173 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host 'Killing PID' $_.OwningProcess; Stop-Process -Id $_.OwningProcess -Force } } catch {}"

echo.
echo [2/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error: npm install failed.
    cmd /k
    exit /b
)

echo.
echo [3/3] Starting HealVision...
echo.
echo Note: If the browser doesn't open automatically, visit http://localhost:5173
echo.

call npm run dev

echo.
echo Application stopped.
:: Use cmd /k to keep the window open intentionally so you can see errors
cmd /k
