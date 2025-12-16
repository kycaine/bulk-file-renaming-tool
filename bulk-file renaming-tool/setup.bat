@echo off
REM Bulk File Renaming Tool - Electron Setup Script for Windows

echo.
echo ========================================
echo Bulk File Renaming Tool Setup
echo ========================================
echo.

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js/npm is not installed or not in PATH.
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Then re-run this script.
    pause
    exit /b 1
)

echo [1/3] Node.js found: %npm --version%
echo.

echo [2/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)
echo Dependencies installed successfully!
echo.

echo [3/3] Setup complete!
echo.
echo ========================================
echo To start the application, run:
echo   npm start
echo ========================================
echo.
pause
