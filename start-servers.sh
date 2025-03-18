#!/bin/bash

echo "Starting both development and test servers..."

# Start the main development server in the background
npm run dev &
DEV_PID=$!

# Wait for the main server to start
echo "Waiting for main server to initialize..."
sleep 5

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
TEST_PORT=5001 NODE_ENV=production tsx test-server.ts &
TEST_PID=$!

# Wait for the test server to start
echo "Waiting for test server to initialize..."
sleep 5

# Monitor both processes
echo "Both servers started:"
echo "Main server PID: $DEV_PID"
echo "Test server PID: $TEST_PID"

# Handle cleanup on script exit
cleanup() {
  echo "Shutting down servers..."
  kill $DEV_PID 2>/dev/null
  kill $TEST_PID 2>/dev/null
  exit 0
}

trap cleanup SIGINT SIGTERM

# Keep the script running
wait