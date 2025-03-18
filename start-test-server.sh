#!/bin/bash

# Kill any process using port 5001 if exists
fuser -k 5001/tcp 2>/dev/null

# Start the test server
NODE_ENV=production tsx test-server.ts
