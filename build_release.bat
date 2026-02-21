@echo off
setlocal enabledelayedexpansion
title HealVision Release Builder
cd /d "%~dp0"

echo ==========================================
echo   HealVision Release Builder v1.0
echo ==========================================
echo.

set RELEASE_DIR=release
set NODE_VERSION=22.13.1
set NODE_ZIP=node-v%NODE_VERSION%-win-x64.zip
set NODE_DIR=node-v%NODE_VERSION%-win-x64

:: Clean previous release
if exist "%RELEASE_DIR%" (
    echo Cleaning previous release...
    rmdir /s /q "%RELEASE_DIR%"
)

echo [1/6] Building shared, server, and client...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo Build completed.
echo.

echo [2/6] Creating release directory structure...
mkdir "%RELEASE_DIR%"
mkdir "%RELEASE_DIR%\server\dist"
mkdir "%RELEASE_DIR%\client\dist"
mkdir "%RELEASE_DIR%\shared\src"
mkdir "%RELEASE_DIR%\data"
echo.

echo [3/6] Checking for portable Node.js...
if not exist "%NODE_ZIP%" (
    echo Downloading Node.js v%NODE_VERSION% portable...
    powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v%NODE_VERSION%/%NODE_ZIP%' -OutFile '%NODE_ZIP%'"
    if %errorlevel% neq 0 (
        echo ERROR: Failed to download Node.js. Please download manually:
        echo https://nodejs.org/dist/v%NODE_VERSION%/%NODE_ZIP%
        echo Place the zip file in this directory and run this script again.
        pause
        exit /b 1
    )
)

if not exist "%RELEASE_DIR%\node" (
    echo Extracting Node.js...
    powershell -NoProfile -Command "Expand-Archive -Path '%NODE_ZIP%' -DestinationPath '%RELEASE_DIR%' -Force"
    rename "%RELEASE_DIR%\%NODE_DIR%" node
)
echo.

echo [4/6] Copying application files...

:: Server compiled files
xcopy /E /Y /Q "server\dist\*" "%RELEASE_DIR%\server\dist\"

:: Server node_modules (production only)
xcopy /E /Y /Q "server\node_modules\*" "%RELEASE_DIR%\server\node_modules\" >nul 2>&1
:: Also copy root node_modules needed by server (hoisted deps in workspace)
xcopy /E /Y /Q "node_modules\*" "%RELEASE_DIR%\node_modules\" >nul 2>&1

:: Server package.json
copy /Y "server\package.json" "%RELEASE_DIR%\server\"

:: Client dist
xcopy /E /Y /Q "client\dist\*" "%RELEASE_DIR%\client\dist\"

:: Shared
xcopy /E /Y /Q "shared\src\*" "%RELEASE_DIR%\shared\src\"
copy /Y "shared\package.json" "%RELEASE_DIR%\shared\"

:: Root package.json (for workspace resolution)
copy /Y "package.json" "%RELEASE_DIR%\"

:: Read API key from .env and embed into compiled config.js
echo [4b] Embedding API key into compiled binary...
for /f "tokens=2 delims==" %%A in ('findstr /i "DEFAULT_API_KEY" .env') do set EMBED_KEY=%%A
if defined EMBED_KEY (
    powershell -NoProfile -Command "(Get-Content '%RELEASE_DIR%\server\dist\config.js') -replace '__EMBEDDED_API_KEY__', '%EMBED_KEY%' | Set-Content '%RELEASE_DIR%\server\dist\config.js'"
    echo API key embedded into binary.
) else (
    echo WARNING: DEFAULT_API_KEY not found in .env
)

:: .env without API key
echo [4c] Creating sanitized .env (no API key)...
if exist ".env" (
    powershell -NoProfile -Command "Get-Content '.env' | Where-Object { $_ -notmatch '^DEFAULT_API_KEY' } | Set-Content '%RELEASE_DIR%\.env'"
) else (
    copy /Y ".env.example" "%RELEASE_DIR%\.env"
)

echo.

echo [5/6] Creating start script and documentation...

:: start.bat is created separately (see release/start.bat)
:: Copy pre-created files
copy /Y "release_templates\start.bat" "%RELEASE_DIR%\" >nul 2>&1
copy /Y "release_templates\使用说明.txt" "%RELEASE_DIR%\" >nul 2>&1

:: If templates don't exist, create inline
if not exist "%RELEASE_DIR%\start.bat" (
    (
        echo @echo off
        echo title HealVision AI
        echo cd /d "%%~dp0"
        echo echo.
        echo echo ==========================================
        echo echo       HealVision AI 正在启动...
        echo echo ==========================================
        echo echo.
        echo echo 请稍候，正在启动服务...
        echo echo 启动后请在浏览器中访问: http://localhost:3001
        echo echo.
        echo echo 按 Ctrl+C 可停止服务
        echo echo.
        echo start "" "http://localhost:3001"
        echo node\node.exe server\dist\index.js
        echo echo.
        echo echo 服务已停止。
        echo pause
    ) > "%RELEASE_DIR%\start.bat"
)

echo.

echo [6/6] Creating zip archive...
powershell -NoProfile -Command "Compress-Archive -Path '%RELEASE_DIR%\*' -DestinationPath 'HealVision-v1.0.zip' -Force"
if %errorlevel% neq 0 (
    echo WARNING: Failed to create zip. You can manually zip the release folder.
) else (
    echo Created HealVision-v1.0.zip
)

echo.
echo ==========================================
echo   Release build complete!
echo ==========================================
echo.
echo Output: %RELEASE_DIR%\
echo Archive: HealVision-v1.0.zip
echo.
pause
