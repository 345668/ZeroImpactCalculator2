import express from 'express';
import { storage } from '../storage';
import { insertDmarcReportSchema, DmarcReport, InsertDmarcReport } from '@shared/schema';
import { SendGridService } from '../utils/sendgrid-service';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import * as xml2js from 'xml2js';
import { fileURLToPath } from 'url';

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = promisify(fs.readFile);
const router = express.Router();
const xmlParser = new xml2js.Parser({ explicitArray: false });
const parseXmlString = promisify<string, any>(xmlParser.parseString.bind(xmlParser));

// Configure multer for XML file uploads
const upload = multer({
  dest: path.join(__dirname, '../../uploads/dmarc'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only XML files
    if (file.mimetype === 'application/xml' || 
        file.mimetype === 'text/xml' || 
        file.originalname.endsWith('.xml')) {
      cb(null, true);
    } else {
      cb(new Error('Only XML files are allowed'));
    }
  }
});

// Define types for XML parsing
interface DmarcReportXML {
  feedback: {
    report_metadata: {
      report_id: string;
      org_name: string;
      date_range: {
        begin: number;
        end: number;
      };
    };
    policy_published: {
      domain: string;
    };
    record: Array<{
      row: {
        source_ip: string;
        source_org?: string;
        count: string;
        policy_evaluated: {
          disposition: string;
          dkim?: string;
          spf?: string;
          result?: string;
        };
      };
      auth_results: {
        dkim?: { result: string };
        spf?: { result: string };
      };
    }> | {
      row: {
        source_ip: string;
        source_org?: string;
        count: string;
        policy_evaluated: {
          disposition: string;
          dkim?: string;
          spf?: string;
          result?: string;
        };
      };
      auth_results: {
        dkim?: { result: string };
        spf?: { result: string };
      };
    };
  };
}

// Function to process XML DMARC report
async function processDmarcReport(xmlContent: string): Promise<InsertDmarcReport[]> {
  try {
    // Parse XML with type assertion
    const parsedXml = await parseXmlString(xmlContent) as DmarcReportXML;
    
    // DMARC report structure validation
    if (!parsedXml.feedback || !parsedXml.feedback.report_metadata || !parsedXml.feedback.policy_published || !parsedXml.feedback.record) {
      throw new Error('Invalid DMARC report format');
    }

    const metadata = parsedXml.feedback.report_metadata;
    const policy = parsedXml.feedback.policy_published;
    
    // Handle both single record and array of records
    const records = Array.isArray(parsedXml.feedback.record) 
      ? parsedXml.feedback.record 
      : [parsedXml.feedback.record];
    
    // Map XML records to DmarcReport objects
    return records.map((record) => {
      const row: Partial<InsertDmarcReport> = {
        reportId: metadata.report_id,
        domain: policy.domain,
        sourceIp: record.row.source_ip,
        sourceOrg: record.row.source_org || null,
        reportingOrg: metadata.org_name,
        count: parseInt(record.row.count, 10),
        disposition: record.row.policy_evaluated.disposition,
        dkimResult: record.auth_results.dkim ? record.auth_results.dkim.result : null,
        spfResult: record.auth_results.spf ? record.auth_results.spf.result : null,
        alignmentDkim: record.row.policy_evaluated.dkim || null,
        alignmentSpf: record.row.policy_evaluated.spf || null,
        policyEvaluated: record.row.policy_evaluated.result || null,
        reportDate: new Date(metadata.date_range.end * 1000), // Convert UNIX timestamp to Date
        rawReport: xmlContent,
      };
      
      // Validate with schema
      return insertDmarcReportSchema.parse(row);
    });
    
  } catch (error) {
    console.error('Error processing DMARC report:', error);
    throw error;
  }
}

// Get all DMARC reports
router.get('/', async (req, res) => {
  try {
    // Extract query parameters for filtering
    const domain = req.query.domain as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    // Query DB for reports (implementation needed in storage.ts)
    // For now, return all reports
    // TODO: Implement getDmarcReports in storage.ts with filtering
    const reports = await storage.getAllDmarcReports();
    
    res.json(reports);
  } catch (error) {
    console.error('Error fetching DMARC reports:', error);
    res.status(500).json({ error: 'Failed to fetch DMARC reports' });
  }
});

// Get a specific DMARC report by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Get report by ID (implementation needed in storage.ts)
    // TODO: Implement getDmarcReportById in storage.ts
    const report = await storage.getDmarcReportById(id);
    
    if (!report) {
      return res.status(404).json({ error: 'DMARC report not found' });
    }
    
    res.json(report);
  } catch (error) {
    console.error('Error fetching DMARC report:', error);
    res.status(500).json({ error: 'Failed to fetch DMARC report' });
  }
});

// Upload a DMARC report XML file
router.post('/upload', upload.single('report'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Read the uploaded file
    const filePath = req.file.path;
    const xmlContent = await readFile(filePath, 'utf8');
    
    // Process the DMARC report
    const parsedReports = await processDmarcReport(xmlContent);
    const savedReports: DmarcReport[] = [];
    
    // Save each report to the database
    for (const report of parsedReports) {
      // TODO: Implement createDmarcReport in storage.ts
      const savedReport = await storage.createDmarcReport(report);
      savedReports.push(savedReport);
      
      // Optionally send notification about new report
      const notificationEnabled = req.body.sendNotification === 'true';
      const notificationEmail = req.body.notificationEmail;
      
      if (notificationEnabled && notificationEmail) {
        await SendGridService.sendDmarcAlert(savedReport, notificationEmail);
      }
    }
    
    // Clean up: delete the temp file
    fs.unlink(filePath, err => {
      if (err) console.error('Error deleting temp file:', err);
    });
    
    res.status(201).json(savedReports);
  } catch (error) {
    console.error('Error processing DMARC report upload:', error);
    
    // Clean up on error
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to process DMARC report' });
    }
  }
});

// Process DMARC reports received via email
router.post('/process-email', async (req, res) => {
  try {
    // This endpoint would trigger the processing of DMARC reports from email
    const processedCount = await SendGridService.processDmarcEmails();
    
    res.json({ 
      message: 'DMARC email processing complete', 
      processed: processedCount 
    });
  } catch (error) {
    console.error('Error processing DMARC emails:', error);
    res.status(500).json({ error: 'Failed to process DMARC emails' });
  }
});

// Delete a DMARC report
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // TODO: Implement deleteDmarcReport in storage.ts
    const success = await storage.deleteDmarcReport(id);
    
    if (!success) {
      return res.status(404).json({ error: 'DMARC report not found or could not be deleted' });
    }
    
    res.json({ message: 'DMARC report deleted successfully' });
  } catch (error) {
    console.error('Error deleting DMARC report:', error);
    res.status(500).json({ error: 'Failed to delete DMARC report' });
  }
});

// Get analytics for DMARC reports
router.get('/analytics/summary', async (req, res) => {
  try {
    const domain = req.query.domain as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    // TODO: Implement getDmarcAnalytics in storage.ts
    // This would provide aggregated stats about DMARC reports
    const analytics = {
      totalReports: 0,
      passRate: 0,
      failRate: 0,
      topSources: [],
      reportsByDay: [],
      message: 'DMARC analytics feature to be implemented'
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching DMARC analytics:', error);
    res.status(500).json({ error: 'Failed to fetch DMARC analytics' });
  }
});

export default router;