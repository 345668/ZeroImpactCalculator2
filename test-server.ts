import express, { type Express } from "express";
import { storage } from "./server/storage.js";
import { performBackup } from "./server/utils/backup.js";
import { testDatabaseConnection } from "./server/database.js";
import { EmailService } from "./server/services/email.js";

const app = express();
const TEST_PORT = 5001;

// Basic security and parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

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
  next();
});

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
    error: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start the test server
app.listen(TEST_PORT, '0.0.0.0', () => {
  console.log(`=== API Test Server started ===`);
  console.log(`Listening on http://0.0.0.0:${TEST_PORT}`);
  console.log('Available endpoints:');
  console.log('- POST /test-backup');
  console.log('- GET /health');
  console.log('==============================');
});
