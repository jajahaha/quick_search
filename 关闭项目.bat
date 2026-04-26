@echo off
chcp 65001 >nul
title Quick Command Manager - Close

echo ========================================
echo   Quick Command Manager v1.0 - Close
echo ========================================
echo.

cd /d "%~dp0"

set "closed=0"

echo Checking port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    echo Found process PID: %%a, terminating...
    taskkill /F /PID %%a >nul 2>&1
    if errorlevel 1 (
        echo Cannot terminate process %%a
    ) else (
        echo Process %%a terminated
        set "closed=1"
    )
)

echo.
echo Checking node.exe processes...
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul
if not errorlevel 1 (
    echo Found node.exe processes, terminating...
    taskkill /F /IM node.exe >nul 2>&1
    if errorlevel 1 (
        echo No node processes to terminate
    ) else (
        echo All node.exe processes terminated
        set "closed=1"
    )
) else (
    echo No node.exe processes found
)

echo.
echo Closing start script window...
for /f "tokens=2" %%i in ('tasklist /FI "WINDOWTITLE eq Quick Command Manager - Running" /FO LIST 2^>nul ^| findstr "PID:"') do (
    taskkill /F /PID %%i >nul 2>&1
    if not errorlevel 1 (
        echo Start script window closed
        set "closed=1"
    )
)

echo.
if "%closed%"=="1" (
    echo ========================================
    echo   Project closed successfully
    echo ========================================
) else (
    echo ========================================
    echo   No running project found
    echo ========================================
)
echo.
pause
