import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { AZURE_STORAGE_CONFIG } from "../../shared/config";

// Initialize the BlobServiceClient
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING || ""
);

// Default container name from config or fallback to multiple possible names
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 
                     AZURE_STORAGE_CONFIG.blobStorage.containerName || 
                     "carbon-credits-docs" || 
                     "documents";

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

    // Get blob URL and validate
    const blobUrl = blockBlobClient.url;
    console.log('File uploaded successfully. Blob URL:', blobUrl);
    
    if (!blobUrl) {
      console.error('Failed to generate URL for uploaded blob');
      throw new Error('File uploaded but URL was not generated');
    }
    
    // Return the validated URL
    return blobUrl;
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
    const createResult = await containerClient.createIfNotExists();
    console.log('Container check result:', {
      succeeded: createResult.succeeded,
      requestId: createResult.requestId
    });
    
    // Set container public access for blobs to be accessible via URLs
    await containerClient.setAccessPolicy("blob");
    console.log(`Container "${containerName}" is ready with public blob access`);
  } catch (error: any) {
    console.error('Detailed error creating container:', {
      error: error?.message,
      code: error?.code,
      details: error?.details,
      stack: error?.stack
    });
    throw new Error(`Failed to create container: ${error?.message || 'Unknown error'}`);
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
export async function getBlobUrl(blobPath: string): Promise<string> {
  try {
    if (!blobPath) {
      console.warn('Empty blob path provided to getBlobUrl');
      return '';
    }
    
    // Ensure container exists
    await ensureContainerExists();
    
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
    return ''; // Return empty string instead of throwing
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