import express from "express";
import { log } from "./vite.js";

const app = express();

// Single test endpoint
app.get("/test", (req, res) => {
  res.json({ message: "Server is running" });
});

const port = 5000;
log(`Starting absolutely minimal server on port ${port}...`);

try {
  const server = app.listen(port, "0.0.0.0", () => {
    log(`Test server successfully started on port ${port}`);
  });

  server.on("error", (error: any) => {
    log(`Detailed server error: ${error.message}`);
    if (error.code === "EADDRINUSE") {
      log(`Port ${port} is already in use. Attempting to force close...`);
      process.exit(1);
    } else {
      console.error("Unexpected server error:", error);
      process.exit(1);
    }
  });
} catch (error) {
  console.error("Fatal error during minimal server startup:", error);
  process.exit(1);
}