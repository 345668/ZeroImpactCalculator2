import { TableClient, TableServiceClient, odata } from "@azure/data-tables";
import { AZURE_STORAGE_CONFIG } from "../../shared/config";

// Define the main entity structure for the submissions table
interface SubmissionEntity {
  partitionKey: string;  // Use email for logical grouping of submissions
  rowKey: string;        // Use submission ID or a unique identifier
  
  // User information
  firstName: string;
  lastName: string;
  address: string;
  email: string;
  
  // Building information
  buildingOwnership: string;
  buildingSize: number;
  heatingSystem: string;
  currentEnergySource: string;
  currentConsumption: number;
  projectedConsumption: number;
  
  // Calculation results
  co2Savings: number;
  carbonCredits: number;
  financialValue: number;
  calculationDetails: string;
  
  // Consent fields
  acceptedTerms: string;
  gdprConsent: string;
  
  // Energy consultant information
  energyConsultantName: string;
  energyConsultantCompany: string;
  energyConsultantId: string;
  energyConsultantBafaNumber: string;
  
  // File storage fields
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUploadedAt: Date;
  fileMetadata: string;
  
  // Email status
  emailSent: string;
  emailSentAt: Date;
  
  // Timestamps
  submittedAt: Date;
  
  // System fields automatically added by Azure Table Storage
  // timestamp - managed by Azure
  // etag - managed by Azure
}

// Constants - Use values from configuration
const TABLE_NAME = AZURE_STORAGE_CONFIG.tableStorage.tableName;
const CONNECTION_STRING = AZURE_STORAGE_CONFIG.tableStorage.connectionString || "";

/**
 * Initialize Azure Table Storage connection and ensure table exists
 */
export async function initializeTableStorage(): Promise<boolean> {
  try {
    if (!CONNECTION_STRING) {
      console.warn("Azure Storage connection string is not set. Table storage integration is disabled.");
      return false;
    }
    
    // Create a service client
    const tableServiceClient = TableServiceClient.fromConnectionString(CONNECTION_STRING);
    
    // Check if table exists, create if it doesn't
    const tableClient = await ensureTableExists(tableServiceClient, TABLE_NAME);
    
    if (tableClient) {
      console.log(`Azure Table '${TABLE_NAME}' is ready for use`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Failed to initialize Azure Table Storage:", error);
    return false;
  }
}

/**
 * Ensure the specified table exists, creating it if necessary
 */
async function ensureTableExists(
  tableServiceClient: TableServiceClient, 
  tableName: string
): Promise<TableClient | null> {
  try {
    // Check if the table already exists
    let tableExists = false;
    const tablesIterator = tableServiceClient.listTables();
    
    for await (const table of tablesIterator) {
      if (table.name === tableName) {
        tableExists = true;
        break;
      }
    }
    
    if (!tableExists) {
      console.log(`Creating Azure Table '${tableName}'...`);
      await tableServiceClient.createTable(tableName);
      console.log(`Table '${tableName}' created successfully`);
    }
    
    // Return a client for the table
    return TableClient.fromConnectionString(CONNECTION_STRING, tableName);
  } catch (error) {
    console.error(`Error ensuring table exists: ${tableName}`, error);
    return null;
  }
}

/**
 * Create a new submission entity in Azure Table Storage
 */
export async function createSubmissionEntity(submission: any): Promise<boolean> {
  try {
    if (!CONNECTION_STRING) {
      return false;
    }
    
    const tableClient = TableClient.fromConnectionString(CONNECTION_STRING, TABLE_NAME);
    
    // Convert PostgreSQL fields to Azure Table entity format
    const entity: SubmissionEntity = {
      partitionKey: submission.email,
      rowKey: submission.id.toString(),
      
      // User information
      firstName: submission.firstName,
      lastName: submission.lastName,
      address: submission.address,
      email: submission.email,
      
      // Building information
      buildingOwnership: submission.buildingOwnership,
      buildingSize: Number(submission.buildingSize),
      heatingSystem: submission.heatingSystem,
      currentEnergySource: submission.currentEnergySource,
      currentConsumption: Number(submission.currentConsumption),
      projectedConsumption: Number(submission.projectedConsumption),
      
      // Calculation results
      co2Savings: submission.co2Savings ? Number(submission.co2Savings) : 0,
      carbonCredits: submission.carbonCredits ? Number(submission.carbonCredits) : 0,
      financialValue: submission.financialValue ? Number(submission.financialValue) : 0,
      calculationDetails: submission.calculationDetails || "",
      
      // Consent fields
      acceptedTerms: submission.acceptedTerms,
      gdprConsent: submission.gdprConsent,
      
      // Energy consultant information
      energyConsultantName: submission.energyConsultantName || "",
      energyConsultantCompany: submission.energyConsultantCompany || "",
      energyConsultantId: submission.energyConsultantId || "",
      energyConsultantBafaNumber: submission.energyConsultantBafaNumber || "",
      
      // File storage fields
      fileUrl: submission.fileUrl || "",
      fileName: submission.fileName || "",
      fileSize: submission.fileSize ? Number(submission.fileSize) : 0,
      fileType: submission.fileType || "",
      fileUploadedAt: submission.fileUploadedAt ? new Date(submission.fileUploadedAt) : new Date(),
      fileMetadata: submission.fileMetadata || "",
      
      // Email status
      emailSent: submission.emailSent,
      emailSentAt: submission.emailSentAt ? new Date(submission.emailSentAt) : new Date(0),
      
      // Timestamps
      submittedAt: submission.submittedAt ? new Date(submission.submittedAt) : new Date(),
    };
    
    await tableClient.createEntity(entity);
    console.log(`Submission created in Azure Table Storage with ID: ${submission.id}`);
    return true;
  } catch (error) {
    console.error("Error creating submission in Azure Table Storage:", error);
    return false;
  }
}

/**
 * Get a submission entity from Azure Table Storage by email
 */
export async function getSubmissionByEmail(email: string): Promise<any | null> {
  try {
    if (!CONNECTION_STRING) {
      return null;
    }
    
    const tableClient = TableClient.fromConnectionString(CONNECTION_STRING, TABLE_NAME);
    
    const entities = tableClient.listEntities({
      queryOptions: {
        filter: odata`PartitionKey eq ${email}`
      }
    });
    
    const results = [];
    for await (const entity of entities) {
      results.push(entity);
    }
    
    return results.length > 0 ? mapEntityToSubmission(results[0] as SubmissionEntity) : null;
  } catch (error) {
    console.error(`Error fetching submission by email: ${email}`, error);
    return null;
  }
}

/**
 * Get a submission entity from Azure Table Storage by ID
 */
export async function getSubmissionById(id: number): Promise<any | null> {
  try {
    if (!CONNECTION_STRING) {
      return null;
    }
    
    const tableClient = TableClient.fromConnectionString(CONNECTION_STRING, TABLE_NAME);
    
    const entities = tableClient.listEntities({
      queryOptions: {
        filter: odata`RowKey eq ${id.toString()}`
      }
    });
    
    const results = [];
    for await (const entity of entities) {
      results.push(entity);
    }
    
    return results.length > 0 ? mapEntityToSubmission(results[0] as SubmissionEntity) : null;
  } catch (error) {
    console.error(`Error fetching submission by ID: ${id}`, error);
    return null;
  }
}

/**
 * Update a submission entity in Azure Table Storage
 */
export async function updateSubmission(submission: any): Promise<boolean> {
  try {
    if (!CONNECTION_STRING) {
      return false;
    }
    
    const tableClient = TableClient.fromConnectionString(CONNECTION_STRING, TABLE_NAME);
    
    // First, get the existing entity to preserve the ETag
    const existingEntity = await tableClient.getEntity(submission.email, submission.id.toString());
    
    // Prepare the updated entity
    const updatedEntity: SubmissionEntity = {
      ...existingEntity as SubmissionEntity,
      
      // Update fields with new values
      fileUrl: submission.fileUrl || existingEntity.fileUrl,
      fileName: submission.fileName || existingEntity.fileName,
      fileSize: submission.fileSize ? Number(submission.fileSize) : existingEntity.fileSize,
      fileType: submission.fileType || existingEntity.fileType,
      fileUploadedAt: submission.fileUploadedAt ? new Date(submission.fileUploadedAt) : existingEntity.fileUploadedAt,
      fileMetadata: submission.fileMetadata || existingEntity.fileMetadata,
      
      // Email status
      emailSent: submission.emailSent || existingEntity.emailSent,
      emailSentAt: submission.emailSentAt ? new Date(submission.emailSentAt) : existingEntity.emailSentAt,
    };
    
    await tableClient.updateEntity(updatedEntity, "Merge");
    console.log(`Submission updated in Azure Table Storage with ID: ${submission.id}`);
    return true;
  } catch (error) {
    console.error("Error updating submission in Azure Table Storage:", error);
    return false;
  }
}

/**
 * Sync a submission from PostgreSQL to Azure Table Storage
 */
export async function syncSubmissionToTable(submission: any): Promise<boolean> {
  try {
    // Check if entity exists in Table Storage
    const existingSubmission = await getSubmissionById(submission.id);
    
    if (existingSubmission) {
      // Update existing entity
      return await updateSubmission(submission);
    } else {
      // Create new entity
      return await createSubmissionEntity(submission);
    }
  } catch (error) {
    console.error("Error syncing submission to Azure Table Storage:", error);
    return false;
  }
}

/**
 * Map an Azure Table entity to a submission object
 */
function mapEntityToSubmission(entity: SubmissionEntity): any {
  return {
    id: parseInt(entity.rowKey),
    firstName: entity.firstName,
    lastName: entity.lastName,
    email: entity.email,
    address: entity.address,
    buildingOwnership: entity.buildingOwnership,
    buildingSize: entity.buildingSize,
    heatingSystem: entity.heatingSystem,
    currentEnergySource: entity.currentEnergySource,
    currentConsumption: entity.currentConsumption,
    projectedConsumption: entity.projectedConsumption,
    co2Savings: entity.co2Savings,
    carbonCredits: entity.carbonCredits,
    financialValue: entity.financialValue,
    calculationDetails: entity.calculationDetails,
    acceptedTerms: entity.acceptedTerms,
    gdprConsent: entity.gdprConsent,
    energyConsultantName: entity.energyConsultantName,
    energyConsultantCompany: entity.energyConsultantCompany,
    energyConsultantId: entity.energyConsultantId,
    energyConsultantBafaNumber: entity.energyConsultantBafaNumber,
    fileUrl: entity.fileUrl,
    fileName: entity.fileName,
    fileSize: entity.fileSize,
    fileType: entity.fileType,
    fileUploadedAt: entity.fileUploadedAt,
    fileMetadata: entity.fileMetadata,
    emailSent: entity.emailSent,
    emailSentAt: entity.emailSentAt,
    submittedAt: entity.submittedAt,
  };
}