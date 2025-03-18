import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Ensure backup directory exists with proper permissions
const BACKUP_DIR = path.join(process.cwd(), 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o755 });
}

export const performBackup = async () => {
  try {
    console.log('Starting database backup...');

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `backup-${timestamp}-${Math.floor(Math.random() * 100)}.sql`;
    const backupPath = path.join(BACKUP_DIR, filename);

    // Execute pg_dump directly to file
    const pgDump = spawn('pg_dump', [
      '-d', process.env.DATABASE_URL || '',
      '-f', backupPath,
      '-F', 'p', // Plain text format
      '-v' // Verbose output
    ]);

    // Handle the backup process
    await new Promise((resolve, reject) => {
      let error = '';

      pgDump.stdout.on('data', (data) => {
        console.log('pg_dump stdout:', data.toString());
      });

      pgDump.stderr.on('data', (data) => {
        const message = data.toString();
        console.error('pg_dump stderr:', message);
        if (!message.includes('connected to database')) {
          error += message;
        }
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump failed with code ${code}: ${error}`));
        }
      });

      pgDump.on('error', reject);
    });

    // Get file stats after successful backup
    const stats = await fs.promises.stat(backupPath);
    console.log(`Backup file created: ${filename} (${stats.size} bytes)`);

    // Clean up old backups
    const files = await fs.promises.readdir(BACKUP_DIR);
    const now = new Date();
    for (const file of files) {
      const filePath = path.join(BACKUP_DIR, file);
      const fileStat = await fs.promises.stat(filePath);
      const fileAge = (now.getTime() - fileStat.mtime.getTime()) / (1000 * 60 * 60 * 24); // Age in days
      if (fileAge > 30) { // Keep backups for 30 days
        await fs.promises.unlink(filePath);
        console.log(`Deleted old backup: ${file}`);
      }
    }

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