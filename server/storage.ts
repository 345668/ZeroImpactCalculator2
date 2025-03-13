import { submissions, type Submission, type InsertSubmission } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionByEmail(email: string): Promise<Submission | undefined>;
  getAllSubmissions(): Promise<Submission[]>;
  getSubmissionById(id: number): Promise<Submission | undefined>;
  syncSubmissions(): Promise<void>;
  updateEmailStatus(id: number): Promise<void>; // Add new method
}

export class DbStorage implements IStorage {
  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    console.log('Creating submission with data:', insertSubmission);

    try {
      // Calculate CO2 savings based on consumption difference
      const currentConsumption = Number(insertSubmission.currentConsumption);
      const projectedConsumption = Number(insertSubmission.projectedConsumption);
      const consumptionDiff = currentConsumption - projectedConsumption;
      const co2Savings = Number((consumptionDiff * 0.2).toFixed(2)); // Simplified CO2 calculation factor
      const carbonCredits = co2Savings; // 1:1 ratio for this example
      const financialValue = Number((carbonCredits * 50).toFixed(2)); // €50 per credit

      // Prepare submission data
      const submissionData = {
        ...insertSubmission,
        co2Savings: co2Savings.toString(),
        carbonCredits: carbonCredits.toString(),
        financialValue: financialValue.toString(),
        acceptedTerms: String(insertSubmission.acceptedTerms),
        submittedAt: new Date()
      };

      console.log('Inserting submission data:', submissionData);

      // Create new submission
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

      // Get all submissions ordered by latest first
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
}

export const storage = new DbStorage();