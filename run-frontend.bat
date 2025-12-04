@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

title Rubik View - Frontend Server
color 0B

echo ========================================
echo   Rubik View - Frontend Server
echo ========================================
echo.

REM Kill any existing process on port 3000
echo [1/5] Checking port 3000...
set PORT_FOUND=0
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000.*LISTENING"') do (
    echo   Stopping process on port 3000 ^(PID: %%a^)
    taskkill /PID %%a /F >nul 2>&1
    set PORT_FOUND=1
)
if %PORT_FOUND%==0 (
    echo   Port 3000 is free
) else (
    echo   Port 3000 cleared
)
timeout /t 2 /nobreak >nul
echo.

REM Check Node.js
echo [2/5] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js not found!
    echo   Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo   Node.js found:
node --version
echo.

REM Check frontend directory exists
echo [3/5] Checking frontend directory...
if not exist "frontend\package.json" (
    echo   ERROR: frontend\package.json not found!
    echo   Current directory: %CD%
    echo   Please make sure you're in the project root directory.
    echo.
    pause
    exit /b 1
)
echo   Frontend directory found
echo.

REM Check and install dependencies
echo [4/5] Checking dependencies...
if not exist "frontend\node_modules" (
    echo   Installing dependencies ^(first time setup - this may take a few minutes^)...
    cd frontend
    call npm install
    if errorlevel 1 (
        echo   ERROR: Failed to install dependencies!
        cd ..
        echo.
        pause
        exit /b 1
    )
    cd ..
    echo   Dependencies installed successfully!
) else (
    echo   Dependencies found ^(node_modules exists^)
)
echo.

REM Start server - exactly like running manually
echo [5/5] Starting frontend server...
echo.
echo ========================================
echo   Frontend Server Starting...
echo ========================================
echo   URL: http://localhost:3000
echo.
echo   This runs: cd frontend ^&^& npm run dev
echo   Server will be ready in a few seconds...
echo   Press CTRL+C to stop the server
echo ========================================
echo.

REM Change to frontend directory and run npm run dev (exactly like manual)
cd frontend
call npm run dev

REM If we get here, the server stopped or errored
if errorlevel 1 (
    echo.
    echo ========================================
    echo ERROR: Server failed to start!
    echo ========================================
    echo.
    echo Troubleshooting steps:
    echo 1. Make sure Node.js v18+ is installed
    echo 2. Delete frontend\node_modules and .next folders
    echo 3. Run this batch file again to reinstall
    echo 4. Check for error messages above
    echo.
    cd ..
    pause
    exit /b 1
)

cd ..
pause


