import { submissions, type Submission, type InsertSubmission } from "@shared/schema";

export interface IStorage {
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionByEmail(email: string): Promise<Submission | undefined>;
  getAllSubmissions(): Promise<Submission[]>;
}

export class MemStorage implements IStorage {
  private submissions: Map<number, Submission>;
  private currentId: number;

  constructor() {
    this.submissions = new Map();
    this.currentId = 1;
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    // Calculate CO2 savings based on consumption difference
    const consumptionDiff = insertSubmission.currentConsumption - insertSubmission.projectedConsumption;
    const co2Savings = Number((consumptionDiff * 0.2).toFixed(2)); // Simplified CO2 calculation factor
    const carbonCredits = co2Savings; // 1:1 ratio for this example
    const financialValue = Number((carbonCredits * 50).toFixed(2)); // €50 per credit

    const submission: Submission = {
      id: this.currentId++,
      ...insertSubmission,
      co2Savings: co2Savings.toString(), // Convert to string for storage
      carbonCredits: carbonCredits.toString(),
      financialValue: financialValue.toString(),
      submittedAt: new Date()
    };

    this.submissions.set(submission.id, submission);
    return submission;
  }

  async getSubmissionByEmail(email: string): Promise<Submission | undefined> {
    return Array.from(this.submissions.values()).find(
      (submission) => submission.email === email
    );
  }

  async getAllSubmissions(): Promise<Submission[]> {
    return Array.from(this.submissions.values());
  }
}

export const storage = new MemStorage();