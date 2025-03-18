#!/bin/bash

echo "Starting test server deployment..."

# Kill any process using ports 5000 and 5001
echo "Cleaning up ports..."
for port in 5000 5001; do
  pid=$(lsof -t -i:$port)
  if [ ! -z "$pid" ]; then
    echo "Stopping process on port $port (PID: $pid)"
    kill -9 $pid 2>/dev/null
  fi
done

# Make sure npm processes are stopped
pkill -f "npm run dev" 2>/dev/null

# Wait for ports to clear
echo "Waiting for ports to clear..."
sleep 3

# Check if ports are clear
for port in 5000 5001; do
  if lsof -i:$port >/dev/null 2>&1; then
    echo "ERROR: Port $port is still in use"
    exit 1
  fi
done

echo "Starting test server..."
NODE_ENV=production tsx test-server.ts