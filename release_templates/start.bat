@echo off
title HealVision AI
cd /d "%~dp0"

echo.
echo ==========================================
echo       HealVision AI v1.0
echo ==========================================
echo.
echo 正在启动服务...
echo 启动后将自动打开浏览器
echo.
echo 访问地址: http://localhost:3001
echo 按 Ctrl+C 可停止服务
echo ==========================================
echo.

:: Auto-open browser after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3001"

:: Start server using bundled Node.js
node\node.exe server\dist\index.js

echo.
echo 服务已停止。
pause
