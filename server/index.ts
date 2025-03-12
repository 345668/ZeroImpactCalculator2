
import express from "express";
import cors from "cors";
import { testDatabaseConnection } from './db.js';
import { registerRoutes } from './routes.js';

async function main() {
  console.log('Starting Carbon Credit Calculator server...');
  
  try {
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.warn('Warning: Database connection failed, but continuing startup');
    } else {
      console.log('Database connection successful');
    }

    // Create Express application
    const app = express();
    
    // Configure middleware
    app.use(cors());
    app.use(express.json());
    
    // Register all routes
    const server = await registerRoutes(app);
    
    // Start the server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://0.0.0.0:${PORT}`);
      console.log('Server started successfully');
    });
    
    // Handle termination signals
    process.on('SIGINT', () => {
      console.log('Shutting down server gracefully');
      server.close(() => {
        console.log('Server shut down');
        process.exit(0);
      });
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
