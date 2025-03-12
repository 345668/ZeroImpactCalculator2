
import express from "express";
import cors from "cors";
import { testDatabaseConnection } from './db.js';
import { registerRoutes } from './routes.js';
import { setupVite, serveStatic, log } from './vite.js';

async function main() {
  log('Starting Carbon Credit Calculator server...');
  
  try {
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.warn('Warning: Database connection failed, but continuing startup');
    } else {
      log('Database connection successful');
    }

    // Create Express application
    const app = express();
    
    // Configure middleware
    app.use(cors());
    app.use(express.json());
    
    // Set up Vite dev server in development mode or serve static files in production
    if (process.env.NODE_ENV === 'production') {
      serveStatic(app);
      log('Running in production mode - serving static files');
    } else {
      await setupVite(app);
      log('Running in development mode - Vite middleware activated');
    }
    
    // Register all routes
    const server = await registerRoutes(app);
    
    // Start the server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
      log(`Server running at http://0.0.0.0:${PORT}`);
      log('Server started successfully');
    });
    
    // Handle termination signals
    process.on('SIGINT', () => {
      log('Shutting down server gracefully');
      server.close(() => {
        log('Server shut down');
        process.exit(0);
      });
    });

    process.on('uncaughtException', (error) => {
      log(`Uncaught exception: ${error.message}`);
      console.error(error);
    });
    
  } catch (error) {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  }
}

// Execute the main function
main().catch(error => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
});
