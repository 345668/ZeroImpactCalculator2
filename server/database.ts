import { db } from "./db.js";

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    // Test query to check database connectivity
    const result = await db.execute(
      sql`SELECT version(), current_database(), current_user;`
    );

    if (result) {
      console.log('Database connection test successful');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}
