@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

title Rubik View - Backend Server
color 0A

echo ========================================
echo   Rubik View - Backend Server
echo ========================================
echo.

REM Kill any existing process on port 8000
echo [1/5] Checking port 8000...
set PORT_FOUND=0
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000.*LISTENING"') do (
    echo   Stopping process on port 8000 ^(PID: %%a^)
    taskkill /PID %%a /F >nul 2>&1
    set PORT_FOUND=1
)
if %PORT_FOUND%==0 (
    echo   Port 8000 is free
) else (
    echo   Port 8000 cleared
)
timeout /t 2 /nobreak >nul
echo.

REM Check Python
echo [2/5] Checking Python...
where python >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Python not found!
    echo   Please install Python from https://www.python.org/
    echo.
    pause
    exit /b 1
)
echo   Python found:
python --version
echo.

REM Check backend directory exists
echo [3/5] Checking backend directory...
if not exist "backend\main.py" (
    echo   ERROR: backend\main.py not found!
    echo   Current directory: %CD%
    echo   Please make sure you're in the project root directory.
    echo.
    pause
    exit /b 1
)
echo   Backend directory found
echo.

REM Check and install dependencies
echo [4/5] Checking dependencies...
if not exist "backend\requirements.txt" (
    echo   ERROR: backend\requirements.txt not found!
    echo.
    pause
    exit /b 1
)

REM Check if virtual environment exists, if not create one
if not exist "backend\venv" (
    echo   Creating virtual environment...
    cd backend
    python -m venv venv
    if errorlevel 1 (
        echo   ERROR: Failed to create virtual environment!
        cd ..
        echo.
        pause
        exit /b 1
    )
    cd ..
    echo   Virtual environment created
)

REM Activate virtual environment and install/update dependencies
echo   Activating virtual environment and checking dependencies...
cd backend
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo   ERROR: Failed to activate virtual environment!
    cd ..
    echo.
    pause
    exit /b 1
)

REM Check if uvicorn is installed
python -c "import uvicorn" >nul 2>&1
if errorlevel 1 (
    echo   Installing dependencies ^(first time setup - this may take a few minutes^)...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo   ERROR: Failed to install dependencies!
        cd ..
        echo.
        pause
        exit /b 1
    )
    echo   Dependencies installed successfully!
) else (
    echo   Dependencies found
)
echo.

REM Start server
echo [5/5] Starting backend server...
echo.
echo ========================================
echo   Backend Server Starting...
echo ========================================
echo   URL: http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo   This runs: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
echo   Server will be ready in a few seconds...
echo   Press CTRL+C to stop the server
echo ========================================
echo.

REM Run uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

REM If we get here, the server stopped or errored
if errorlevel 1 (
    echo.
    echo ========================================
    echo ERROR: Server failed to start!
    echo ========================================
    echo.
    echo Troubleshooting steps:
    echo 1. Make sure Python 3.8+ is installed
    echo 2. Delete backend\venv folder and run this batch file again
    echo 3. Check for error messages above
    echo 4. Make sure all dependencies in requirements.txt are installed
    echo.
    cd ..
    pause
    exit /b 1
)

cd ..
pause
