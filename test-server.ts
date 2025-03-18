import express, { type Express } from "express";
import { storage } from "./server/storage.js";
import { performBackup } from "./server/utils/backup.js";
import { testDatabaseConnection } from "./server/database.js";
import { EmailService } from "./server/services/email.js";
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 5001;
const isProduction = process.env.NODE_ENV === 'production';

console.log('=== Server Configuration ===');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Process PID:', process.pid);
console.log('========================');

// Basic security and parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Production security
if (isProduction) {
  app.use(helmet());
}

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} completed in ${Date.now() - start}ms with status ${res.statusCode}`);
  });
  next();
});

// Force JSON content type for all routes
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // limit each IP
  message: { error: 'Too many requests, please try again later.' }
});

// Apply rate limiting to all routes in production
if (isProduction) {
  app.use(apiLimiter);
}

// API Routes
const apiRouter = express.Router();

// Test backup endpoint
apiRouter.post("/backup", async (_req, res) => {
  console.log('[Backup] Starting backup process...');
  try {
    console.log('Manual backup test initiated');
    await performBackup();
    const response = { 
      success: true, 
      message: "Backup completed successfully",
      timestamp: new Date().toISOString()
    };
    console.log('[Backup] Success:', response);
    res.json(response);
  } catch (error) {
    console.error('[Backup] Failed:', error);
    res.status(500).json({
      success: false,
      message: "Backup failed",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
apiRouter.get("/health", async (_req, res) => {
  console.log('[Health] Starting health check...');
  try {
    // Check database connection
    const dbStatus = await testDatabaseConnection();

    // Check email service
    let emailStatus = "unknown";
    try {
      await EmailService.sendTestEmail(process.env.ADMIN_EMAIL || "test@example.com");
      emailStatus = "healthy";
    } catch (error) {
      emailStatus = "unhealthy";
      console.error('[Health] Email service check failed:', error);
    }

    const health = {
      status: dbStatus && emailStatus === "healthy" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      services: {
        database: dbStatus ? "healthy" : "unhealthy",
        email: emailStatus,
      },
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };

    const statusCode = health.status === "healthy" ? 200 : 503;
    console.log('[Health] Check completed:', health);
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('[Health] Check failed:', error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

// Mount API router
app.use('/api', apiRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Test server error:', err);
  res.status(500).json({
    error: isProduction ? "Internal server error" : err.message,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: "Carbon Credit Calculator API Server",
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV,
    endpoints: [
      "/api/health",
      "/api/backup"
    ]
  });
});

// Start the server
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=== Production API Server started ===`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Internal port: ${PORT}`);
    console.log(`External port: ${PORT === 5001 ? 3001 : PORT}`);
    console.log(`Server URL: http://0.0.0.0:${PORT}`);
    console.log('\nAvailable endpoints:');
    console.log('- GET /');
    console.log('- GET /api/health');
    console.log('- POST /api/backup');
    console.log('==============================\n');
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}