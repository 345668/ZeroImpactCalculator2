import { submissions, users, type Submission, type InsertSubmission, type User, type InsertUser } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { spawn } from "child_process";
import { AZURE_STORAGE_CONFIG } from "../shared/config";
import { syncSubmissionToTable } from "./utils/azure-table-storage";

export interface IStorage {
  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionByEmail(email: string): Promise<Submission | undefined>;
  getAllSubmissions(): Promise<Submission[]>;
  getSubmissionById(id: number): Promise<Submission | undefined>;
  syncSubmissions(): Promise<void>;
  updateEmailStatus(id: number): Promise<void>;
  backup(): Promise<string>;

  // User operations
  createUser(data: InsertUser & { password: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: number, role: string): Promise<User>;
  verifyPassword(email: string, password: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    console.log('Creating submission with data:', insertSubmission);

    try {
      // Prepare submission data with proper types for PostgreSQL
      // Convert string-like values to strings and numeric values will be handled by Drizzle
      const submissionData = {
        firstName: String(insertSubmission.firstName),
        lastName: String(insertSubmission.lastName),
        email: String(insertSubmission.email),
        streetName: String(insertSubmission.streetName),
        postalCode: String(insertSubmission.postalCode),
        country: String(insertSubmission.country),
        region: String(insertSubmission.region),
        buildingOwnership: String(insertSubmission.buildingOwnership),
        // Convert numeric fields to strings for PostgreSQL
        buildingSize: String(insertSubmission.buildingSize),
        heatingSystem: String(insertSubmission.heatingSystem),
        currentEnergySource: String(insertSubmission.currentEnergySource),
        currentConsumption: String(insertSubmission.currentConsumption),
        projectedConsumption: String(insertSubmission.projectedConsumption),
        co2Savings: insertSubmission.co2Savings !== undefined ? String(insertSubmission.co2Savings) : undefined,
        carbonCredits: insertSubmission.carbonCredits !== undefined ? String(insertSubmission.carbonCredits) : undefined,
        financialValue: insertSubmission.financialValue !== undefined ? String(insertSubmission.financialValue) : undefined,
        calculationDetails: insertSubmission.calculationDetails,
        acceptedTerms: String(insertSubmission.acceptedTerms),
        gdprConsent: String(insertSubmission.gdprConsent),
        energyConsultantName: insertSubmission.energyConsultantName,
        energyConsultantCompany: insertSubmission.energyConsultantCompany,
        energyConsultantId: insertSubmission.energyConsultantId,
        energyConsultantBafaNumber: insertSubmission.energyConsultantBafaNumber,
        fileUrl: insertSubmission.fileUrl,
        fileName: insertSubmission.fileName,
        fileSize: insertSubmission.fileSize !== undefined ? String(insertSubmission.fileSize) : undefined,
        fileType: insertSubmission.fileType,
        fileUploadedAt: insertSubmission.fileUploadedAt ? new Date(insertSubmission.fileUploadedAt) : undefined,
        fileMetadata: insertSubmission.fileMetadata,
        submittedAt: new Date()
      };

      console.log('Inserting submission data:', submissionData);

      const [submission] = await db.insert(submissions)
        .values([submissionData])
        .returning();

      console.log('Submission created successfully:', submission);
      
      // Sync with Azure Table Storage if enabled
      if (AZURE_STORAGE_CONFIG.tableStorage.enabled) {
        try {
          console.log('Syncing submission to Azure Table Storage:', submission.id);
          await syncSubmissionToTable(submission);
          console.log('Submission synced to Azure Table Storage successfully');
        } catch (syncError) {
          console.error('Failed to sync submission to Azure Table Storage:', syncError);
          // Don't throw the error, just log it - we don't want to block the main operation
        }
      }
      
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
      console.log('Starting submissions sync to Azure Table Storage...');
      
      // Only proceed if Azure Table Storage is enabled
      if (!AZURE_STORAGE_CONFIG.tableStorage.enabled) {
        console.log('Azure Table Storage sync is disabled. Skipping sync operation.');
        return;
      }
      
      const results = await db
        .select()
        .from(submissions)
        .orderBy(desc(submissions.submittedAt));
        
      console.log(`Found ${results.length} submissions to sync`);
      
      // Sync each submission to Azure Table Storage
      const syncPromises = results.map(async (submission) => {
        try {
          await syncSubmissionToTable(submission);
          return { id: submission.id, success: true };
        } catch (error) {
          console.error(`Failed to sync submission ${submission.id}:`, error);
          return { id: submission.id, success: false, error };
        }
      });
      
      const syncResults = await Promise.all(syncPromises);
      const successCount = syncResults.filter(r => r.success).length;
      
      console.log(`Successfully synced ${successCount} of ${results.length} submissions to Azure Table Storage`);
      return;
    } catch (error) {
      console.error('Error syncing submissions:', error);
      throw error;
    }
  }
  async updateEmailStatus(id: number): Promise<void> {
    try {
      console.log('Updating email status for submission:', id);

      // Update PostgreSQL database
      await db
        .update(submissions)
        .set({
          emailSent: "yes",
          emailSentAt: new Date()
        })
        .where(eq(submissions.id, id));

      console.log('Email status updated in PostgreSQL');
      
      // Get the updated submission to sync with Azure Table Storage
      if (AZURE_STORAGE_CONFIG.tableStorage.enabled) {
        try {
          const submission = await this.getSubmissionById(id);
          
          if (submission) {
            console.log('Syncing updated email status to Azure Table Storage');
            await syncSubmissionToTable(submission);
            console.log('Email status synced to Azure Table Storage successfully');
          } else {
            console.warn(`Cannot sync email status to Azure: Submission with ID ${id} not found`);
          }
        } catch (syncError) {
          console.error('Failed to sync email status update to Azure Table Storage:', syncError);
          // Don't throw the error, just log it - we don't want to block the main operation
        }
      }
      
      console.log('Email status update completed');
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
        .values([{
          email: data.email,
          username: data.username,
          passwordHash,
          role: data.role || 'user'
        }])
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

  async getUserById(id: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));

      return user;
    } catch (error) {
      console.error('Error getting user by id:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const results = await db
        .select()
        .from(users)
        .orderBy(users.username);

      console.log('Retrieved all users:', results.length);
      return results;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  async updateUserRole(id: number, role: string): Promise<User> {
    try {
      console.log(`Updating user ${id} role to: ${role}`);
      
      // Validate role
      if (!['user', 'admin', 'consultant'].includes(role)) {
        throw new Error(`Invalid role: ${role}. Must be one of: user, admin, consultant`);
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          role,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();

      if (!updatedUser) {
        throw new Error(`User with ID ${id} not found`);
      }

      console.log('User role updated successfully');
      return updatedUser;
    } catch (error) {
      console.error('Error updating user role:', error);
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

  async backup(): Promise<string> {
    return new Promise((resolve, reject) => {
      let output = '';

      const pgDump = spawn('pg_dump', [
        process.env.DATABASE_URL || '',
        '-F', 'p' // Plain text format
      ]);

      pgDump.stdout.on('data', (data) => {
        output += data.toString();
      });

      pgDump.stderr.on('data', (data) => {
        console.error('pg_dump stderr:', data.toString());
      });

      pgDump.on('close', (code) => {
        if (code === 0) resolve(output);
        else reject(new Error(`pg_dump failed with code ${code}`));
      });

      pgDump.on('error', reject);
    });
  }
}

export const storage = new DbStorage();