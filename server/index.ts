import express from "express";
import { log } from "./vite.js";

const app = express();

// Basic health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

try {
  const port = 5000;
  log(`Attempting to start minimal server on port ${port}...`);

  const server = app.listen(port, "0.0.0.0", () => {
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