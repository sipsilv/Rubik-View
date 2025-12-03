@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

title Rubik View - Starting All Servers
color 0E

echo ========================================
echo   Rubik View - Starting All Servers
echo ========================================
echo.
echo   This will start both backend and frontend servers
echo   in separate windows.
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo.
echo   Starting servers...
timeout /t 2 /nobreak >nul

REM Start backend in a new window
echo.
echo [1/2] Starting backend server...
start "Rubik View - Backend Server" cmd /k "%~dp0run-backend.bat"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in a new window
echo [2/2] Starting frontend server...
start "Rubik View - Frontend Server" cmd /k "%~dp0run-frontend.bat"

echo.
echo ========================================
echo   Both servers are starting!
echo ========================================
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo.
echo   Each server is running in its own window.
echo   Close those windows to stop the servers.
echo.
echo   This window will close in 5 seconds...
timeout /t 5 /nobreak >nul

