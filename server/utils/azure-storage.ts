import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

// Initialize the BlobServiceClient
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING || ""
);

// Get container client
const containerClient = blobServiceClient.getContainerClient("carbon-credits-docs");

export async function uploadFileToBlobStorage(file: Express.Multer.File): Promise<string> {
  try {
    // Create blob client for the file
    const blobName = `${Date.now()}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload file
    await blockBlobClient.upload(file.buffer, file.buffer.length);

    // Get blob URL
    return blockBlobClient.url;
  } catch (error) {
    console.error("Error uploading to blob storage:", error);
    throw error;
  }
}

export async function ensureContainerExists(): Promise<void> {
  try {
    await containerClient.createIfNotExists();
    console.log("Container 'carbon-credits-docs' is ready");
  } catch (error) {
    console.error("Error creating container:", error);
    throw error;
  }
}
