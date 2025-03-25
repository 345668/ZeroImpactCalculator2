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

// Create a wrapper around xml2js for better error handling
async function parseXmlString(xmlContent: string): Promise<any> {
  try {
    console.log('XML Parse - Starting to parse XML');
    return new Promise((resolve, reject) => {
      xmlParser.parseString(xmlContent, (err, result) => {
        if (err) {
          console.error('XML Parse - Error in parsing:', err);
          reject(new Error(`XML parsing error: ${err.message}`));
        } else {
          console.log('XML Parse - Successfully parsed XML');
          resolve(result);
        }
      });
    });
  } catch (error) {
    console.error('XML Parse - Exception outside of parseString:', error);
    throw new Error(`XML parsing exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

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

// Helper function to validate disposition value
function validateDisposition(disposition: string): "none" | "quarantine" | "reject" {
  const validValues = ["none", "quarantine", "reject"];
  return validValues.includes(disposition) 
    ? (disposition as "none" | "quarantine" | "reject") 
    : "none"; // Default to "none" if invalid
}

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
          r?: string;  // Some reports use 'r' instead of 'result'
        };
      };
      auth_results: {
        dkim?: { result?: string; r?: string; };  // Some reports use 'r' instead of 'result'
        spf?: { result?: string; r?: string; };   // Some reports use 'r' instead of 'result'
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
          r?: string;  // Some reports use 'r' instead of 'result'
        };
      };
      auth_results: {
        dkim?: { result?: string; r?: string; };  // Some reports use 'r' instead of 'result'
        spf?: { result?: string; r?: string; };   // Some reports use 'r' instead of 'result'
      };
    };
  };
}

// Function to process XML DMARC report
async function processDmarcReport(xmlContent: string): Promise<InsertDmarcReport[]> {
  try {
    console.log('Starting to process DMARC XML content');
    
    // Parse XML with type assertion 
    console.log('Parsing XML string...');
    let parsedXml;
    try {
      parsedXml = await parseXmlString(xmlContent) as DmarcReportXML;
      console.log('XML parsed successfully:', JSON.stringify(parsedXml, null, 2).substring(0, 500) + '...');
    } catch (parseError) {
      console.error('XML parsing failed:', parseError);
      throw new Error(`XML parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    // DMARC report structure validation
    console.log('Validating DMARC report structure...');
    if (!parsedXml.feedback) {
      throw new Error('Invalid DMARC report: missing feedback element');
    }
    if (!parsedXml.feedback.report_metadata) {
      throw new Error('Invalid DMARC report: missing report_metadata');
    }
    if (!parsedXml.feedback.policy_published) {
      throw new Error('Invalid DMARC report: missing policy_published');
    }
    if (!parsedXml.feedback.record) {
      throw new Error('Invalid DMARC report: missing record data');
    }

    console.log('DMARC report structure is valid');
    const metadata = parsedXml.feedback.report_metadata;
    const policy = parsedXml.feedback.policy_published;
    
    // Handle both single record and array of records
    const records = Array.isArray(parsedXml.feedback.record) 
      ? parsedXml.feedback.record 
      : [parsedXml.feedback.record];
    
    console.log(`Processing ${records.length} records from DMARC report`);
    
    // Map XML records to DmarcReport objects
    const result: InsertDmarcReport[] = [];
    
    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];
        console.log(`Processing record ${i+1}/${records.length}`);
        
        if (!record.row) {
          console.error(`Record ${i+1} missing 'row' element`);
          continue;
        }
        
        if (!record.auth_results) {
          console.error(`Record ${i+1} missing 'auth_results' element`);
          continue;
        }
        
        const row: Partial<InsertDmarcReport> = {
          reportId: metadata.report_id,
          domain: policy.domain,
          sourceIp: record.row.source_ip,
          sourceOrg: record.row.source_org || null,
          reportingOrg: metadata.org_name,
          count: parseInt(record.row.count, 10),
          disposition: validateDisposition(record.row.policy_evaluated.disposition),
          dkimResult: record.auth_results.dkim ? (record.auth_results.dkim.result || record.auth_results.dkim.r) : null,
          spfResult: record.auth_results.spf ? (record.auth_results.spf.result || record.auth_results.spf.r) : null,
          alignmentDkim: record.row.policy_evaluated.dkim || null,
          alignmentSpf: record.row.policy_evaluated.spf || null,
          policyEvaluated: record.row.policy_evaluated.result || record.row.policy_evaluated.r || null,
          reportDate: new Date(metadata.date_range.end * 1000), // Convert UNIX timestamp to Date
          rawReport: xmlContent,
          processed: false,
          emailNotificationSent: false
        };
        
        // Print what we're about to validate
        console.log('Validating report data with schema:', JSON.stringify(row, null, 2));
        
        try {
          // Validate with schema
          const validatedReport = insertDmarcReportSchema.parse(row);
          result.push(validatedReport);
          console.log(`Record ${i+1} validated successfully`);
        } catch (validationError) {
          console.error(`Schema validation failed for record ${i+1}:`, validationError);
          throw validationError;
        }
      } catch (recordError) {
        console.error(`Error processing record ${i+1}:`, recordError);
        throw recordError;
      }
    }
    
    console.log(`Successfully processed ${result.length} DMARC report records`);
    return result;
    
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

// Parse XML content directly without file upload
router.post('/parse', async (req, res) => {
  try {
    console.log('DMARC parse endpoint called', { 
      contentType: req.headers['content-type'],
      bodyKeys: Object.keys(req.body),
      hasXml: 'xml' in req.body
    });
    
    const { xml } = req.body;
    
    if (!xml || typeof xml !== 'string') {
      return res.status(400).json({ error: 'XML content is required' });
    }
    
    // Process the DMARC report without saving to database
    console.log('About to process DMARC report, XML length:', xml.length);
    
    try {
      const parsedReports = await processDmarcReport(xml);
      console.log('Processed DMARC reports:', parsedReports);
      
      res.json({
        success: true,
        reports: parsedReports,
        message: 'DMARC XML parsed successfully'
      });
    } catch (parseError) {
      console.error('Error in processDmarcReport function:', parseError);
      if (parseError instanceof Error) {
        res.status(400).json({ error: `Error processing DMARC report: ${parseError.message}` });
      } else {
        res.status(500).json({ error: 'Internal error processing DMARC report' });
      }
    }
  } catch (error) {
    console.error('Error parsing DMARC XML:', error);
    
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to parse DMARC XML' });
    }
  }
});

// Upload a DMARC report XML file
router.post('/upload', upload.single('file'), async (req, res) => {
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

    // Define default dates if not provided (last 30 days)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    // Fetch DMARC reports based on filters
    let reports: DmarcReport[] = [];
    if (domain) {
      reports = await storage.getDmarcReportsByDomain(domain);
    } else if (startDate && endDate) {
      reports = await storage.getDmarcReportsByDateRange(startDate, endDate);
    } else {
      reports = await storage.getAllDmarcReports();
    }

    // Calculate total reports
    const totalReports = reports.length;
    
    // Calculate pass/fail rates (based on both DKIM and SPF)
    let passCount = 0;
    let failCount = 0;
    
    for (const report of reports) {
      if (report.dkimResult === 'pass' && report.spfResult === 'pass') {
        passCount++;
      } else if (report.dkimResult === 'fail' || report.spfResult === 'fail') {
        failCount++;
      }
      // Note: If both are neither pass nor fail (like 'neutral'), we don't count them in either category
    }
    
    const passRate = totalReports > 0 ? (passCount / totalReports) * 100 : 0;
    const failRate = totalReports > 0 ? (failCount / totalReports) * 100 : 0;
    
    // Calculate top sources (by IP address)
    const sourceMap = new Map<string, number>();
    for (const report of reports) {
      if (report.sourceIp) {
        const currentCount = sourceMap.get(report.sourceIp) || 0;
        sourceMap.set(report.sourceIp, currentCount + 1);
      }
    }
    
    const topSources = Array.from(sourceMap.entries())
      .map(([sourceIp, count]) => ({ sourceIp, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Get top 5
    
    // Group reports by day
    const reportsByDayMap = new Map<string, number>();
    for (const report of reports) {
      const dateStr = report.reportDate ? new Date(report.reportDate).toISOString().split('T')[0] : 'unknown';
      const currentCount = reportsByDayMap.get(dateStr) || 0;
      reportsByDayMap.set(dateStr, currentCount + 1);
    }
    
    const reportsByDay = Array.from(reportsByDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    const analytics = {
      totalReports,
      passRate: Math.round(passRate * 100) / 100, // Round to 2 decimal places
      failRate: Math.round(failRate * 100) / 100,
      topSources,
      reportsByDay,
      message: totalReports > 0 ? 'DMARC analytics generated successfully' : 'No DMARC reports found'
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching DMARC analytics:', error);
    res.status(500).json({ error: 'Failed to fetch DMARC analytics' });
  }
});

// Send a test DMARC notification email
router.post('/notifications/test', async (req, res) => {
  try {
    // Validate the request
    const { reportId, email } = req.body;
    
    if (!reportId || !email) {
      return res.status(400).json({ 
        error: 'Missing required parameters', 
        message: 'Both reportId and email are required' 
      });
    }
    
    // Get the report
    const report = await storage.getDmarcReportById(Number(reportId));
    if (!report) {
      return res.status(404).json({ 
        error: 'Report not found', 
        message: `No DMARC report found with ID ${reportId}` 
      });
    }
    
    // Send the notification
    const sendResult = await SendGridService.sendDmarcAlert(report, email);
    
    if (sendResult) {
      // Update the report status if email was sent successfully
      await storage.updateDmarcReportStatus(report.id, true, true);
      
      return res.status(200).json({ 
        success: true, 
        message: `DMARC notification sent to ${email}` 
      });
    } else {
      return res.status(500).json({ 
        error: 'Failed to send notification', 
        message: 'The email service was unable to send the notification. Check logs for details.' 
      });
    }
  } catch (error) {
    console.error('Error sending DMARC notification:', error);
    res.status(500).json({ 
      error: 'Failed to send DMARC notification', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;