#!/bin/bash
# Deploy TRIP Frontend to Vercel

echo "==============================================================="
echo "   TRIP Platform - Frontend Deployment to Vercel"
echo "==============================================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

echo ""
echo "Step 1: Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "Build failed! Please fix errors before deploying."
    exit 1
fi

echo ""
echo "Step 2: Deploying to Vercel..."
vercel --prod

echo ""
echo "==============================================================="
echo "   Deployment Complete!"
echo "==============================================================="
echo ""
echo "Next steps:"
echo "1. Copy your Vercel URL (e.g., https://trip-platform.vercel.app)"
echo "2. Update REACT_APP_API_URL in Vercel dashboard with your backend URL"
echo "3. Configure custom domain if needed"
echo ""
read -p "Press Enter to continue..."
