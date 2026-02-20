#!/bin/bash
# Deploy TRIP frontend + backend API to Vercel

echo "==============================================================="
echo "   TRIP Platform - Full Stack Deployment to Vercel"
echo "==============================================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

echo ""
echo "Step 1: Building frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "Build failed! Please fix errors before deploying."
    exit 1
fi

echo ""
echo "Step 2: Deploying frontend + API to Vercel..."
vercel --prod

echo ""
echo "==============================================================="
echo "   Deployment Complete!"
echo "==============================================================="
echo ""
echo "Next steps:"
echo "1. Open your deployed URL"
echo "2. Verify health endpoint: /api/health"
echo "3. Set CORS_ORIGIN and other backend env vars in Vercel settings"
echo ""
read -p "Press Enter to continue..."
