/**
 * Local File Storage Utility
 * 
 * This provides fallback storage for documents when Azure Blob Storage is unavailable.
 * Files are saved to the local filesystem in a structured way.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Get the directory path for storing local files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(process.cwd(), 'uploads');

// Ensure the uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  console.log(`Creating uploads directory at ${uploadsDir}`);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

interface LocalFileOptions {
  email?: string;
  submissionId?: number;
  documentType?: string;
}

/**
 * Store a file locally in a structured folder hierarchy
 */
export async function storeFileLocally(
  file: Express.Multer.File,
  options: LocalFileOptions = {}
): Promise<string> {
  try {
    console.log('Starting local file storage...');
    
    // Create a folder structure similar to Azure storage
    const safeEmail = options.email ? options.email.replace(/[^a-zA-Z0-9._-]/g, "_") : "anonymous";
    
    // Build the folder path
    let folderPath = uploadsDir;
    
    // Add document type folder if provided
    if (options.documentType) {
      folderPath = path.join(folderPath, options.documentType);
    } else {
      folderPath = path.join(folderPath, 'documents');
    }
    
    // Add email folder
    folderPath = path.join(folderPath, safeEmail);
    
    // Add submission ID if available
    if (options.submissionId) {
      folderPath = path.join(folderPath, `submission-${options.submissionId}`);
    }
    
    // Create the folders if they don't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    // Create a unique filename with timestamp and original name
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.originalname}`;
    const filePath = path.join(folderPath, filename);
    
    // Write the file
    fs.writeFileSync(filePath, file.buffer);
    
    console.log(`File saved locally to: ${filePath}`);
    
    // Return a local:// URL format to indicate this is a local file
    // We'll use the relative path from the uploads directory for consistent references
    const relativePath = path.relative(uploadsDir, filePath);
    return `local://${relativePath}`;
    
  } catch (error) {
    console.error('Error saving file locally:', error);
    throw new Error(`Failed to save file locally: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieve a locally stored file
 * @param localPath The path returned by storeFileLocally (should start with 'local://')
 * @returns The absolute file path
 */
export function getLocalFilePath(localPath: string): string | null {
  try {
    if (!localPath.startsWith('local://')) {
      console.warn('Invalid local path format:', localPath);
      return null;
    }
    
    // Extract the relative path part
    const relativePath = localPath.replace('local://', '');
    
    // Create the absolute path
    const filePath = path.join(uploadsDir, relativePath);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`Local file not found: ${filePath}`);
      return null;
    }
    
    return filePath;
  } catch (error) {
    console.error('Error retrieving local file path:', error);
    return null;
  }
}

/**
 * Get all the files in a local directory structure
 */
export function listLocalFiles(options: LocalFileOptions = {}): string[] {
  try {
    let searchDir = uploadsDir;
    
    // Add document type folder if provided
    if (options.documentType) {
      searchDir = path.join(searchDir, options.documentType);
    }
    
    // Add email folder if provided
    if (options.email) {
      const safeEmail = options.email.replace(/[^a-zA-Z0-9._-]/g, "_");
      searchDir = path.join(searchDir, safeEmail);
    }
    
    // Add submission ID if provided
    if (options.submissionId) {
      searchDir = path.join(searchDir, `submission-${options.submissionId}`);
    }
    
    // Check if the directory exists
    if (!fs.existsSync(searchDir)) {
      console.log(`Directory does not exist: ${searchDir}`);
      return [];
    }
    
    // Get all files in the directory (recursively)
    const files: string[] = [];
    
    function scanDir(dir: string, baseDir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          scanDir(fullPath, baseDir);
        } else {
          // Get path relative to the uploads directory
          const relativePath = path.relative(baseDir, fullPath);
          files.push(`local://${relativePath}`);
        }
      }
    }
    
    scanDir(searchDir, uploadsDir);
    return files;
    
  } catch (error) {
    console.error('Error listing local files:', error);
    return [];
  }
}

/**
 * Delete a local file
 */
export function deleteLocalFile(localPath: string): boolean {
  try {
    if (!localPath.startsWith('local://')) {
      console.warn('Invalid local path format:', localPath);
      return false;
    }
    
    const relativePath = localPath.replace('local://', '');
    const filePath = path.join(uploadsDir, relativePath);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found for deletion: ${filePath}`);
      return false;
    }
    
    fs.unlinkSync(filePath);
    console.log(`Deleted local file: ${filePath}`);
    return true;
    
  } catch (error) {
    console.error('Error deleting local file:', error);
    return false;
  }
}