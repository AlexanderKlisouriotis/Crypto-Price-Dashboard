#!/bin/bash

set -e  # Exit on error

echo "🧹 Cleaning up any root node_modules..."
rm -rf node_modules

echo "📦 Installing dependencies..."
pnpm install --recursive

echo "🔧 Generating ConnectRPC code..."
cd server
pnpm run generate
cd ..

echo "🏗️ Building backend..."
cd server
pnpm run build
cd ..

echo "🚀 Starting backend server..."
cd server

# Kill any existing processes on port 8080
echo "🛑 Cleaning up any existing processes on port 8080..."
pkill -f "node.*8080" || true
sleep 2

# Start the server with explicit output
echo "🔊 Starting server with debug output..."
pnpm run dev > server.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start with better debugging
echo "⏳ Waiting for backend to start..."
for i in {1..10}; do
  if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Backend server is running successfully"
    break
  fi
  echo "⏰ Waiting for backend... attempt $i/10"
  sleep 3
done

# Check server logs for errors
echo "📋 Server logs:"
cat server/server.log || echo "No server log file found"

if ! curl -f http://localhost:8080/health > /dev/null 2>&1; then
  echo "❌ Backend server failed to start"
  cat server/server.log
  kill $BACKEND_PID 2>/dev/null || true
  exit 1
fi

echo "🌐 Starting frontend server..."
cd client
pnpm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "🎉 Application is starting up..."
echo "   Backend: http://localhost:8080"
echo "   Frontend: http://localhost:3000"
echo "   Backend logs: server/server.log"
echo "   Frontend logs: frontend.log"
echo ""
echo "Press Ctrl+C to stop servers"

# Function to cleanup processes on exit
cleanup() {
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "✅ Cleanup complete"
    exit 0
}

# Set trap to cleanup on SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait