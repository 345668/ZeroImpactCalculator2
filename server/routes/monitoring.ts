/**
 * Monitoring and System Tools API Routes
 * 
 * This file defines routes for accessing system health information,
 * API monitoring data, and log files.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import monitoringService from '../utils/monitoring';
import { db } from '../db';
import { testDatabaseConnection } from '../database';
import { ensureContainerExists } from '../utils/azure-storage';
import { storeFileLocally, getLocalFilePath } from '../utils/local-storage';
import { SendGridService } from '../utils/sendgrid-service';

const router = express.Router();

/**
 * Middleware to ensure user is authenticated and has admin role
 */
function requireAuth(req: Request, res: Response, next: express.NextFunction) {
  if (!(req.session as any)?.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: express.NextFunction) {
  const userRole = (req.session as any)?.user?.role;
  if (userRole !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin privileges required' });
  }
  next();
}

/**
 * Get recent API calls with optional filtering
 */
router.get('/api-calls', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const statusFilter = req.query.status ? parseInt(req.query.status as string) : undefined;
    
    let apiCalls = monitoringService.getRecentApiCalls(limit);
    
    // Apply status filter if provided
    if (statusFilter) {
      apiCalls = apiCalls.filter(call => {
        // Filter by status code range
        if (statusFilter === 400) {
          return call.statusCode >= 400 && call.statusCode < 500;
        } else if (statusFilter === 500) {
          return call.statusCode >= 500;
        } else if (statusFilter === 200) {
          return call.statusCode >= 200 && call.statusCode < 300;
        }
        return true;
      });
    }
    
    res.json({
      success: true,
      apiCalls
    });
  } catch (error) {
    console.error('Error fetching API calls:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve API call history',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get service health status
 */
router.get('/service-health', requireAuth, async (req: Request, res: Response) => {
  try {
    // Run health checks for each service
    await checkServicesHealth();
    
    const serviceHealth = monitoringService.getServiceHealth();
    
    res.json({
      success: true,
      serviceHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching service health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve service health information',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get system metrics
 */
router.get('/system-metrics', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Record current metrics
    const currentMetrics = monitoringService.recordSystemMetrics();
    const metricsHistory = monitoringService.getSystemMetricsHistory();
    
    res.json({
      success: true,
      currentMetrics,
      metricsHistory: metricsHistory
    });
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system metrics',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get available log files
 */
router.get('/logs', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const logFiles = monitoringService.getAvailableLogFiles();
    
    res.json({
      success: true,
      logFiles
    });
  } catch (error) {
    console.error('Error fetching log files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve log files',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get log file content
 */
router.get('/logs/:filename', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const fileName = req.params.filename;
    const maxLines = req.query.maxLines ? parseInt(req.query.maxLines as string) : 1000;
    
    // Security check on filename
    if (fileName.includes('..') || !fileName.endsWith('.log')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid log file name'
      });
    }
    
    const content = monitoringService.getLogFileContent(fileName, maxLines);
    
    res.json({
      success: true,
      fileName,
      content
    });
  } catch (error) {
    console.error('Error reading log file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to read log file',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Run health checks for all services
 */
async function checkServicesHealth() {
  // Database health check
  try {
    const dbResult = await testDatabaseConnection();
    if (dbResult && (dbResult as any).test === 1) {
      monitoringService.updateServiceHealth('database', 'healthy');
    } else {
      monitoringService.updateServiceHealth('database', 'degraded', undefined, 'Database connection test returned unexpected result');
    }
  } catch (error) {
    monitoringService.updateServiceHealth(
      'database', 
      'unhealthy', 
      undefined,
      error instanceof Error ? error.message : String(error)
    );
  }
  
  // Azure Storage health check
  try {
    await ensureContainerExists();
    monitoringService.updateServiceHealth('azure_storage', 'healthy');
  } catch (error) {
    console.error('Azure storage health check failed:', error);
    monitoringService.updateServiceHealth(
      'azure_storage', 
      'unhealthy', 
      undefined,
      error instanceof Error ? error.message : String(error)
    );
  }
  
  // Local Storage health check
  try {
    const testPath = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(testPath)) {
      fs.mkdirSync(testPath, { recursive: true });
    }
    const testFile = path.join(testPath, '.health-check');
    fs.writeFileSync(testFile, 'health check');
    fs.unlinkSync(testFile);
    monitoringService.updateServiceHealth('local_storage', 'healthy');
  } catch (error) {
    monitoringService.updateServiceHealth(
      'local_storage', 
      'unhealthy', 
      undefined,
      error instanceof Error ? error.message : String(error)
    );
  }
  
  // Email Service health check
  try {
    const isConfigured = !!process.env.SENDGRID_API_KEY;
    if (isConfigured) {
      monitoringService.updateServiceHealth('email_service', 'healthy');
    } else {
      monitoringService.updateServiceHealth('email_service', 'degraded', undefined, 'SendGrid API key not configured');
    }
  } catch (error) {
    monitoringService.updateServiceHealth(
      'email_service', 
      'unhealthy', 
      undefined,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Force creation of Azure Storage container
 */
router.post('/create-azure-container', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      return res.status(400).json({
        success: false,
        message: 'Azure Storage connection string is not configured'
      });
    }
    
    await ensureContainerExists();
    
    res.json({
      success: true,
      message: 'Azure Storage container created successfully'
    });
  } catch (error) {
    console.error('Error creating Azure Storage container:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Azure Storage container',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Test email service by sending a test email
 */
router.post('/test-email-service', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }
    
    // Send a test email
    try {
      const result = await SendGridService.sendTemplatedEmail({
        to: email,
        subject: 'Test Email from Carbon Credit Calculator',
        templateId: 'test',
        templateData: {
          name: (req.session as any)?.user?.username || 'Admin',
          timestamp: new Date().toISOString(),
          systemStatus: 'operational'
        }
      });
      
      monitoringService.updateServiceHealth('email_service', 'healthy');
      res.json({
        success: true,
        message: 'Test email sent successfully'
      });
    } catch (emailError) {
      const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
      monitoringService.updateServiceHealth('email_service', 'degraded', undefined, errorMessage);
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: errorMessage
      });
    }
  } catch (error) {
    monitoringService.updateServiceHealth(
      'email_service', 
      'unhealthy', 
      undefined,
      error instanceof Error ? error.message : String(error)
    );
    
    console.error('Error testing email service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test email service',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;