@echo off
REM Deploy TRIP frontend + backend API to Vercel
echo.
echo ===============================================================
echo    TRIP Platform - Full Stack Deployment to Vercel
echo ===============================================================
echo.

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if errorlevel 1 (
    echo Installing Vercel CLI...
    npm install -g vercel
)

echo.
echo Step 1: Building frontend...
call npm run build
if errorlevel 1 (
    echo Build failed! Please fix errors before deploying.
    pause
    exit /b 1
)

echo.
echo Step 2: Deploying frontend + API to Vercel...
vercel --prod

echo.
echo ===============================================================
echo    Deployment Complete!
echo ===============================================================
echo.
echo Next steps:
echo 1. Open your deployed URL
echo 2. Verify health endpoint: /api/health
echo 3. Set CORS_ORIGIN and other backend env vars in Vercel settings
echo.
pause
