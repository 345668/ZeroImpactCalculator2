import { BlobServiceClient } from "@azure/storage-blob";
import { spawn } from "child_process";
import { format } from "date-fns";

// Azure container for backups
const BACKUP_CONTAINER = "database-backups";
const BACKUP_RETENTION_DAYS = 30;

export async function setupBackupContainer() {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING || ""
    );
    const containerClient = blobServiceClient.getContainerClient(BACKUP_CONTAINER);
    await containerClient.createIfNotExists();
    console.log("Backup container setup complete");
    return containerClient;
  } catch (error) {
    console.error("Error setting up backup container:", error);
    throw error;
  }
}

export async function performBackup() {
  try {
    console.log("Starting database backup...");
    const timestamp = format(new Date(), "yyyy-MM-dd-HH-mm");
    const filename = `backup-${timestamp}.sql`;
    
    // Create backup using pg_dump
    const pgDump = spawn("pg_dump", [
      process.env.DATABASE_URL || "",
      "-F", "c", // Custom format (compressed)
      "-f", filename
    ]);

    await new Promise((resolve, reject) => {
      pgDump.on("close", (code) => {
        if (code === 0) resolve(code);
        else reject(new Error(`pg_dump failed with code ${code}`));
      });
      pgDump.on("error", reject);
    });

    // Upload to Azure
    const containerClient = await setupBackupContainer();
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    
    await blockBlobClient.uploadFile(filename);
    console.log(`Backup ${filename} uploaded successfully`);

    // Cleanup old backups
    await cleanupOldBackups(containerClient);

  } catch (error) {
    console.error("Backup failed:", error);
    throw error;
  }
}

async function cleanupOldBackups(containerClient: any) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - BACKUP_RETENTION_DAYS);

    for await (const blob of containerClient.listBlobsFlat()) {
      const blobDate = new Date(blob.properties.createdOn);
      if (blobDate < cutoffDate) {
        await containerClient.deleteBlob(blob.name);
        console.log(`Deleted old backup: ${blob.name}`);
      }
    }
  } catch (error) {
    console.error("Error cleaning up old backups:", error);
  }
}
