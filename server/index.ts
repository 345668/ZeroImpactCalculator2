import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { log } from "./vite.js";

const app = express();

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add API route middleware to ensure proper Content-Type
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Basic health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

try {
  const port = 5000;
  log(`Attempting to start server on port ${port}...`);

  // Register routes
  log('Registering routes...');
  const server = await registerRoutes(app);
  log('Routes registered successfully');

  server.listen(port, "0.0.0.0", () => {
    log(`Server started successfully on port ${port}`);
  });

  server.on("error", (error: any) => {
    if (error.code === "EADDRINUSE") {
      log(`Error: Port ${port} is already in use. Please free it before starting the server.`);
    } else {
      console.error("Server error:", error);
    }
    process.exit(1);
  });
} catch (error) {
  console.error("Fatal error during server startup:", error);
  process.exit(1);
}