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
# Start the test server in production mode
NODE_ENV=production tsx test-server.ts