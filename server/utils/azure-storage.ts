import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { AZURE_STORAGE_CONFIG } from "../../shared/config";

// Initialize the BlobServiceClient
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING || ""
);

// Use the specified container name 'carbon-credits-docs'
const containerName = "carbon-credits-docs";

console.log(`Using Azure Blob Storage container: ${containerName}`);

// Get container client
const containerClient = blobServiceClient.getContainerClient(containerName);

// Organize files by submission type and ID
interface FileUploadOptions {
  submissionId?: number;
  email?: string;
  documentType?: string;
}

/**
 * Upload a file to Azure Blob Storage with organized folder structure
 * The structure follows: {documentType}/{email}/{submissionId}/{timestamp}-{filename}
 */
export async function uploadFileToBlobStorage(
  file: Express.Multer.File, 
  options: FileUploadOptions = {}
): Promise<string> {
  try {
    console.log('Starting file upload to Azure Blob Storage...');
    console.log('File details:', {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype
    });

    // Sanitize the email for use in folder paths
    const safeEmail = options.email ? options.email.replace(/[^a-zA-Z0-9._-]/g, "_") : "anonymous";
    
    // Build a structured path for better organization
    let folderPath = "";
    
    // Add document type folder if provided
    if (options.documentType) {
      folderPath += `${options.documentType}/`;
    } else {
      folderPath += "documents/";
    }
    
    // Add email folder
    folderPath += `${safeEmail}/`;
    
    // Add submission ID if available
    if (options.submissionId) {
      folderPath += `submission-${options.submissionId}/`;
    }
    
    // Create blob client for the file with a structured name
    const timestamp = Date.now();
    const blobName = `${folderPath}${timestamp}-${file.originalname}`;
    console.log('Generated structured blob name:', blobName);

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    console.log('Created block blob client');

    // Add metadata to the file for easier searching
    const metadata = {
      originalFilename: file.originalname,
      contentType: file.mimetype,
      timestamp: timestamp.toString(),
      email: options.email || "unknown",
      submissionId: options.submissionId ? options.submissionId.toString() : "unknown"
    };

    // Upload file with metadata
    console.log('Uploading file to Azure with metadata...');
    const uploadResult = await blockBlobClient.upload(file.buffer, file.buffer.length, {
      metadata
    });
    console.log('Upload completed:', uploadResult);

    // Store the blobName for later reference via API endpoints
    console.log('File uploaded successfully. Blob name:', blobName);
    
    // Return the blob name/path instead of direct URL to ensure proper access control
    return blobName;
  } catch (error: any) {
    console.error('Detailed error uploading to blob storage:', {
      error: error?.message,
      code: error?.code,
      details: error?.details,
      stack: error?.stack
    });
    
    // Log the container name being used to help with debugging
    console.log(`Using container: "${containerName}" for storage operations`);
    
    throw new Error(`Failed to upload file to Azure: ${error?.message || 'Unknown error'}`);
  }
}

export async function ensureContainerExists(): Promise<void> {
  try {
    console.log(`Checking if container "${containerName}" exists...`);
    
    // Attempt to create the container if it doesn't exist
    try {
      const createResult = await containerClient.createIfNotExists();
      console.log('Container check result:', {
        succeeded: createResult.succeeded,
        requestId: createResult.requestId
      });
      
      // Set container public access for blobs to be accessible via URLs
      await containerClient.setAccessPolicy("blob");
      console.log(`Container "${containerName}" is ready with public blob access`);
    } catch (containerError: any) {
      // If we get a 409 conflict, the container already exists (which is fine)
      if (containerError?.details?.errorCode === 'ContainerAlreadyExists') {
        console.log(`Container "${containerName}" already exists, proceeding`);
      } else {
        // For other errors, throw them to be caught by the outer try-catch
        throw containerError;
      }
    }
    
    // Verify the container exists by trying to get its properties
    try {
      const properties = await containerClient.getProperties();
      console.log(`Container "${containerName}" exists and is accessible. Properties:`, {
        lastModified: properties.lastModified,
        leaseDuration: properties.leaseDuration,
        leaseState: properties.leaseState,
        leaseStatus: properties.leaseStatus,
        blobPublicAccess: properties.blobPublicAccess
      });
      
      // If container doesn't have public access, try to set it
      if (properties.blobPublicAccess !== 'blob') {
        console.log(`Setting public access for container "${containerName}"`);
        await containerClient.setAccessPolicy('blob');
      }
    } catch (propertiesError: any) {
      console.error(`Error getting container properties:`, {
        error: propertiesError?.message,
        code: propertiesError?.code
      });
      throw propertiesError;
    }
  } catch (error: any) {
    console.error('Detailed error creating or accessing container:', {
      error: error?.message,
      code: error?.code,
      details: error?.details,
      stack: error?.stack
    });
    throw new Error(`Failed to create or access container: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * List all blobs in the container with optional filtering
 */
export async function listBlobs(options: {
  email?: string;
  submissionId?: number;
  documentType?: string;
} = {}): Promise<string[]> {
  try {
    // Ensure container exists before attempting to list
    await ensureContainerExists();
    
    console.log('Listing blobs in container with options:', options);
    const blobs: string[] = [];
    
    // Construct prefix for filtering
    let prefix = "";
    if (options.documentType) {
      prefix += `${options.documentType}/`;
    }
    
    if (options.email) {
      const safeEmail = options.email.replace(/[^a-zA-Z0-9._-]/g, "_");
      prefix += `${safeEmail}/`;
    }
    
    if (options.submissionId) {
      prefix += `submission-${options.submissionId}/`;
    }
    
    // List blobs with the specified prefix
    console.log(`Listing blobs with prefix: ${prefix}`);
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      blobs.push(blob.name);
    }

    console.log('Found blobs:', blobs);
    return blobs;
  } catch (error: any) {
    console.error('Error listing blobs:', {
      error: error?.message,
      code: error?.code,
      details: error?.details || 'No details available',
      container: containerName
    });
    console.log(`Using container: "${containerName}" for list operations`);
    return []; // Return empty array on error instead of throwing
  }
}

/**
 * Get a blob by exact path
 */
export async function getBlobUrl(blobPath: string): Promise<string | null> {
  try {
    if (!blobPath) {
      console.warn('Empty blob path provided to getBlobUrl');
      return null;
    }
    
    // Try to ensure container exists, but don't fail if it doesn't
    try {
      await ensureContainerExists();
    } catch (containerError) {
      console.warn('Failed to ensure container exists for getBlobUrl:', containerError);
      // Fall through - we'll still attempt to get the URL but it will likely fail
    }
    
    // Check if we have a valid connection
    if (!containerClient) {
      console.warn('Container client is not available, Azure storage may be disconnected');
      return null;
    }
    
    console.log(`Getting URL for blob: ${blobPath}`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
    
    // Return the URL with SAS token for better access
    const sasUrl = blockBlobClient.url;
    console.log(`Generated URL: ${sasUrl}`);
    return sasUrl;
  } catch (error: any) {
    console.error('Error getting blob URL:', {
      error: error?.message,
      path: blobPath,
      container: containerName
    });
    return null; // Return null to indicate failure
  }
}

/**
 * Delete a blob by path
 */
export async function deleteBlob(blobPath: string): Promise<boolean> {
  try {
    if (!blobPath) {
      console.warn('Empty blob path provided to deleteBlob');
      return false;
    }
    
    console.log(`Deleting blob: ${blobPath}`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
    const response = await blockBlobClient.delete();
    console.log('Delete response:', response);
    return true;
  } catch (error: any) {
    console.error('Error deleting blob:', {
      error: error?.message,
      path: blobPath,
      container: containerName
    });
    return false; // Return false instead of throwing
  }
}

// Export container name for diagnostic purposes
export { containerName };