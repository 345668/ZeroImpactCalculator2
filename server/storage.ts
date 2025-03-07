import { submissions, type Submission, type InsertSubmission } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionByEmail(email: string): Promise<Submission | undefined>;
  getAllSubmissions(): Promise<Submission[]>;
  getSubmissionById(id: number): Promise<Submission | undefined>;
}

export class DbStorage implements IStorage {
  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    console.log('Creating submission with data:', insertSubmission); // Debug log

    // Calculate CO2 savings based on consumption difference
    const consumptionDiff = Number(insertSubmission.currentConsumption) - Number(insertSubmission.projectedConsumption);
    const co2Savings = Number((consumptionDiff * 0.2).toFixed(2)); // Simplified CO2 calculation factor
    const carbonCredits = co2Savings; // 1:1 ratio for this example
    const financialValue = Number((carbonCredits * 50).toFixed(2)); // €50 per credit

    try {
      // Create new submission
      const submission = await db.insert(submissions).values({
        ...insertSubmission,
        co2Savings: co2Savings.toString(),
        carbonCredits: carbonCredits.toString(),
        financialValue: financialValue.toString(),
        acceptedTerms: insertSubmission.acceptedTerms.toString(),
        gdprConsent: insertSubmission.gdprConsent.toString(),
        submittedAt: new Date()
      }).returning();

      console.log('Submission created successfully:', submission[0]); // Debug log
      return submission[0];
    } catch (error) {
      console.error('Error creating submission:', error); // Debug log
      throw error;
    }
  }

  async getSubmissionByEmail(email: string): Promise<Submission | undefined> {
    try {
      const result = await db
        .select()
        .from(submissions)
        .where(eq(submissions.email, email))
        .orderBy(desc(submissions.submittedAt));
      console.log('Found submission by email:', result[0]); // Debug log
      return result[0];
    } catch (error) {
      console.error('Error getting submission by email:', error); // Debug log
      throw error;
    }
  }

  async getAllSubmissions(): Promise<Submission[]> {
    try {
      const results = await db
        .select()
        .from(submissions)
        .orderBy(desc(submissions.submittedAt));
      console.log('Retrieved all submissions:', results.length); // Debug log
      return results;
    } catch (error) {
      console.error('Error getting all submissions:', error); // Debug log
      throw error;
    }
  }

  async getSubmissionById(id: number): Promise<Submission | undefined> {
    try {
      const result = await db
        .select()
        .from(submissions)
        .where(eq(submissions.id, id));
      console.log('Found submission by id:', result[0]); // Debug log
      return result[0];
    } catch (error) {
      console.error('Error getting submission by id:', error); // Debug log
      throw error;
    }
  }
}

export const storage = new DbStorage();