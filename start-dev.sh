#!/bin/bash
# TRIP Platform - Development Server Starter
# Starts both frontend and backend servers concurrently

set -e

print_divider() {
    echo "==========================================================="
}

cleanup() {
    local exit_code=$?
    trap - INT TERM EXIT

    if [ -n "${FRONTEND_PID:-}" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi

    if [ -n "${BACKEND_PID:-}" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi

    exit "$exit_code"
}

trap cleanup INT TERM EXIT

print_divider
echo "   TRIP - Tanzania Readmission Intelligence Platform"
print_divider
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "OK: Node.js detected: $(node -v)"
echo ""

NODE_VERSION_RAW=$(node -v | sed 's/^v//')
NODE_MAJOR=$(printf '%s' "$NODE_VERSION_RAW" | cut -d. -f1)
NODE_MINOR=$(printf '%s' "$NODE_VERSION_RAW" | cut -d. -f2)

if [ "$NODE_MAJOR" -lt 20 ] || { [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -lt 19 ]; }; then
    echo "ERROR: Node.js $NODE_VERSION_RAW is unsupported."
    echo "       TRIP requires Node.js 20.19.0 or newer."
    exit 1
fi

# Install dependencies if node_modules is missing or incomplete
if [ ! -x "node_modules/.bin/vite" ]; then
    echo "Installing frontend dependencies..."
    npm install
    echo ""
fi

if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    (
        cd backend
        npm install
    )
    echo ""
fi

# Check if backend .env exists, if not create it from example
if [ ! -f "backend/.env" ]; then
    echo "Creating backend .env file from template..."
    cp backend/.env.example backend/.env
fi

print_divider
echo "Starting TRIP Platform (Frontend & Backend)..."
print_divider
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start both servers
npm start &
FRONTEND_PID=$!

(
    cd backend
    npm start
) &
BACKEND_PID=$!

# Wait for both processes
wait $FRONTEND_PID $BACKEND_PID
