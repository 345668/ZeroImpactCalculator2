import { submissions, type Submission, type InsertSubmission } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionByEmail(email: string): Promise<Submission | undefined>;
  getAllSubmissions(): Promise<Submission[]>;
  getSubmissionById(id: number): Promise<Submission | undefined>;
}

export class DbStorage implements IStorage {
  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    // Calculate CO2 savings using the energy consumption method
    const getEmissionFactor = (heatingSystem: string): number => {
      switch (heatingSystem.toLowerCase()) {
        case 'oil':
        case 'oil heating':
          return 0.266; // kg CO₂/kWh (2024)
        case 'gas':
        case 'gas-nt':
        case 'natural gas':
          return 0.202; // kg CO₂/kWh (2024)
        case 'electricity':
        case 'electric':
          return 0.343; // kg CO₂/kWh (2024)
        case 'green electricity':
          return 0; // kg CO₂/kWh
        default:
          return 0.202; // Default to natural gas if unknown
      }
    };

    const currentConsumption = Number(insertSubmission.currentConsumption);
    const projectedConsumption = Number(insertSubmission.projectedConsumption);
    const emissionFactor = getEmissionFactor(insertSubmission.heatingSystem);

    // Calculate emissions in kg CO2
    const currentEmissions = currentConsumption * emissionFactor;
    const projectedEmissions = projectedConsumption * emissionFactor;

    // Convert to tons CO2
    const co2Savings = Number(((currentEmissions - projectedEmissions) / 1000).toFixed(2));
    const carbonCredits = co2Savings; // 1:1 ratio
    const financialValue = Number((carbonCredits * 50).toFixed(2)); // €50 per credit

    const submission = await db.insert(submissions).values({
      ...insertSubmission,
      co2Savings: co2Savings.toString(),
      carbonCredits: carbonCredits.toString(),
      financialValue: financialValue.toString(),
      acceptedTerms: insertSubmission.acceptedTerms.toString(),
      submittedAt: new Date()
    }).returning();

    return submission[0];
  }

  async getSubmissionByEmail(email: string): Promise<Submission | undefined> {
    const result = await db.select().from(submissions).where(eq(submissions.email, email));
    return result[0];
  }

  async getAllSubmissions(): Promise<Submission[]> {
    return db.select().from(submissions);
  }

  async getSubmissionById(id: number): Promise<Submission | undefined> {
    const result = await db.select().from(submissions).where(eq(submissions.id, id));
    return result[0];
  }
}

export const storage = new DbStorage();