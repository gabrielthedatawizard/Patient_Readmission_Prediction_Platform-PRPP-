@echo off
REM Deploy TRIP Frontend to Vercel
echo.
echo ===============================================================
echo    TRIP Platform - Frontend Deployment to Vercel
echo ===============================================================
echo.

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if errorlevel 1 (
    echo Installing Vercel CLI...
    npm install -g vercel
)

echo.
echo Step 1: Building project...
call npm run build
if errorlevel 1 (
    echo Build failed! Please fix errors before deploying.
    pause
    exit /b 1
)

echo.
echo Step 2: Deploying to Vercel...
vercel --prod

echo.
echo ===============================================================
echo    Deployment Complete!
echo ===============================================================
echo.
echo Next steps:
echo 1. Copy your Vercel URL (e.g., https://trip-platform.vercel.app)
echo 2. Update REACT_APP_API_URL in Vercel dashboard with your backend URL
echo 3. Configure custom domain if needed
echo.
pause
