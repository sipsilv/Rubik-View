@echo off
chcp 65001 >nul
echo ========================================
echo   Starting Rubik View Backend Server
echo ========================================
echo.

cd /d "%~dp0"

echo Current directory: %CD%
echo.

echo Checking Python installation...
python --version
if errorlevel 1 (
    echo.
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again.
    pause
    exit /b 1
)
echo.

echo Checking backend directory...
if not exist "backend\main.py" (
    echo.
    echo ERROR: backend\main.py not found!
    echo Make sure you are running this from the project root directory.
    echo Current directory: %CD%
    pause
    exit /b 1
)
echo.

echo Checking Python dependencies...
set DEPENDENCIES_MISSING=0

python -c "import uvicorn" >nul 2>&1
if errorlevel 1 (
    echo   [MISSING] uvicorn
    set DEPENDENCIES_MISSING=1
) else (
    echo   [OK] uvicorn is installed
)

python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo   [MISSING] fastapi
    set DEPENDENCIES_MISSING=1
) else (
    echo   [OK] fastapi is installed
)

python -c "import pydantic" >nul 2>&1
if errorlevel 1 (
    echo   [MISSING] pydantic
    set DEPENDENCIES_MISSING=1
) else (
    echo   [OK] pydantic is installed
)

python -c "import email_validator" >nul 2>&1
if errorlevel 1 (
    echo   [MISSING] email-validator
    set DEPENDENCIES_MISSING=1
) else (
    echo   [OK] email-validator is installed
)

if %DEPENDENCIES_MISSING%==1 (
    echo.
    echo ========================================
    echo ERROR: Missing required dependencies!
    echo ========================================
    echo.
    echo Some required Python packages are not installed.
    echo.
    echo Would you like to install all dependencies now?
    echo This will run: pip install -r backend/requirements.txt
    echo.
    choice /C YN /M "Install dependencies now"
    if errorlevel 2 (
        echo.
        echo Please install dependencies manually:
        echo   pip install -r backend/requirements.txt
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Installing dependencies...
    echo This may take a few minutes...
    echo.
    pip install -r backend/requirements.txt
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies!
        echo Please install manually: pip install -r backend/requirements.txt
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully!
    echo.
    echo Verifying installation...
    python -c "import uvicorn, fastapi, pydantic, email_validator" >nul 2>&1
    if errorlevel 1 (
        echo.
        echo WARNING: Some dependencies may still be missing.
        echo Please check the installation output above.
        echo.
    ) else (
        echo   [OK] All critical dependencies verified!
    )
    echo.
) else (
    echo   [OK] All dependencies are installed!
    echo.
)

echo Checking if port 8000 is available...
netstat -ano | findstr ":8000" >nul
if not errorlevel 1 (
    echo WARNING: Port 8000 appears to be in use.
    echo You may need to stop the existing server first.
    echo.
    choice /C YN /M "Do you want to continue anyway"
    if errorlevel 2 exit /b 1
    echo.
)

echo ========================================
echo Starting backend server...
echo ========================================
echo.
echo Server URL: http://localhost:8000
echo Health Check: http://localhost:8000/health
echo API Docs: http://localhost:8000/docs
echo.
echo Press CTRL+C to stop the server
echo ========================================
echo.

python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

set EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE% NEQ 0 (
    echo.
    echo ========================================
    echo ERROR: Server failed to start!
    echo Exit code: %EXIT_CODE%
    echo ========================================
    echo.
    echo Common issues:
    echo 1. Port 8000 is already in use
    echo 2. Missing Python dependencies - run: pip install -r backend/requirements.txt
    echo 3. Database error - check Data/rubikview_users.db exists
    echo.
    pause
    exit /b %EXIT_CODE%
)

echo.
echo Server stopped.
pause
