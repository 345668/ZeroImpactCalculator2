/**
 * Local File Storage Utility
 * 
 * This provides fallback storage for documents when Azure Blob Storage is unavailable.
 * Files are saved to the local filesystem in a structured way.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Base directory for local storage
const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'uploads');

interface LocalFileOptions {
  email?: string;
  submissionId?: number;
  documentType?: string;
}

/**
 * Ensure the directory exists, creating it if necessary
 */
function ensureDirectoryExists(directory: string): void {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

/**
 * Store a file locally in a structured folder hierarchy
 */
export async function storeFileLocally(
  file: Express.Multer.File,
  options: LocalFileOptions = {}
): Promise<string> {
  // Ensure the base upload directory exists
  ensureDirectoryExists(LOCAL_STORAGE_DIR);
  
  // Create a structured path similar to Azure Blob Storage
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const randomId = crypto.randomBytes(8).toString('hex');
  
  // Create a safe filename
  const originalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeFilename = `${timestamp}-${randomId}-${originalName}`;
  
  // Define the directory structure
  let storageDirectory = LOCAL_STORAGE_DIR;
  
  // Add document type if provided
  if (options.documentType) {
    storageDirectory = path.join(storageDirectory, options.documentType);
    ensureDirectoryExists(storageDirectory);
  }
  
  // Add email folder if provided
  if (options.email) {
    const emailDir = options.email.replace(/[^a-zA-Z0-9._@-]/g, '_');
    storageDirectory = path.join(storageDirectory, emailDir);
    ensureDirectoryExists(storageDirectory);
  }
  
  // Add submission ID folder if provided
  if (options.submissionId) {
    storageDirectory = path.join(storageDirectory, `submission-${options.submissionId}`);
    ensureDirectoryExists(storageDirectory);
  }
  
  // Full path where the file will be stored
  const filePath = path.join(storageDirectory, safeFilename);
  
  // Write the file to disk
  await fs.promises.writeFile(filePath, file.buffer);
  
  // Return a URL-like path prefixed with local:// to indicate it's a local file
  const relativePath = path.relative(LOCAL_STORAGE_DIR, filePath);
  return `local://${relativePath}`;
}

/**
 * Retrieve a locally stored file
 * @param localPath The path returned by storeFileLocally (should start with 'local://')
 * @returns The absolute file path
 */
export function getLocalFilePath(localPath: string): string | null {
  if (!localPath || !localPath.startsWith('local://')) {
    return null;
  }
  
  const relativePath = localPath.substring(8); // Remove 'local://' prefix
  const fullPath = path.join(LOCAL_STORAGE_DIR, relativePath);
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  
  return fullPath;
}

/**
 * Get all the files in a local directory structure
 */
export function listLocalFiles(options: LocalFileOptions = {}): string[] {
  const results: string[] = [];
  let basePath = LOCAL_STORAGE_DIR;
  
  // Build the path based on options
  if (options.documentType) {
    basePath = path.join(basePath, options.documentType);
  }
  
  if (options.email) {
    basePath = path.join(basePath, options.email.replace(/[^a-zA-Z0-9._@-]/g, '_'));
  }
  
  if (options.submissionId) {
    basePath = path.join(basePath, `submission-${options.submissionId}`);
  }
  
  if (!fs.existsSync(basePath)) {
    return [];
  }
  
  // Scan directory recursively
  function scanDir(dir: string, baseDir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        scanDir(fullPath, baseDir);
      } else {
        // Convert to local:// format
        const relativePath = path.relative(LOCAL_STORAGE_DIR, fullPath);
        results.push(`local://${relativePath}`);
      }
    }
  }
  
  scanDir(basePath, basePath);
  return results;
}

/**
 * Delete a local file
 */
export function deleteLocalFile(localPath: string): boolean {
  if (!localPath || !localPath.startsWith('local://')) {
    return false;
  }
  
  const relativePath = localPath.substring(8); // Remove 'local://' prefix
  const fullPath = path.join(LOCAL_STORAGE_DIR, relativePath);
  
  if (!fs.existsSync(fullPath)) {
    return false;
  }
  
  try {
    fs.unlinkSync(fullPath);
    return true;
  } catch (error) {
    console.error('Error deleting local file:', error);
    return false;
  }
}