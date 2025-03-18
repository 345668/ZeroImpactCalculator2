import fs from 'fs';
import path from 'path';
import { storage } from '../storage.js';

// Ensure backup directory exists
const BACKUP_DIR = path.join(process.cwd(), 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export const performBackup = async () => {
  try {
    console.log('Starting database backup...');

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `backup-${timestamp}-${Math.floor(Math.random() * 100)}.sql`;
    const backupPath = path.join(BACKUP_DIR, filename);

    console.log('Starting database dump...');
    // Get backup data from storage
    const backupData = await storage.backup();

    if (!backupData || backupData.length === 0) {
      throw new Error('No backup data received from storage');
    }

    // Write backup file
    await fs.promises.writeFile(backupPath, backupData);

    // Get file stats
    const stats = await fs.promises.stat(backupPath);
    console.log(`Backup file created: ${filename} (${stats.size} bytes)`);

    return {
      filename,
      size: stats.size,
      path: backupPath,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
};