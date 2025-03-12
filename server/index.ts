import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite } from "./vite.js";
import { db, testDatabaseConnection } from "./db.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Add API route middleware
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Simple request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Add health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

(async () => {
  try {
    console.log('Starting minimal server on port 5000...');

    // Test database connection
    console.log('Testing database connection...');
    await testDatabaseConnection();
    console.log('Database connection successful');

    // Register routes and get http server
    const server = await registerRoutes(app);

    // Set up development mode with Vite
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log('Setting up Vite for development mode');
      await setupVite(app, server);
    } else {
      // Production mode - serve static files
      console.log('Setting up static file serving for production');
      const distPath = path.join(__dirname, "../dist/public");

      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (req, res, next) => {
          if (req.path.startsWith('/api')) {
            return next();
          }
          const indexPath = path.join(distPath, 'index.html');
          if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
          } else {
            res.status(404).send('Index file not found');
          }
        });
      } else {
        console.log(`Warning: Production build directory not found at ${distPath}`);
      }
    }

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      res.status(500).json({ message: "Internal Server Error" });
    });

    // Start server
    const port = 5000;
    server.listen(port, "0.0.0.0", () => {
      console.log(`Server successfully started and listening on port ${port}`);
    });

  } catch (error) {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
})();