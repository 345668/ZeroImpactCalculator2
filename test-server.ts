import express, { type Express } from "express";
import { storage } from "./server/storage.js";
import { performBackup } from "./server/utils/backup.js";
import { testDatabaseConnection } from "./server/database.js";
import { EmailService } from "./server/services/email.js";
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = 5001; // Force port 5001
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds
const isProduction = process.env.NODE_ENV === 'production';

console.log(`=== Starting server initialization (Process ID: ${process.pid}) ===`);
console.log('Environment:', process.env.NODE_ENV);
console.log('Node Version:', process.version);

// Basic security and parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Production security
if (isProduction) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://*.replit.app", "https://api.openai.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    }
  }));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
  });

  app.use('/api', apiLimiter);
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

// API Routes
const apiRouter = express.Router();

// Production-ready backup endpoint
apiRouter.post("/backup", async (_req, res) => {
  console.log('[Backup] Starting backup process...');
  try {
    await performBackup();
    res.json({ 
      success: true, 
      message: "Backup completed successfully",
      timestamp: new Date().toISOString()
    });
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

// Enhanced health check endpoint
apiRouter.get("/health", async (_req, res) => {
  console.log('[Health] Starting health check...');
  try {
    const dbStatus = await testDatabaseConnection();
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

// Mount API router with explicit content type and CORS
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
}, apiRouter);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: "Carbon Credit Calculator Test API Server",
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV,
    endpoints: [
      "/api/health",
      "/api/backup"
    ]
  });
});

(async () => {
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      console.log(`Starting server attempt ${retryCount + 1}/${MAX_RETRIES}...`);

      const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n=== Test API Server started successfully ===`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
        console.log(`Internal port: ${PORT}`);
        console.log(`External port: 3001`);
        console.log(`Server URL: http://0.0.0.0:${PORT}`);
        console.log(`Process ID: ${process.pid}`);
        console.log('\nAvailable endpoints:');
        console.log('- GET /');
        console.log('- GET /api/health');
        console.log('- POST /api/backup');
        console.log('==============================\n');
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        server.close(() => {
          console.log('HTTP server closed');
          process.exit(0);
        });
      });

      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        server.close(() => {
          console.log('Server closed due to uncaught exception');
          process.exit(1);
        });
      });
      break; // Server started successfully
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is busy, retrying in ${RETRY_DELAY/1000} seconds... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        retryCount++;
      } else {
        console.error('Fatal error during server startup:', error);
        process.exit(1);
      }
    }
  }

  if (retryCount >= MAX_RETRIES) {
    console.error(`Failed to start server after ${MAX_RETRIES} retries`);
    process.exit(1);
  }
})().catch((error) => {
  console.error('Unhandled error during startup:', error);
  process.exit(1);
});