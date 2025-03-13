import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

// Initialize the BlobServiceClient
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING || ""
);

// Get container client
const containerClient = blobServiceClient.getContainerClient("carbon-credits-docs");

export async function uploadFileToBlobStorage(file: Express.Multer.File): Promise<string> {
  try {
    console.log('Starting file upload to Azure Blob Storage...');
    console.log('File details:', {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype
    });

    // Create blob client for the file
    const blobName = `${Date.now()}-${file.originalname}`;
    console.log('Generated blob name:', blobName);

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    console.log('Created block blob client');

    // Upload file
    console.log('Uploading file to Azure...');
    const uploadResult = await blockBlobClient.upload(file.buffer, file.buffer.length);
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

// Add a function to list blobs in the container
export async function listBlobs(): Promise<string[]> {
  try {
    console.log('Listing blobs in container...');
    const blobs: string[] = [];

    for await (const blob of containerClient.listBlobsFlat()) {
      blobs.push(blob.name);
    }

    console.log('Found blobs:', blobs);
    return blobs;
  } catch (error) {
    console.error('Error listing blobs:', error);
    throw error;
  }
}