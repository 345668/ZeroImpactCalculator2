import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, log } from "./vite.js";
import { db, testDatabaseConnection } from "./db.js";

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
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
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
      console.error('Server error:', err);
      res.status(500).json({ 
        message: err.message || "Internal Server Error"
      });
    });

    // Setup environment-specific middleware
    const env = app.get("env");
    log(`Setting up server for ${env} environment...`);

    if (env === "development") {
      log('Setting up Vite for development...');
      await setupVite(app, server);
      log('Vite setup complete');
    }

    // Try different ports if 5000 is in use
    const tryPort = async (port: number): Promise<void> => {
      try {
        log(`Attempting to start server on port ${port}...`);
        await new Promise<void>((resolve, reject) => {
          server.listen({
            port,
            host: "0.0.0.0",
          }, () => {
            log(`Server started successfully on port ${port}`);
            resolve();
          }).once('error', (err) => {
            log(`Error starting server on port ${port}: ${err.message}`);
            reject(err);
          });
        });
      } catch (error: any) {
        if (error.code === 'EADDRINUSE' && port < 5010) {
          log(`Port ${port} in use, trying ${port + 1}...`);
          await tryPort(port + 1);
        } else {
          throw error;
        }
      }
    };

    await tryPort(5000);

  } catch (error) {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
})();