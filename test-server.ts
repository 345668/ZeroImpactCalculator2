import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "./server/storage.js";
import { performBackup } from "./server/utils/backup.js";
import { testDatabaseConnection } from "./server/database.js";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import compression from "compression";

const app = express();
const TEST_PORT = 5001;

// Trust proxy - required for rate limiting behind proxy
app.set('trust proxy', 1);

// Basic security headers
app.use(helmet());

// Enable gzip compression
app.use(compression());

// Setup request logging
const logDirectory = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const log = `[${timestamp}] ${req.method} ${req.url} - IP: ${req.ip}\n`;
  fs.appendFile(path.join(logDirectory, 'backup-server.log'), log, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Basic security and parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Force JSON content type for all routes
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Configure rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later",
    timestamp: new Date().toISOString()
  }
});

// Apply rate limiting to all routes
app.use(limiter);

// Create router instance for better route organization
const router = express.Router();

// Health check endpoint with enhanced monitoring
router.get("/health", async (_req, res) => {
  try {
    const dbStatus = await testDatabaseConnection();

    const health = {
      status: dbStatus ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      services: {
        database: dbStatus ? "healthy" : "unhealthy",
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

// Backup retention configuration
const BACKUP_RETENTION_DAYS = 30;
const BACKUP_DIR = './backups';

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
}

// Clean old backups
const cleanOldBackups = () => {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const now = new Date();

    files.forEach(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      const daysOld = (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

      if (daysOld > BACKUP_RETENTION_DAYS) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old backup: ${file}`);
      }
    });
  } catch (error) {
    console.error('Error cleaning old backups:', error);
  }
};

// Backup endpoint
router.post("/backup", async (_req, res) => {
  try {
    console.log('Starting backup process...');
    const backupResult = await performBackup();

    console.log('Backup completed:', backupResult);
    res.json({
      success: true,
      message: "Backup completed successfully",
      timestamp: new Date().toISOString(),
      details: backupResult
    });
  } catch (error) {
    console.error('Backup failed:', error);
    res.status(500).json({
      success: false,
      message: "Backup failed",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    });
  }
});

// Mount router at /api
app.use('/api', router);

// Error handling middleware - must be after all routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start the backup server
const startServer = async () => {
  try {
    // Test database connection before starting
    const dbStatus = await testDatabaseConnection();
    if (!dbStatus) {
      throw new Error('Database connection failed');
    }

    app.listen(TEST_PORT, '0.0.0.0', () => {
      console.log(`=== Backup Server started ===`);
      console.log(`Listening on http://0.0.0.0:${TEST_PORT}`);
      console.log('Available endpoints:');
      console.log('- POST /api/backup');
      console.log('- GET /api/health');
      console.log('==============================');
    });
  } catch (error) {
    console.error('Failed to start backup server:', error);
    process.exit(1);
  }
};

// Start the server
startServer().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});