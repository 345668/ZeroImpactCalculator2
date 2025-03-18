import { BlobServiceClient } from "@azure/storage-blob";
import { spawn } from "child_process";
import { format } from "date-fns";

// Azure container for backups
const BACKUP_CONTAINER = "database-backups";
const BACKUP_RETENTION_DAYS = 30;

export async function setupBackupContainer() {
  try {
    console.log('Setting up Azure Blob Storage container...');
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING || ""
    );
    const containerClient = blobServiceClient.getContainerClient(BACKUP_CONTAINER);
    await containerClient.createIfNotExists();
    console.log('✓ Backup container setup complete');
    return containerClient;
  } catch (error) {
    console.error('Error setting up backup container:', error);
    throw error;
  }
}

export async function performBackup() {
  try {
    console.log('=== Starting database backup process ===');
    const timestamp = format(new Date(), "yyyy-MM-dd-HH-mm");
    const filename = `backup-${timestamp}.sql`;
    console.log(`Creating backup file: ${filename}`);

    // Create backup using pg_dump
    console.log('Running pg_dump...');
    const pgDump = spawn("pg_dump", [
      process.env.DATABASE_URL || "",
      "-F", "c", // Custom format (compressed)
      "-f", filename
    ]);

    await new Promise((resolve, reject) => {
      pgDump.stdout.on('data', (data) => {
        console.log(`pg_dump output: ${data}`);
      });

      pgDump.stderr.on('data', (data) => {
        console.error(`pg_dump error: ${data}`);
      });

      pgDump.on("close", (code) => {
        if (code === 0) {
          console.log('✓ pg_dump completed successfully');
          resolve(code);
        } else {
          console.error(`× pg_dump failed with code ${code}`);
          reject(new Error(`pg_dump failed with code ${code}`));
        }
      });

      pgDump.on("error", (err) => {
        console.error('× pg_dump process error:', err);
        reject(err);
      });
    });

    // Upload to Azure
    console.log('Initializing Azure Blob Storage upload...');
    const containerClient = await setupBackupContainer();
    const blockBlobClient = containerClient.getBlockBlobClient(filename);

    console.log(`Uploading ${filename} to Azure...`);
    await blockBlobClient.uploadFile(filename);
    console.log(`✓ Backup ${filename} uploaded successfully`);

    // Cleanup old backups
    console.log('Starting cleanup of old backups...');
    await cleanupOldBackups(containerClient);
    console.log('=== Backup process completed successfully ===');

  } catch (error) {
    console.error('=== Backup process failed ===');
    console.error('Error details:', error);
    throw error;
  }
}

async function cleanupOldBackups(containerClient: any) {
  try {
    console.log(`Checking for backups older than ${BACKUP_RETENTION_DAYS} days...`);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - BACKUP_RETENTION_DAYS);

    let deletedCount = 0;
    for await (const blob of containerClient.listBlobsFlat()) {
      const blobDate = new Date(blob.properties.createdOn);
      if (blobDate < cutoffDate) {
        console.log(`Deleting old backup: ${blob.name}`);
        await containerClient.deleteBlob(blob.name);
        deletedCount++;
      }
    }
    console.log(`✓ Cleanup complete. Deleted ${deletedCount} old backup(s)`);
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
    throw error;
  }
}