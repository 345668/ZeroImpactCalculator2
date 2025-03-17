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

// Basic security and parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Production security
if (isProduction) {
  app.use(helmet());
}

// Force JSON content type for all routes in test server
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

// Test backup endpoint
app.post("/test-backup", async (_req, res) => {
  try {
    console.log('Manual backup test initiated');
    await performBackup();
    res.json({ 
      success: true, 
      message: "Backup completed successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Manual backup test failed:', error);
    res.status(500).json({
      success: false,
      message: "Backup failed",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get("/health", async (_req, res) => {
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
      console.error('Email service health check failed:', error);
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
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Test server error:', err);
  res.status(500).json({
    error: isProduction ? "Internal server error" : err.message,
    timestamp: new Date().toISOString()
  });
});

// Start the test server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=== API Server started ===`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Listening on http://0.0.0.0:${PORT}`);
  console.log('Available endpoints:');
  console.log('- POST /test-backup');
  console.log('- GET /health');
  console.log('==============================');
});