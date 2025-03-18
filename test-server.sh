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