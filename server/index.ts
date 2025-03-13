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
    log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Add health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

(async () => {
  try {
    console.log('=== Starting server initialization (Process ID:', process.pid, ') ===');
    console.log('Environment:', app.get('env'));
    console.log('Node Version:', process.version);

    // Test database connection first
    console.log('Testing database connection...');
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }
    console.log('✓ Database connection successful');

    // Register routes and get http server
    console.log('Registering routes...');
    const server = await registerRoutes(app);
    console.log('✓ Routes registered successfully');

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      res.status(500).json({ 
        message: err.message || "Internal Server Error"
      });
    });

    // Setup environment-specific middleware
    const env = app.get("env");
    console.log(`Setting up server for ${env} environment...`);

    if (env === "development") {
      console.log('Setting up Vite for development...');
      await setupVite(app, server);
      console.log('✓ Vite setup complete');
    }

    // Start server on port 5000
    const PORT = 5000;
    console.log(`Starting server on port ${PORT}...`);

    server.listen({
      port: PORT,
      host: "0.0.0.0",
    }, () => {
      console.log(`=== Server started successfully ===`);
      console.log(`Server is running on port ${PORT}`);
      console.log(`http://0.0.0.0:${PORT}`);
      console.log('===============================');
    }).on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Error: Port ${PORT} is already in use. Please ensure no other application is using this port.`);
        process.exit(1);
      } else {
        console.error('Fatal error during server startup:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('=== Fatal error during server startup ===');
    console.error(error);
    process.exit(1);
  }
})();