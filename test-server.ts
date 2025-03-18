import express, { type Express } from "express";
import { performBackup } from "./server/utils/backup.js";
import { testDatabaseConnection } from "./server/database.js";
import { EmailService } from "./server/services/email.js";
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

console.log(`=== Starting server initialization (Process ID: ${process.pid}) ===`);
console.log('Environment:', process.env.NODE_ENV);
console.log('Node Version:', process.version);

// Basic security and parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.set('trust proxy', 1);

// Production security
if (isProduction) {
  app.use(helmet());
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });
  app.use('/api', apiLimiter);
}

// API Routes
const apiRouter = express.Router();

// Health check endpoint
apiRouter.get("/health", async (_req, res) => {
  try {
    const dbStatus = await testDatabaseConnection();
    let emailStatus = "unknown";

    try {
      await EmailService.sendTestEmail(process.env.ADMIN_EMAIL || "test@example.com");
      emailStatus = "healthy";
    } catch (error) {
      emailStatus = "unhealthy";
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
      uptime: process.uptime()
    };

    res.status(health.status === "healthy" ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

// Backup endpoint
apiRouter.post("/backup", async (_req, res) => {
  try {
    await performBackup();
    res.json({
      success: true,
      message: "Backup completed successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Backup failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Mount API router
app.use('/api', apiRouter);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: "Test API Server",
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV,
    endpoints: ["/api/health", "/api/backup"]
  });
});

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n=== Server Started Successfully ===');
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Port: ${PORT}`);
  console.log(`Process ID: ${process.pid}`);
  console.log('\nAvailable endpoints:');
  console.log('- GET /');
  console.log('- GET /api/health');
  console.log('- POST /api/backup');
  console.log('==============================\n');
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown();
});