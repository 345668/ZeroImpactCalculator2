import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

// Initialize the BlobServiceClient
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING || ""
);

// Get container client
const containerClient = blobServiceClient.getContainerClient("carbon-credits-docs");

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

    // Get blob URL
    const blobUrl = blockBlobClient.url;
    console.log('File uploaded successfully. Blob URL:', blobUrl);

    return blobUrl;
  } catch (error) {
    console.error('Detailed error uploading to blob storage:', {
      error: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack
    });
    throw new Error(`Failed to upload file to Azure: ${error.message}`);
  }
}

export async function ensureContainerExists(): Promise<void> {
  try {
    console.log('Checking if container exists...');
    const createResult = await containerClient.createIfNotExists();
    console.log('Container check result:', {
      created: createResult.created,
      succeeded: createResult.succeeded,
      requestId: createResult.requestId
    });
    console.log('Container "carbon-credits-docs" is ready');
  } catch (error) {
    console.error('Detailed error creating container:', {
      error: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack
    });
    throw new Error(`Failed to create container: ${error.message}`);
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
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      blobs.push(blob.name);
    }

    console.log('Found blobs:', blobs);
    return blobs;
  } catch (error) {
    console.error('Error listing blobs:', error);
    throw error;
  }
}

/**
 * Get a blob by exact path
 */
export async function getBlobUrl(blobPath: string): Promise<string> {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
    return blockBlobClient.url;
  } catch (error) {
    console.error('Error getting blob URL:', error);
    throw error;
  }
}

/**
 * Delete a blob by path
 */
export async function deleteBlob(blobPath: string): Promise<boolean> {
  try {
    console.log(`Deleting blob: ${blobPath}`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
    const response = await blockBlobClient.delete();
    console.log('Delete response:', response);
    return true;
  } catch (error) {
    console.error('Error deleting blob:', error);
    throw error;
  }
}