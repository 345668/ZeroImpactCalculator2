// This file is used by the workflow to start our test server
const { spawn } = require('child_process');
const { exec } = require('child_process');

// Kill any existing npm processes
exec('pkill -f "npm run dev"', (error) => {
  if (error) {
    console.log('No existing processes to kill');
  }

  // Start our test server
  const server = spawn('tsx', ['test-server.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '5000'
    }
  });

  server.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down server...');
    server.kill();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down server...');
    server.kill();
    process.exit(0);
  });
});