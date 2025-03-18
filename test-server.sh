#!/bin/bash

echo "Testing server configuration..."

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
curl -i \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
     http://localhost:5001/health

echo "\n2. Testing Backup Endpoint..."
curl -i \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
     -X POST \
     http://localhost:5001/api/test-backup

echo "\n3. Testing Rate Limiting with Valid Payload..."
for i in {1..3}; do
  echo "\nRequest $i:"
  curl -i \
       -H "Accept: application/json" \
       -H "Content-Type: application/json" \
       -d "$VALID_PAYLOAD" \
       -X POST \
       http://localhost:5001/api/calculate
  sleep 1
done

echo "\n4. Testing Error Handling..."
echo "\nTesting with invalid JSON:"
curl -i \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
     -d "{invalid_json" \
     -X POST \
     http://localhost:5001/api/calculate

echo "\nTesting with missing required fields:"
curl -i \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
     -d '{"firstName": "Test"}' \
     -X POST \
     http://localhost:5001/api/calculate

echo "\nTesting with invalid email format:"
curl -i \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
     -d "${VALID_PAYLOAD/test@example.com/invalid-email}" \
     -X POST \
     http://localhost:5001/api/calculate