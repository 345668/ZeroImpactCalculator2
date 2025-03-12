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

    // Serve static files
    const distPath = path.join(__dirname, "../client");
    
    // Check if we're in development or production mode
    const isDev = process.env.NODE_ENV !== 'production';
    
    if (!isDev) {
      // In production, serve from dist directory if it exists
      const prodDistPath = path.join(__dirname, "../dist/public");
      if (fs.existsSync(prodDistPath)) {
        app.use(express.static(prodDistPath));
        app.get('*', (req, res, next) => {
          if (req.path.startsWith('/api')) {
            return next();
          }
          res.sendFile(path.join(prodDistPath, 'index.html'));
        });
      } else {
        console.warn("Production build directory not found. Using development mode.");
        // Fall back to development setup below
      }
    } else {
      // We're in development, so we'll let Vite handle the static files
      console.log("Running in development mode - Vite will handle static files");
    }

    // Start server with improved logging
    const port = 5000; // Always use port 5000 for Replit workflow
    log(`Attempting to start server on port ${port}...`);

    const server_instance = server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`Server successfully started and listening on port ${port}`);
    });

    server_instance.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        log(`Error: Port ${port} is already in use. Please free it before starting the server.`);
        process.exit(1);
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
})();