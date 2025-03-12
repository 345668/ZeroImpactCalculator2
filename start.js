
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Checking for existing processes on ports...');

try {
  // Kill any existing processes on port 3000
  try {
    const output = execSync('lsof -i :3000 -t');
    if (output) {
      console.log('Found existing process on port 3000, terminating...');
      execSync('kill -9 $(lsof -i :3000 -t)', { stdio: 'inherit' });
    }
  } catch (e) {
    // No processes running on port 3000
  }

  console.log('Starting Carbon Credit Calculator application...');
  // Use spawn instead of execSync to prevent blocking
  const process = spawn('npm', ['run', 'dev'], { 
    stdio: 'inherit',
    env: { ...process.env, PORT: '3000' }
  });
  
  process.on('error', (error) => {
    console.error('Error starting application:', error);
  });
  
} catch (error) {
  console.error('Error during startup:', error);
  process.exit(1);
}
