
// Application startup script for Carbon Credit Calculator
import { spawn, exec } from 'child_process';
import { platform } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Kill any existing process using ports
console.log('Checking for existing processes on ports...');

// Kill processes based on OS
const isWindows = platform() === 'win32';
const killProcess = (port) => {
  if (isWindows) {
    exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
      if (stdout) {
        const pidMatch = stdout.match(/LISTENING\s+(\d+)/);
        if (pidMatch && pidMatch[1]) {
          exec(`taskkill /F /PID ${pidMatch[1]}`, () => {
            console.log(`Killed process using port ${port}`);
          });
        }
      }
    });
  } else {
    exec(`lsof -i :${port} -t`, (err, stdout) => {
      if (stdout) {
        const pid = stdout.trim();
        if (pid) {
          exec(`kill -9 ${pid}`, () => {
            console.log(`Killed process ${pid} using port ${port}`);
          });
        }
      }
    });
  }
};

// Kill processes on all ports we might be using
[5000, 3001, 3000].forEach(killProcess);

setTimeout(() => {
  // Start the application with Vite dev server
  console.log('Starting Carbon Credit Calculator application...');
  const npmRun = spawn('npm', ['run', 'dev'], { 
    stdio: 'inherit',
    env: {
      ...process.env,
      // Force Vite to bind to 0.0.0.0 instead of localhost
      HOST: '0.0.0.0',
      // Ensure server uses correct port
      PORT: '5000'
    }
  });

  npmRun.on('close', (code) => {
    console.log(`Application process exited with code ${code}`);
  });

  // Handle clean shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down application gracefully...');
    npmRun.kill('SIGINT');
    process.exit(0);
  });
}, 1000); // Wait 1 second for ports to be released
