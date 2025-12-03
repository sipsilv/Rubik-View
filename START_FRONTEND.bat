@echo off
echo ========================================
echo   Starting Rubik View Frontend Server
echo ========================================
echo.

cd /d "%~dp0"

echo Navigating to frontend directory...
cd frontend

echo.
echo Starting frontend server on http://localhost:3000...
echo Press CTRL+C to stop the server
echo.
echo If you see any errors, they will appear below:
echo ========================================
echo.

npm run dev

echo.
echo Server stopped.
pause

