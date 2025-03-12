const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Checking for existing processes on ports...');

try {
  console.log('Starting Carbon Credit Calculator application...');
  // Run both frontend and backend
  execSync('npm run dev', { 
    stdio: 'inherit',
    env: { ...process.env, PORT: '3000' }
  });
} catch (error) {
  console.error('Error starting application:', error);
  process.exit(1);
}