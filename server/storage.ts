import { submissions, detailedReports, type Submission, type InsertSubmission, type DetailedReport, type InsertDetailedReport } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionByEmail(email: string): Promise<Submission | undefined>;
  getAllSubmissions(): Promise<Submission[]>;
  getSubmissionById(id: number): Promise<Submission | undefined>;
  createDetailedReport(report: InsertDetailedReport): Promise<DetailedReport>;
  getDetailedReport(submissionId: number): Promise<DetailedReport | undefined>;
}

export class DbStorage implements IStorage {
  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    // Calculate CO2 savings based on consumption difference
    const consumptionDiff = Number(insertSubmission.currentConsumption) - Number(insertSubmission.projectedConsumption);
    const co2Savings = Number((consumptionDiff * 0.2).toFixed(2)); // Simplified CO2 calculation factor
    const carbonCredits = co2Savings; // 1:1 ratio for this example
    const financialValue = Number((carbonCredits * 50).toFixed(2)); // €50 per credit

    // Check for existing submissions from the same person
    const existingSubmissions = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.firstName, insertSubmission.firstName),
          eq(submissions.lastName, insertSubmission.lastName)
        )
      )
      .orderBy(desc(submissions.submittedAt));

    // Create new submission while preserving history
    const submission = await db.insert(submissions).values({
      ...insertSubmission,
      co2Savings: co2Savings.toString(),
      carbonCredits: carbonCredits.toString(),
      financialValue: financialValue.toString(),
      acceptedTerms: insertSubmission.acceptedTerms.toString(),
      gdprConsent: insertSubmission.gdprConsent.toString(),
      submittedAt: new Date()
    }).returning();

    return submission[0];
  }

  async getSubmissionByEmail(email: string): Promise<Submission | undefined> {
    const result = await db
      .select()
      .from(submissions)
      .where(eq(submissions.email, email))
      .orderBy(desc(submissions.submittedAt));
    return result[0];
  }

  async getAllSubmissions(): Promise<Submission[]> {
    return db
      .select()
      .from(submissions)
      .orderBy(desc(submissions.submittedAt));
  }

  async getSubmissionById(id: number): Promise<Submission | undefined> {
    const result = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id));
    return result[0];
  }

  async createDetailedReport(report: InsertDetailedReport): Promise<DetailedReport> {
    const [detailedReport] = await db
      .insert(detailedReports)
      .values(report)
      .returning();
    return detailedReport;
  }

  async getDetailedReport(submissionId: number): Promise<DetailedReport | undefined> {
    const result = await db
      .select()
      .from(detailedReports)
      .where(eq(detailedReports.submissionId, submissionId))
      .orderBy(desc(detailedReports.reportDate));
    return result[0];
  }
}

export const storage = new DbStorage();