#!/bin/bash

echo "Starting test server deployment..."

# Kill any running processes first
pkill -f "npm run dev" 2>/dev/null

# Kill any remaining processes on our ports
for port in $(seq 5000 5005); do
  pid=$(lsof -t -i:$port 2>/dev/null)
  if [ ! -z "$pid" ]; then
    echo "Stopping process on port $port (PID: $pid)"
    kill -9 $pid 2>/dev/null
  fi
done

# Wait for ports to clear
echo "Waiting for ports to clear..."
sleep 3

# Start the test server in production mode
echo "Starting test server..."
NODE_ENV=production VITE_BUILD=false tsx test-server.ts