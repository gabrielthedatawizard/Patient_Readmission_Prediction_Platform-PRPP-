#!/bin/bash
# TRIP Platform - Development Server Starter
# Starts both frontend and backend servers concurrently

echo "═══════════════════════════════════════════════════════════"
echo "   TRIP - Tanzania Readmission Intelligence Platform"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✓ Node.js detected: $(node -v)"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
    echo ""
fi

if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
    echo ""
fi

# Check if backend .env exists, if not create it from example
if [ ! -f "backend/.env" ]; then
    echo "⚙️  Creating backend .env file from template..."
    cp backend/.env.example backend/.env
fi

echo "═══════════════════════════════════════════════════════════"
echo "Starting TRIP Platform (Frontend & Backend)..."
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start both servers
npm start &
FRONTEND_PID=$!

cd backend && npm start &
BACKEND_PID=$!

# Wait for both processes
wait $FRONTEND_PID $BACKEND_PID
