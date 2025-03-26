import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { AZURE_STORAGE_CONFIG } from "../../shared/config";
import { storeFileLocally } from "./local-storage";

// Use a known working container name for consistent operations
export const containerName = "carbon-credits-docs";

// Track Azure storage availability status
let isAzureStorageAvailable = true;

console.log(`Using Azure Blob Storage container: ${containerName}`);

// Initialize the BlobServiceClient (only if connection string is available)
let blobServiceClient: BlobServiceClient | null = null;
let containerClient: ContainerClient | null = null;

if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
  try {
    blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
    containerClient = blobServiceClient.getContainerClient(containerName);
  } catch (error) {
    console.error('Failed to initialize Azure Storage:', error);
    isAzureStorageAvailable = false;
  }
} else {
  console.warn('AZURE_STORAGE_CONNECTION_STRING is missing, using local storage only');
  isAzureStorageAvailable = false;
}

// Organize files by submission type and ID
interface FileUploadOptions {
  submissionId?: number;
  email?: string;
  documentType?: string;
}

/**
 * Upload a file to Azure Blob Storage with organized folder structure
 * The structure follows: {documentType}/{email}/{submissionId}/{timestamp}-{filename}
 * Falls back to local storage if Azure is unavailable
 */
export async function uploadFileToBlobStorage(
  file: Express.Multer.File, 
  options: FileUploadOptions = {}
): Promise<string> {
  // If Azure Storage is not available, use local storage immediately
  if (!isAzureStorageAvailable) {
    console.log('Azure Storage unavailable, using local storage instead');
    return useLocalStorageFallback(file, options);
  }

  try {
    console.log('Starting file upload to Azure Blob Storage...');
    console.log('File details:', {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype
    });

    // First, make sure we have a valid Azure Storage connection and container
    if (!containerClient) {
      console.warn('containerClient is not initialized');
      return useLocalStorageFallback(file, options);
    }

    // Try to ensure the container exists
    try {
      await ensureContainerExists();
    } catch (containerError) {
      console.warn('Error ensuring container exists:', containerError);
      // Fall back to local storage
      return useLocalStorageFallback(file, options);
    }

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
    console.error('Error uploading to Azure Blob Storage:', {
      error: error?.message,
      code: error?.code,
      details: error?.details,
      stack: error?.stack
    });
    
    // If we encounter an error, fall back to local storage
    return useLocalStorageFallback(file, options);
  }
}

/**
 * Helper function to use local storage as a fallback
 */
async function useLocalStorageFallback(
  file: Express.Multer.File, 
  options: FileUploadOptions = {}
): Promise<string> {
  console.log('Using local storage fallback for file:', file.originalname);
  
  try {
    // Use the local-storage module to store the file
    const localPath = await storeFileLocally(file, options);
    console.log('Successfully stored file in local storage:', localPath);
    return localPath;
  } catch (localError) {
    console.error('Error storing file locally:', localError);
    // Create a fallback path in case even local storage fails
    const emergencyPath = `local://emergency-${Date.now()}-${file.originalname}`;
    console.warn('Emergency fallback path created:', emergencyPath);
    return emergencyPath;
  }
}

export async function ensureContainerExists(): Promise<void> {
  // First check if containerClient is available
  if (!containerClient) {
    isAzureStorageAvailable = false;
    throw new Error('Container client is not initialized');
  }

  try {
    console.log(`Checking if container "${containerName}" exists...`);
    
    // Using a non-null assertion since we've already checked above
    // Attempt to create the container if it doesn't exist
    try {
      const client = containerClient!; // Non-null assertion
      const createResult = await client.createIfNotExists();
      console.log('Container check result:', {
        succeeded: createResult.succeeded,
        requestId: createResult.requestId
      });
      
      // Set container public access for blobs to be accessible via URLs
      await client.setAccessPolicy("blob");
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
      const client = containerClient!; // Non-null assertion
      const properties = await client.getProperties();
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
        await client.setAccessPolicy('blob');
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
 * Falls back to listing local files when Azure Storage is unavailable
 */
import { listLocalFiles, deleteLocalFile, getLocalFilePath } from "./local-storage";

export async function listBlobs(options: {
  email?: string;
  submissionId?: number;
  documentType?: string;
} = {}): Promise<string[]> {
  // If Azure is known to be unavailable, go straight to local storage
  if (!isAzureStorageAvailable || !containerClient) {
    console.log('Azure Storage unavailable, listing local files instead');
    return listLocalFiles(options);
  }
  
  try {
    // Try to ensure container exists before attempting to list
    try {
      await ensureContainerExists();
    } catch (containerError) {
      console.warn('Container does not exist, falling back to local files:', containerError);
      return listLocalFiles(options);
    }
    
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
    const client = containerClient!; // Non-null assertion is safe here because we checked earlier
    for await (const blob of client.listBlobsFlat({ prefix })) {
      blobs.push(blob.name);
    }

    console.log('Found blobs:', blobs);
    
    // Combine with local files for a complete picture
    const localFiles = listLocalFiles(options);
    const allFiles = [...blobs, ...localFiles];
    
    return allFiles;
  } catch (error: any) {
    console.error('Error listing Azure blobs:', {
      error: error?.message,
      code: error?.code,
      details: error?.details || 'No details available'
    });
    
    // Fall back to local storage
    console.log('Falling back to local storage for file listing');
    return listLocalFiles(options);
  }
}

/**
 * Get a blob by exact path
 * Handles both Azure Storage blobs and local storage files
 */
export async function getBlobUrl(blobPath: string): Promise<string | null> {
  // Special handling for local:// paths
  if (blobPath && blobPath.startsWith('local://')) {
    console.log('Local file path detected, returning local file path');
    const localFilePath = getLocalFilePath(blobPath);
    if (localFilePath) {
      // For local files, we need to return a path that can be served by Express
      // In a real-world scenario, you'd want to create an API endpoint to serve these files
      return `/uploads/${blobPath.substring(8)}`; // Remove 'local://' prefix
    }
    return null;
  }
  
  // If Azure is known to be unavailable, return null immediately for Azure paths
  if (!isAzureStorageAvailable || !containerClient) {
    console.warn('Azure Storage unavailable, cannot get URL for blob:', blobPath);
    return null;
  }
  
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
      // Fall through to see if we can still get the URL, but it will likely fail
    }
    
    console.log(`Getting URL for blob: ${blobPath}`);
    const client = containerClient!; // Non-null assertion is safe here because we checked earlier
    const blockBlobClient = client.getBlockBlobClient(blobPath);
    
    // Return the URL for direct access
    const url = blockBlobClient.url;
    console.log(`Generated URL: ${url}`);
    return url;
  } catch (error: any) {
    console.error('Error getting blob URL:', {
      error: error?.message,
      path: blobPath
    });
    return null; // Return null to indicate failure
  }
}

/**
 * Delete a blob by path
 * Handles both Azure Storage blobs and local storage files
 */
export async function deleteBlob(blobPath: string): Promise<boolean> {
  // Handle local:// paths
  if (blobPath && blobPath.startsWith('local://')) {
    console.log('Deleting local file:', blobPath);
    return deleteLocalFile(blobPath);
  }
  
  // If Azure is known to be unavailable, fail immediately for Azure paths
  if (!isAzureStorageAvailable || !containerClient) {
    console.warn('Azure Storage unavailable, cannot delete blob:', blobPath);
    return false;
  }
  
  try {
    if (!blobPath) {
      console.warn('Empty blob path provided to deleteBlob');
      return false;
    }
    
    console.log(`Deleting blob: ${blobPath}`);
    const client = containerClient!; // Non-null assertion is safe here because we checked earlier
    const blockBlobClient = client.getBlockBlobClient(blobPath);
    const response = await blockBlobClient.delete();
    console.log('Delete response:', response);
    return true;
  } catch (error: any) {
    console.error('Error deleting blob:', {
      error: error?.message,
      path: blobPath
    });
    return false;
  }
}

// containerName is already exported