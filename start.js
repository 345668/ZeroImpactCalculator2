
import { spawn, execSync } from 'child_process';
import path from 'path';

console.log('Starting Carbon Credit Calculator application...');

// Kill any existing processes that might be using our ports
try {
  // Check for processes on port 3000
  try {
    execSync('lsof -i :3000 -t').toString().trim().split('\n').forEach(pid => {
      if (pid) {
        console.log(`Killing process ${pid} on port 3000`);
        try { execSync(`kill -9 ${pid}`); } catch (e) {}
      }
    });
  } catch (e) {
    // No processes on port 3000
  }
  
  // Check for processes on port 5000
  try {
    execSync('lsof -i :5000 -t').toString().trim().split('\n').forEach(pid => {
      if (pid) {
        console.log(`Killing process ${pid} on port 5000`);
        try { execSync(`kill -9 ${pid}`); } catch (e) {}
      }
    });
  } catch (e) {
    // No processes on port 5000
  }

  // Start the application
  console.log('Starting application with clean environment...');
  const app = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    env: { 
      ...process.env, 
      PORT: '5173',
      // Force Node to use a single thread which can be more stable in Replit
      NODE_OPTIONS: '--max-old-space-size=2048'
    }
  });

  app.on('error', (error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });

  app.on('close', (code) => {
    if (code !== 0) {
      console.error(`Application process exited with code ${code}`);
      process.exit(code);
    }
  });

  // Handle termination signals
  process.on('SIGINT', () => {
    console.log('Shutting down application...');
    app.kill();
  });

} catch (error) {
  console.error('Error during startup:', error);
  process.exit(1);
}
