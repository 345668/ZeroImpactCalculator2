import express, { type Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage.js";
import { insertSubmissionSchema, calculationResultSchema, submissions } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { extractTextFromDocument, processWithMistral } from "./utils/document-processor.js";
import { EmailService } from "./services/email.js";
import { uploadFileToBlobStorage, ensureContainerExists, getBlobUrl } from "./utils/azure-storage.js";
import aiRouter from "./routes/ai.js";
import emailRouter from "./routes/email.js";
import emailTemplatesRouter from "./routes/email-templates.js";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { testDatabaseConnection } from "./database.js";
import { performBackup } from "./utils/backup.js";
import { calculateCarbonCredits } from "./calculators/carbon-credits.js";
import * as z from 'zod';
import { eq } from "drizzle-orm";
import { db } from "./db.js";
import { syncSubmissionToTable } from "./utils/azure-table-storage.js";
import { AZURE_STORAGE_CONFIG } from "@shared/config";
import { detectLanguageFromIP } from "./utils/language-detector.js";

// Configure multer with stricter limits for production
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: process.env.NODE_ENV === 'production' ? 5 * 1024 * 1024 : 10 * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 0,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

const calculationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many calculation requests, please try again later.' }
});

// Calculate endpoint with updated error handling and validation
const calculateEndpoint = async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  console.log('Received calculation request:', req.body);

  try {
    const validatedData = insertSubmissionSchema.parse(req.body);
    console.log('Validated input data:', validatedData);

    // Production data validation
    if (process.env.NODE_ENV === 'production') {
      if (validatedData.currentConsumption <= 0 || validatedData.projectedConsumption < 0) {
        return res.status(400).json({ error: "Invalid consumption values" });
      }
    }

    // Calculate carbon credits with validated energy source
    const result = calculateCarbonCredits(
      Number(validatedData.currentConsumption),
      Number(validatedData.projectedConsumption),
      validatedData.currentEnergySource,
      "heat pump (electricity mix)" // Target energy source is always heat pump
    );

    console.log('Carbon credit calculation results:', result);

    // Validate calculation results
    const calculationResults = calculationResultSchema.parse({
      co2Savings: result.annualCO2Savings,
      carbonCredits: result.annualCO2Savings,
      financialValue: result.financialValue,
      tenYearProjection: {
        co2Savings: result.tenYearCO2Savings,
        carbonCredits: result.tenYearCO2Savings,
        financialValue: result.tenYearFinancialValue
      }
    });

    // Prepare submission data with validated calculations
    const submissionData = {
      ...validatedData,
      co2Savings: calculationResults.co2Savings,
      carbonCredits: calculationResults.carbonCredits,
      financialValue: calculationResults.financialValue,
      calculationDetails: JSON.stringify({
        currentConsumptionKWh: validatedData.currentConsumption,
        projectedConsumptionKWh: validatedData.projectedConsumption,
        annualCO2Savings: calculationResults.co2Savings,
        tenYearProjection: calculationResults.tenYearProjection,
        energyReductionPercent: ((Number(validatedData.currentConsumption) - Number(validatedData.projectedConsumption)) / Number(validatedData.currentConsumption) * 100)
      })
    };

    console.log('Creating submission with data:', submissionData);
    const submission = await storage.createSubmission(submissionData);
    console.log('Submission created successfully:', submission);

    // Log performance metrics in production
    if (process.env.NODE_ENV === 'production') {
      console.log(`Calculation completed in ${Date.now() - startTime}ms`);
    }

    res.json({
      ...submission,
      tenYearProjection: calculationResults.tenYearProjection
    });
  } catch (error) {
    console.error('Calculation error:', error);

    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }

    res.status(500).json({
      error: process.env.NODE_ENV === 'production' 
        ? "Internal server error" 
        : error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('Starting route registration...');
  const httpServer = createServer(app);

  // Apply security middleware in production
  if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
  }

  // Register API routes
  app.use('/api/ai', aiRouter);
  app.use('/api/email', emailRouter);
  app.use('/api/email-templates', emailTemplatesRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);

  // Apply rate limiting
  if (process.env.NODE_ENV === 'production') {
    app.use('/api/auth', authLimiter);
    app.use('/api/calculate', calculationLimiter);
    app.use('/api/', apiLimiter);
  }

  // Register calculation endpoint
  app.post("/api/calculate", calculateEndpoint);

  // Submissions endpoints
  app.post("/api/submissions/sync", async (_req, res) => {
    try {
      console.log('Received submissions sync request');
      await storage.syncSubmissions();
      res.json({ success: true, message: "Submissions synced successfully" });
    } catch (error) {
      console.error('Error during submissions sync:', error);
      res.status(500).json({
        message: "Error syncing submissions",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/submissions", async (_req, res) => {
    try {
      console.log('Fetching all submissions');
      const submissions = await storage.getAllSubmissions();
      console.log(`Found ${submissions.length} submissions`);
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({
        message: "Error fetching submissions",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Email report endpoint
  app.post("/api/send-report", async (req, res) => {
    try {
      console.log('Received report email request:', req.body);

      const { submissionId } = req.body;
      if (!submissionId) {
        return res.status(400).json({ error: "Submission ID is required" });
      }

      const submission = await storage.getSubmissionById(submissionId);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      await EmailService.sendCarbonReport(submission);
      await storage.updateEmailStatus(submissionId);

      console.log('Report sent and status updated for submission:', submissionId);
      res.json({ success: true, message: "Report sent successfully" });
    } catch (error) {
      console.error('Error sending report:', error);
      res.status(500).json({
        message: "Error sending report",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Document upload endpoint with improved data handling and submission updates
  app.post("/api/upload-document", upload.single('document'), async (req, res) => {
    const startTime = Date.now();
    console.log('Upload request received:', req.file ? 'File present' : 'No file');

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Get email from request body or query params if provided
      const userEmail = req.body.email || req.query.email as string;
      const submissionId = req.body.submissionId ? parseInt(req.body.submissionId as string) : 
                          (req.query.submissionId ? parseInt(req.query.submissionId as string) : undefined);

      // Process document with user context if available
      console.log('Processing document with context:', {
        filename: req.file.originalname,
        email: userEmail || 'Not provided',
        submissionId: submissionId || 'Not provided'
      });
      
      const processedData = await processDocument(req.file, {
        email: userEmail,
        submissionId: submissionId
      });

      // Log processing time in production
      if (process.env.NODE_ENV === 'production') {
        console.log(`Document processing completed in ${Date.now() - startTime}ms`);
      }
      
      // If we have a submissionId, update the submission with the new file information
      if (submissionId) {
        try {
          console.log(`Updating submission ${submissionId} with file information`);
          
          // Get the submission to update
          const submission = await storage.getSubmissionById(submissionId);
          
          if (submission) {
            // Update the submission with the new file details
            await db.update(submissions)
              .set({
                fileUrl: processedData.fileUrl,
                fileName: req.file.originalname,
                fileSize: String(req.file.size),
                fileType: req.file.mimetype,
                fileUploadedAt: new Date(),
                fileMetadata: JSON.stringify(processedData.extractionMetadata || {})
              })
              .where(eq(submissions.id, submissionId));
              
            console.log(`Submission ${submissionId} updated with file information`);
            
            // If Azure Table Storage is enabled, sync the updated submission
            if (AZURE_STORAGE_CONFIG.tableStorage.enabled) {
              const updatedSubmission = await storage.getSubmissionById(submissionId);
              if (updatedSubmission) {
                await syncSubmissionToTable(updatedSubmission);
                console.log(`Submission ${submissionId} synced to Azure Table Storage`);
              }
            }
          } else {
            console.log(`Submission with ID ${submissionId} not found for update`);
          }
        } catch (updateError) {
          console.error('Error updating submission with file information:', updateError);
          // Continue with the response even if update fails
        }
      }

      // Return enhanced response with extracted data and file information
      res.json({
        message: "Document processed successfully",
        extractedData: processedData,
        fileInfo: {
          name: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype,
          url: processedData.fileUrl,
          uploadedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Document processing error:', error);
      res.status(500).json({
        error: process.env.NODE_ENV === 'production' 
          ? "Error processing document" 
          : error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Language detection endpoint
  app.get("/api/detect-language", (req, res) => {
    try {
      console.log('Language detection request received');
      const detectedLanguage = detectLanguageFromIP(req);
      console.log(`Detected language: ${detectedLanguage}`);
      res.json({ language: detectedLanguage });
    } catch (error) {
      console.error('Language detection error:', error);
      res.status(500).json({
        error: "Error detecting language",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", async (_req, res) => {
    try {
      const dbStatus = await testDatabaseConnection();

      let emailStatus = "unknown";
      try {
        await EmailService.sendTestEmail(process.env.ADMIN_EMAIL || "test@example.com");
        emailStatus = "healthy";
      } catch (error) {
        emailStatus = "unhealthy";
        console.error('Email service health check failed:', error);
      }

      const health = {
        status: dbStatus && emailStatus === "healthy" ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
        services: {
          database: dbStatus ? "healthy" : "unhealthy",
          email: emailStatus,
        },
        environment: process.env.NODE_ENV,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };

      const statusCode = health.status === "healthy" ? 200 :
        health.status === "degraded" ? 503 : 500;

      res.status(statusCode).json(health);
    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'production' ? "Service unavailable" : error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Azure container setup
  try {
    await ensureContainerExists();
    console.log('Azure container setup complete');
  } catch (error) {
    console.error('Failed to setup Azure container:', error);
    console.warn('Continuing without Azure Blob Storage functionality');
    // Don't throw the error - allow the application to start without Azure Blob Storage
  }

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const errorId = Math.random().toString(36).substring(7);

    console.error('Express error:', {
      errorId,
      error: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
      path: req.path,
      method: req.method,
      body: process.env.NODE_ENV === 'production' ? undefined : req.body,
      timestamp: new Date().toISOString(),
      headers: process.env.NODE_ENV === 'production' ? undefined : req.headers
    });

    let statusCode = 500;
    if (err.name === "ValidationError") statusCode = 400;
    if (err.name === "UnauthorizedError") statusCode = 401;
    if (err.name === "NotFoundError") statusCode = 404;

    res.status(statusCode).json({
      error: process.env.NODE_ENV === 'production' ? "An error occurred" : err.message,
      errorId,
      ...(process.env.NODE_ENV === 'production' ? {} : { stack: err.stack })
    });
  });

  // Development-only backup test endpoint
  if (process.env.NODE_ENV !== 'production') {
    app.post("/api/test-backup", async (_req, res) => {
      try {
        console.log('Manual backup test initiated');
        await performBackup();
        res.json({
          success: true,
          message: "Backup completed successfully",
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Manual backup test failed:', error);
        res.status(500).json({
          success: false,
          message: "Backup failed",
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  // Document URL retrieval endpoint
  app.get("/api/documents/url", async (req, res) => {
    try {
      const { path } = req.query;
      
      if (!path || typeof path !== 'string') {
        return res.status(400).json({
          success: false,
          message: "Missing or invalid document path"
        });
      }

      // Check if Azure Storage connection is available
      if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
        return res.status(503).json({
          success: false,
          message: "Document storage is currently unavailable",
          details: "Azure Blob Storage is not properly configured"
        });
      }

      console.log(`Attempting to get secure URL for document path: ${path}`);
      
      // Extract the blob name from the URL if it's a full URL
      let blobPath = path;
      
      // If this is a full URL, extract just the path part
      if (path.includes('://')) {
        try {
          const url = new URL(path);
          const segments = url.pathname.split('/');
          
          // Remove the container name if it's in the path
          const containerIndex = segments.findIndex(segment => 
            segment === 'carbon-credits-docs');
            
          if (containerIndex !== -1 && containerIndex < segments.length - 1) {
            // Extract the path after the container name
            blobPath = segments.slice(containerIndex + 1).join('/');
          } else {
            // Use the path as-is without the leading slash
            blobPath = url.pathname.startsWith('/') 
              ? url.pathname.substring(1) 
              : url.pathname;
          }
        } catch (parseError) {
          console.error('Error parsing document URL:', parseError);
          // If URL parsing fails, use the original path
        }
      }

      console.log(`Resolved blob path: ${blobPath}`);
      
      // Get a fresh URL from the Azure Storage
      const url = await getBlobUrl(blobPath);
      
      if (!url) {
        return res.status(404).json({
          success: false,
          message: "Document not found or inaccessible",
          details: "The document storage service could not retrieve this file. It may have been moved or deleted, or the storage service may be temporarily unavailable."
        });
      }
      
      res.json({
        success: true,
        url
      });
    } catch (error) {
      console.error('Error retrieving document URL:', error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve document URL",
        details: "There was a problem accessing the document storage service. This may be due to temporary connection issues.",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Add API route middleware
  app.use('/api', (req, res, next) => {
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.setHeader('Content-Type', 'application/json');
    }
    next();
  });


  // Production-only middleware for logging requests
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        console.log({
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration: Date.now() - start,
          timestamp: new Date().toISOString()
        });
      });
      next();
    });
  }

  console.log('Route registration completed successfully');
  return httpServer;
}

// Document processing helper
async function processDocument(file: Express.Multer.File, options?: { email?: string; submissionId?: number }) {
  try {
    console.log('Starting document processing...');

    // Set document type based on file mime type
    const documentType = file.mimetype.startsWith('image/') 
      ? 'energy-certificates-images' 
      : 'energy-certificates-pdf';

    // Upload to Azure Blob Storage with organized structure
    console.log('Uploading to Azure Blob Storage with organization...');
    
    // Attempt upload
    let fileUrl = '';
    try {
      // Try to ensure container exists first
      try {
        await ensureContainerExists();
      } catch (containerError) {
        console.warn('Failed to ensure Azure container exists:', containerError);
        // Continue processing even if container setup fails
      }
      
      // Attempt to upload the file
      fileUrl = await uploadFileToBlobStorage(file, {
        documentType,
        email: options?.email,
        submissionId: options?.submissionId
      });
      console.log('File uploaded successfully, URL:', fileUrl);
    } catch (uploadError) {
      console.error('Error uploading file to Azure:', uploadError);
      // Continue with processing even if the upload failed
    }

    // Extract and process text
    const extractedText = await extractTextFromDocument(file);
    console.log('Text extracted successfully');

    const processedData = await processWithMistral(extractedText);
    console.log('Mistral processing complete:', processedData);

    // Store information about the extracted data for traceability
    const extractionMetadata = {
      processingDate: new Date().toISOString(),
      documentType,
      fileSize: file.size,
      fileName: file.originalname,
      mimeType: file.mimetype,
      languageDetected: processedData.language || 'unknown',
      extractedFields: Object.keys(processedData).join(','),
      fileUrl // Include file URL in metadata
    };

    console.log('Document processing metadata:', extractionMetadata);

    return {
      ...processedData,
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      fileUploadedAt: new Date().toISOString(),
      extractionMetadata
    };
  } catch (error) {
    console.error('Document processing error:', error);
    throw error;
  }
}

// Energy conversion constants (2024)
const CONVERSION_FACTORS = {
  "natural gas": 10.4,  // 1 m³ = 10.4 kWh
  "heating oil": 9.4,   // 1 L = 9.4 kWh
  "wood pellets": 4.8   // 1 kg = 4.8 kWh
};

// CO₂ emission factors (kg CO₂/kWh) for 2024
const EMISSION_FACTORS = {
  "heating oil": 0.266,
  "natural gas": 0.202,
  "liquefied petroleum gas": 0.234,
  "district heating": 0.195,
  "electricity mix": 0.343,
  "heat pump (electricity mix)": 0.086  // COP 4.0
};

const CARBON_PRICE_PER_TON = 50;  // EUR per ton
const CREDITING_PERIOD_YEARS = 10;