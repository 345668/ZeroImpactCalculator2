import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';

neonConfig.webSocketConstructor = ws;

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Configure connection pool with better error handling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  max: 20,
  idleTimeoutMillis: 30000,
  keepAlive: true
});

// Create drizzle instance
export const db = drizzle(pool, { schema });

// Test and maintain the connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Database connection successful');
    client.release();
  } catch (err) {
    console.error('Database connection error:', err);
    // Don't throw, just log the error
  }
}

// Initial connection test
testConnection();

// Keep connection alive
setInterval(testConnection, 30000);

export { pool };