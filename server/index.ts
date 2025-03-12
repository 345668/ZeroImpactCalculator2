import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { db, testDatabaseConnection } from "./db.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Disable x-powered-by header
app.disable('x-powered-by');

// Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add API route middleware to ensure proper Content-Type
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Add health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

(async () => {
  try {
    log('Starting server initialization...');

    // Test database connection first
    log('Testing database connection...');
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }
    log('Database connection successful');

    // Register routes and get http server
    log('Registering routes...');
    const server = await registerRoutes(app);
    log('Routes registered successfully');

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error('Server error:', err);
      res.status(status).json({ message });
    });

    // Serve static files if the dist directory exists
    const distPath = path.join(__dirname, "../dist/public");
    
    // Check if the dist directory exists
    if (fs.existsSync(distPath)) {
      log('Static files directory found, serving static content');
      app.use(express.static(distPath));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
          return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      log('Static files directory not found, skipping static file serving');
      // For non-API routes, return a simple message indicating build is needed
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
          return next();
        }
        res.status(200).send('Server is running in development mode. Please build the client first with "npm run build" or use the development server.');
      });
    }

    // Start server with improved logging
    let port = 5000; // Primary port
    const tryStartServer = (retryPort = false) => {
      if (retryPort) {
        port = 3000; // Fallback port
      }
      
      log(`Attempting to start server on port ${port}...`);
      
      const server_instance = server.listen({
        port,
        host: "0.0.0.0",
      }, () => {
        log(`Server successfully started and listening on port ${port}`);
      });

      server_instance.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          log(`Port ${port} is already in use.`);
          if (!retryPort) {
            log(`Trying fallback port...`);
            tryStartServer(true);
          } else {
            log(`All ports are in use. Please free a port before starting the server.`);
            process.exit(1);
          }
        } else {
          console.error('Server error:', error);
          process.exit(1);
        }
      });
    };
    
    tryStartServer();

  } catch (error) {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
})();