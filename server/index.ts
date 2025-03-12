import express from "express";

const app = express();

// Basic JSON parsing
app.use(express.json());

// Simple test route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
const port = 5000;
console.log(`Starting minimal server on port ${port}...`);

const server = app.listen({
  port,
  host: "0.0.0.0",
}, () => {
  console.log(`Server successfully started and listening on port ${port}`);
});

server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Error: Port ${port} is already in use`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});