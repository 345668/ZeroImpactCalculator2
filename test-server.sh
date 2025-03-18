#!/bin/bash

echo "Testing backup server configuration..."

echo "\n1. Testing Health Check Endpoint..."
curl -i \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
     http://localhost:5001/api/health

sleep 2

echo "\n2. Testing Backup Endpoint..."
curl -i \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
     -X POST \
     http://localhost:5001/api/backup

sleep 2

echo "\n3. Testing Error Handling..."
echo "\nTesting with invalid request:"
curl -i \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
     -d "{invalid_json" \
     -X POST \
     http://localhost:5001/api/backup

sleep 2

echo "\n4. Testing Rate Limiting..."
for i in {1..3}; do
  echo "\nRequest $i:"
  curl -i \
       -H "Accept: application/json" \
       -H "Content-Type: application/json" \
       -X POST \
       http://localhost:5001/api/backup
  sleep 1
done

echo "\n5. Checking Security Headers..."
curl -I \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
     http://localhost:5001/api/health

echo "\n6. Testing Compression..."
curl -i \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
     -H "Accept-Encoding: gzip" \
     http://localhost:5001/api/health