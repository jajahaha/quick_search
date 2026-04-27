@echo off
chcp 65001 >nul
title Quick Command Manager - Running

echo ========================================
echo   Quick Command Manager v1.0 - Start
echo ========================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Failed to install dependencies. Please check Node.js installation.
        pause
        exit /b 1
    )
    echo.
)

echo Copying sql.js files...
copy "node_modules\sql.js\dist\sql-wasm-browser.js" "public\" >nul 2>&1
copy "node_modules\sql.js\dist\sql-wasm-browser.wasm" "public\" >nul 2>&1

echo Starting development server...
echo Please visit: http://localhost:3000
echo.
echo ========================================
echo   Server is running in background
echo   Keep this window open
echo   Run "close.bat" to stop the server
echo ========================================
echo.

start /b "" cmd /c "npm run dev"

:loop
timeout /t 60 >nul
goto loop
