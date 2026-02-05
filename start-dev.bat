@echo off
REM TRIP Platform - Development Server Starter (Windows)
REM Starts both frontend and backend servers in separate windows

echo.
echo ===============================================================
echo    TRIP - Tanzania Readmission Intelligence Platform
echo ===============================================================
echo.

REM Check if Node.js is installed
node -v >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo OK: Node.js detected
echo.

REM Install frontend dependencies if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
    echo.
)

REM Install backend dependencies if needed
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo.
)

REM Create backend .env if it doesn't exist
if not exist "backend\.env" (
    echo Creating backend .env file from template...
    copy backend\.env.example backend\.env
)

echo ===============================================================
echo Starting TRIP Platform Services...
echo ===============================================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Close this window or press Ctrl+C to stop all services
echo.

REM Start frontend in a new window
start "TRIP Frontend" cmd /k npm start

REM Start backend in a new window
cd backend
start "TRIP Backend" cmd /k npm start
cd ..

echo Services started in new windows
pause
