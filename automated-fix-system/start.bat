@echo off
echo.
echo ====================================
echo   Automated Fix System Launcher
echo ====================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if .env exists
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo.
    echo IMPORTANT: Edit .env file and add your Anthropic API key!
    echo Get your key from: https://console.anthropic.com/
    echo.
    pause
)

:: Check if node_modules exists
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    echo.
)

:: Start the system
echo Starting Automated Fix System...
echo.
echo Dashboard will open at: http://localhost:3003
echo.
node src/index.js

pause