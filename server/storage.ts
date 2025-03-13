import { submissions, users, type Submission, type InsertSubmission, type User, type InsertUser } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionByEmail(email: string): Promise<Submission | undefined>;
  getAllSubmissions(): Promise<Submission[]>;
  getSubmissionById(id: number): Promise<Submission | undefined>;
  syncSubmissions(): Promise<void>;
  updateEmailStatus(id: number): Promise<void>;

  // User operations
  createUser(data: InsertUser & { password: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  verifyPassword(email: string, password: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    console.log('Creating submission with data:', insertSubmission);

    try {
      const currentConsumption = Number(insertSubmission.currentConsumption);
      const projectedConsumption = Number(insertSubmission.projectedConsumption);
      const consumptionDiff = currentConsumption - projectedConsumption;
      const co2Savings = Number((consumptionDiff * 0.2).toFixed(2));
      const carbonCredits = co2Savings;
      const financialValue = Number((carbonCredits * 50).toFixed(2));

      const submissionData = {
        ...insertSubmission,
        co2Savings: co2Savings.toString(),
        carbonCredits: carbonCredits.toString(),
        financialValue: financialValue.toString(),
        acceptedTerms: String(insertSubmission.acceptedTerms),
        submittedAt: new Date()
      };

      console.log('Inserting submission data:', submissionData);

      const [submission] = await db.insert(submissions)
        .values(submissionData)
        .returning();

      console.log('Submission created successfully:', submission);
      return submission;
    } catch (error) {
      console.error('Error creating submission:', error);
      throw error;
    }
  }

  async getSubmissionByEmail(email: string): Promise<Submission | undefined> {
    try {
      const [result] = await db
        .select()
        .from(submissions)
        .where(eq(submissions.email, email))
        .orderBy(desc(submissions.submittedAt));

      console.log('Found submission by email:', result);
      return result;
    } catch (error) {
      console.error('Error getting submission by email:', error);
      throw error;
    }
  }

  async getAllSubmissions(): Promise<Submission[]> {
    try {
      const results = await db
        .select()
        .from(submissions)
        .orderBy(desc(submissions.submittedAt));

      console.log('Retrieved all submissions:', results.length);
      return results;
    } catch (error) {
      console.error('Error getting all submissions:', error);
      throw error;
    }
  }

  async getSubmissionById(id: number): Promise<Submission | undefined> {
    try {
      const [result] = await db
        .select()
        .from(submissions)
        .where(eq(submissions.id, id));

      console.log('Found submission by id:', result);
      return result;
    } catch (error) {
      console.error('Error getting submission by id:', error);
      throw error;
    }
  }
  async syncSubmissions(): Promise<void> {
    try {
      console.log('Starting submissions sync...');
      const results = await db
        .select()
        .from(submissions)
        .orderBy(desc(submissions.submittedAt));

      console.log(`Successfully synced ${results.length} submissions`);
      return;
    } catch (error) {
      console.error('Error syncing submissions:', error);
      throw error;
    }
  }
  async updateEmailStatus(id: number): Promise<void> {
    try {
      console.log('Updating email status for submission:', id);

      await db
        .update(submissions)
        .set({
          emailSent: "yes",
          emailSentAt: new Date()
        })
        .where(eq(submissions.id, id));

      console.log('Email status updated successfully');
    } catch (error) {
      console.error('Error updating email status:', error);
      throw error;
    }
  }

  async createUser(data: InsertUser & { password: string }): Promise<User> {
    try {
      console.log('Creating new user:', { email: data.email, username: data.username });

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(data.password, salt);

      // Insert new user
      const [user] = await db.insert(users)
        .values({
          email: data.email,
          username: data.username,
          passwordHash,
          role: data.role || 'user'
        })
        .returning();

      console.log('User created successfully');
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));

      return user;
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }

  async verifyPassword(email: string, password: string): Promise<boolean> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) return false;

      return bcrypt.compare(password, user.passwordHash);
    } catch (error) {
      console.error('Error verifying password:', error);
      throw error;
    }
  }
}

export const storage = new DbStorage();