#!/bin/bash

echo "Testing server configuration..."

# Kill any process using ports 5000 and 5001
echo "Cleaning up ports..."
for port in 5000 5001; do
  pid=$(lsof -t -i:$port)
  if [ ! -z "$pid" ]; then
    echo "Stopping process on port $port (PID: $pid)"
    kill -9 $pid 2>/dev/null
  fi
done

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

echo "\n1. Testing Health Check Endpoint..."
curl -i http://0.0.0.0:5000/api/health

echo "\n2. Testing Rate Limiting with Valid Payload..."
for i in {1..12}; do
  echo "\nRequest $i:"
  curl -i -H "Content-Type: application/json" \
       -d "$VALID_PAYLOAD" \
       -X POST http://0.0.0.0:5000/api/calculate
  sleep 1
done

echo "\n3. Testing Error Handling..."
echo "\nTesting with invalid JSON:"
curl -i -H "Content-Type: application/json" \
     -d "{invalid_json" \
     -X POST http://0.0.0.0:5000/api/calculate

echo "\nTesting with missing required fields:"
curl -i -H "Content-Type: application/json" \
     -d '{"firstName": "Test"}' \
     -X POST http://0.0.0.0:5000/api/calculate

echo "\nTesting with invalid email format:"
curl -i -H "Content-Type: application/json" \
     -d "${VALID_PAYLOAD/test@example.com/invalid-email}" \
     -X POST http://0.0.0.0:5000/api/calculate