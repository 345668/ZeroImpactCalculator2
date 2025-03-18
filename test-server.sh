#!/bin/bash

echo "Starting API Test Server..."

# Function to cleanup background processes
cleanup() {
    echo "Cleaning up..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
    fi
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGINT SIGTERM

# Kill any existing process on port 5001
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
    echo "Port 5001 is in use. Attempting to free it..."
    lsof -Pi :5001 -sTCP:LISTEN -t | xargs kill
    sleep 2
fi

# Export test server port
export TEST_SERVER_PORT=5001

# Valid payload for testing
VALID_PAYLOAD='{
  "firstName": "Test",
  "lastName": "User",
  "email": "test@example.com",
  "address": "123 Test St",
  "buildingOwnership": "owned",
  "buildingSize": 150,
  "heatingSystem": "gas",
  "currentConsumption": 20000,
  "projectedConsumption": 10000,
  "acceptedTerms": true,
  "gdprConsent": true
}'

# Start the test server in the background
echo "Launching test server..."
tsx test-server.ts &
SERVER_PID=$!

# Wait for server to start (max 10 seconds)
for i in {1..10}; do
    if curl -s http://localhost:5001/health > /dev/null; then
        break
    fi
    sleep 1
    if [ $i -eq 10 ]; then
        echo "Error: Server failed to start within 10 seconds"
        cleanup
        exit 1
    fi
done

echo "Test server started successfully. Running test suite..."

# Test health endpoint
echo -e "\n1. Testing Health Check Endpoint..."
curl -s http://localhost:5001/health | jq '.'

# Test backup endpoint
echo -e "\n2. Testing Backup Functionality..."
curl -s -X POST \
     -H "Content-Type: application/json" \
     http://localhost:5001/test-backup | jq '.'

# Test Error Handling
echo -e "\n3. Testing Error Handling..."
echo -e "\nTesting with invalid JSON:"
curl -i -H "Content-Type: application/json" \
     -d "{invalid_json" \
     -X POST http://localhost:5001/api/calculate

echo -e "\nTesting with missing required fields:"
curl -i -H "Content-Type: application/json" \
     -d '{"firstName": "Test"}' \
     -X POST http://localhost:5001/api/calculate

echo -e "\nTesting with invalid email format:"
curl -i -H "Content-Type: application/json" \
     -d "${VALID_PAYLOAD/test@example.com/invalid-email}" \
     -X POST http://localhost:5001/api/calculate

echo -e "\nServer is running on port 5001. Press Ctrl+C to stop."
wait $SERVER_PID