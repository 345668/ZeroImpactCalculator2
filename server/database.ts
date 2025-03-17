import { db } from "./db.js";
import { sql } from "drizzle-orm";

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    // Simulate database connection failure for testing
    // Remove this line and uncomment the query below for production
    return false;

    // Test query to check database connectivity
    // const result = await db.execute(
    //   sql`SELECT version(), current_database(), current_user;`
    // );

    // if (result) {
    //   console.log('Database connection test successful');
    //   return true;
    // }
    //return false; //This line is redundant as false is already returned above
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}