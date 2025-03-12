import express from "express";
import { registerRoutes } from "./routes.js";
import { log } from "./vite.js";

const app = express();

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add API route middleware
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

try {
  const port = 5000;
  log(`Attempting to start server on port ${port}...`);

  // Register routes
  log('Registering routes...');
  const server = await registerRoutes(app);
  log('Routes registered successfully');

  const server_instance = server.listen(port, "0.0.0.0", () => {
    log(`Server successfully started and listening on port ${port}`);
  });

  server_instance.on("error", (error: any) => {
    log(`Server error encountered: ${error.code}`);
    if (error.code === "EADDRINUSE") {
      log(`Error: Port ${port} is already in use. Please free it before starting the server.`);
    } else {
      console.error("Server error:", error);
    }
    process.exit(1);
  });
} catch (error) {
  log(`Fatal error during server startup: ${error}`);
  console.error("Fatal error during server startup:", error);
  process.exit(1);
}