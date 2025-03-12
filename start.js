
/**
 * Application startup script for Carbon Credit Calculator
 * This script helps manage the application lifecycle and port usage
 */

const { spawn, exec } = require('child_process');
const os = require('os');

// Kill any existing process using port 5000 or 3001
console.log('Checking for existing processes on ports 5000 and 3001...');

const isWindows = os.platform() === 'win32';

if (isWindows) {
  exec('netstat -ano | findstr :5000', (err, stdout) => {
    if (stdout) {
      const pidMatch = stdout.match(/LISTENING\s+(\d+)/);
      if (pidMatch && pidMatch[1]) {
        exec(`taskkill /F /PID ${pidMatch[1]}`, () => {
          console.log(`Killed process using port 5000`);
        });
      }
    }
  });
} else {
  exec('lsof -i :5000 -t', (err, stdout) => {
    if (stdout) {
      const pid = stdout.trim();
      if (pid) {
        exec(`kill -9 ${pid}`, () => {
          console.log(`Killed process ${pid} using port 5000`);
        });
      }
    }
  });
}

// Start the application
console.log('Starting Carbon Credit Calculator application...');
const npmRun = spawn('npm', ['run', 'dev'], { stdio: 'inherit' });

npmRun.on('close', (code) => {
  console.log(`Application process exited with code ${code}`);
});

// Handle clean shutdown
process.on('SIGINT', () => {
  console.log('Shutting down application gracefully...');
  npmRun.kill('SIGINT');
  process.exit(0);
});
