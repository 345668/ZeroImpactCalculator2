import express from "express";
import { createServer } from "http";

const app = express();
const server = createServer(app);

// Basic middleware
app.use(express.json());

// Add health check endpoint (from original code)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Add test route (from edited code)
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Basic error logging (from original code)
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server with minimal configuration (modified from edited code)
const port = 5000;
console.log(`Starting minimal server on port ${port}...`);

try {
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server successfully started and listening on port ${port}`);
  });

  server.on('error', (error: any) => {
    console.error('Server startup error:', error);
    process.exit(1);
  });
} catch (error) {
  console.error('Fatal error during server startup:', error);
  process.exit(1);
}