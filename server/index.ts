import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, log } from "./vite.js";
import { db, testDatabaseConnection } from "./db.js";
import { performBackup } from "./utils/backup.js";

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Disable x-powered-by header
app.disable('x-powered-by');

// Parse JSON and URL-encoded bodies with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// API route handling middleware - must come before any static/frontend middleware
app.use('/api', (req, res, next) => {
  // Force JSON content type for all API routes
  res.setHeader('Content-Type', 'application/json');
  next();
});

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

// Enhanced request logging
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Attach request ID for tracking
  (req as any).requestId = requestId;

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

    // Initial backup on startup
    if (process.env.NODE_ENV === 'production') {
      try {
        await performBackup();
        console.log('✓ Initial backup completed');

        // Schedule daily backups at 2 AM
        setInterval(async () => {
          const now = new Date();
          if (now.getHours() === 2 && now.getMinutes() === 0) {
            console.log('Starting scheduled backup...');
            await performBackup();
          }
        }, 60000); // Check every minute
      } catch (error) {
        console.error('Backup system initialization failed:', error);
      }
    }

    // Register routes first (API endpoints)
    console.log('Registering routes...');
    const server = await registerRoutes(app);
    console.log('✓ Routes registered successfully');

    // Setup environment-specific middleware last
    if (!isProduction) {
      console.log('Setting up Vite for development...');
      await setupVite(app);
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