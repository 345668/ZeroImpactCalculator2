import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, log } from "./vite.js";
import { db, testDatabaseConnection } from "./db.js";

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Disable x-powered-by header
app.disable('x-powered-by');

// Enhanced security headers
app.use((req, res, next) => {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  // Production-specific headers
  if (isProduction) {
    // Strict CSP for production
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://*.replit.app https://api.openai.com; " +
      "frame-ancestors 'none'; " +
      "upgrade-insecure-requests;"
    );

    // HSTS header for production
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
});

// Parse JSON and URL-encoded bodies with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Add API route middleware
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Enhanced request logging
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Attach request ID for tracking
  req.requestId = requestId;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    };

    // Production logging
    if (isProduction) {
      // In production, log as JSON for better parsing
      console.log(JSON.stringify(logData));
    } else {
      // Development logging
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Health check endpoint with enhanced checks
app.get("/api/health", async (req, res) => {
  try {
    // Check database connection
    const dbStatus = await testDatabaseConnection();

    const health = {
      status: dbStatus ? "ok" : "error",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      dbConnection: dbStatus ? "healthy" : "unhealthy"
    };

    const status = dbStatus ? 200 : 503;
    res.status(status).json(health);
  } catch (error) {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: isProduction ? "Service unavailable" : error.message
    });
  }
});

// Add health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    // Check database connection
    const dbStatus = await testDatabaseConnection();

    const health = {
      status: dbStatus ? "ok" : "error",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      dbConnection: dbStatus ? "healthy" : "unhealthy"
    };

    const status = dbStatus ? 200 : 503;
    res.status(status).json(health);
  } catch (error) {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: isProduction ? "Service unavailable" : error.message
    });
  }
});

(async () => {
  try {
    console.log(`=== Starting server initialization (Process ID: ${process.pid}) ===`);
    console.log('Environment:', process.env.NODE_ENV);
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

    // Production-grade error handler
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      // Log error details
      console.error('Server error:', {
        requestId: req.requestId,
        error: isProduction ? err.message : err.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });

      // Send safe error response
      res.status(err.status || 500).json({
        error: isProduction ? 'Internal Server Error' : err.message,
        requestId: req.requestId,
        ...(isProduction ? {} : { stack: err.stack })
      });
    });

    // Setup environment-specific middleware
    if (!isProduction) {
      console.log('Setting up Vite for development...');
      await setupVite(app, server);
      console.log('✓ Vite setup complete');
    }

    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen({
      port: PORT,
      host: "0.0.0.0",
    }, () => {
      console.log(`=== Server started successfully ===`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Server is running on port ${PORT}`);
      console.log(`http://0.0.0.0:${PORT}`);
      console.log('===============================');
    }).on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Error: Port ${PORT} is already in use`);
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