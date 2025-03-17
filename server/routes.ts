import express, { type Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage.js";
import { insertSubmissionSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { extractTextFromDocument, processWithMistral } from "./utils/document-processor.js";
import { EmailService } from "./services/email.js";
import { uploadFileToBlobStorage, ensureContainerExists } from "./utils/azure-storage.js";
import aiRouter from "./routes/ai.js";
import emailRouter from "./routes/email.js";
import authRouter from "./routes/auth.js";
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import {testDatabaseConnection} from "./database.js"; //Import for health check

// Enhance rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 0, // Limit each IP to 100 requests per windowMs in production
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Create specific limiters for different endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit auth attempts
  message: { error: 'Too many authentication attempts, please try again later.' }
});

const calculationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit calculations per minute
  message: { error: 'Too many calculation requests, please try again later.' }
});

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

// Calculate endpoint with enhanced carbon calculations
const calculateEndpoint = async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    console.log('Received calculation request');

    try {
      const validatedData = insertSubmissionSchema.parse(req.body);
      console.log('Validated input data:', validatedData);

      // Production data validation
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        if (validatedData.currentConsumption <= 0 || validatedData.projectedConsumption < 0) {
          return res.status(400).json({ error: "Invalid consumption values" });
        }
      }

      // Current consumption is in kWh/year
      const currentConsumptionKWh = Number(validatedData.currentConsumption);
      console.log('Current consumption (kWh):', currentConsumptionKWh);

      // Calculate current CO₂ emissions using natural gas factor (kg CO₂)
      const currentCO2Emissions = currentConsumptionKWh * EMISSION_FACTORS["natural gas"];
      console.log('Current CO₂ emissions (kg):', currentCO2Emissions);

      // Calculate new system CO₂ emissions using electricity mix factor (kg CO₂)
      const projectedConsumptionKWh = Number(validatedData.projectedConsumption);
      const newCO2Emissions = projectedConsumptionKWh * EMISSION_FACTORS["electricity mix"];
      console.log('New CO₂ emissions (kg):', newCO2Emissions);

      // Calculate annual CO₂ savings in tons (1000 kg = 1 ton)
      const annualCO2Savings = (currentCO2Emissions - newCO2Emissions) / 1000;
      console.log('Annual CO₂ savings (tons):', annualCO2Savings);

      // For single year values (with 2 decimal precision)
      const co2Savings = annualCO2Savings.toFixed(2);
      const carbonCredits = co2Savings; // 1:1 ratio with CO2 savings
      const financialValue = (Number(carbonCredits) * CARBON_PRICE_PER_TON).toFixed(2);

      // Calculate 10-year projections
      const tenYearCO2Savings = (annualCO2Savings * CREDITING_PERIOD_YEARS).toFixed(2);
      const tenYearCarbonCredits = tenYearCO2Savings;
      const tenYearFinancialValue = (Number(tenYearCO2Savings) * CARBON_PRICE_PER_TON).toFixed(2);

      console.log('Calculation results:', {
        annualValues: {
          co2Savings,
          carbonCredits,
          financialValue
        },
        tenYearProjection: {
          co2Savings: tenYearCO2Savings,
          carbonCredits: tenYearCarbonCredits,
          financialValue: tenYearFinancialValue
        }
      });

      // Add calculations to the submission data
      const submissionData = {
        ...validatedData,
        co2Savings,
        carbonCredits,
        financialValue,
        calculationDetails: JSON.stringify({
          currentConsumptionKWh,
          currentCO2Emissions: currentCO2Emissions.toFixed(2),
          newCO2Emissions: newCO2Emissions.toFixed(2),
          annualCO2Savings: annualCO2Savings.toFixed(2),
          tenYearProjection: {
            co2Savings: tenYearCO2Savings,
            carbonCredits: tenYearCarbonCredits,
            financialValue: tenYearFinancialValue
          },
          energyReductionPercent: ((currentConsumptionKWh - projectedConsumptionKWh) / currentConsumptionKWh * 100).toFixed(1)
        })
      };

      console.log('Creating submission with data:', submissionData);
      const result = await storage.createSubmission(submissionData);
      console.log('Submission created:', result);

      // Log performance metrics in production
      if (isProduction) {
        console.log(`Calculation completed in ${Date.now() - startTime}ms`);
      }

      res.json({
        ...result,
        tenYearProjection: {
          co2Savings: tenYearCO2Savings,
          carbonCredits: tenYearCarbonCredits,
          financialValue: tenYearFinancialValue
        }
      });
    } catch (error) {
      console.error('Calculation error:', error);

      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({
          error: isProduction ? "Internal server error" : error.message
        });
      }
    }
};

// Document processing function
async function processDocument(file: Express.Multer.File) {
  try {
    console.log('Starting document processing...');

    // First upload to Azure Blob Storage
    console.log('Uploading to Azure Blob Storage...');
    const fileUrl = await uploadFileToBlobStorage(file);
    console.log('File uploaded successfully, URL:', fileUrl);

    // Extract text from document
    const extractedText = await extractTextFromDocument(file);
    console.log('Text extracted successfully');

    // Process with Mistral
    const processedData = await processWithMistral(extractedText);
    console.log('Mistral processing complete:', processedData);

    return {
      ...processedData,
      fileUrl // Include the Azure Blob Storage URL
    };
  } catch (error) {
    console.error('Document processing error:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('Starting route registration...');
  const isProduction = process.env.NODE_ENV === 'production';

  // Apply rate limiting to specific routes
  if (isProduction) {
    app.use('/api/auth', authLimiter);
    app.use('/api/calculate', calculationLimiter);
    app.use('/api/', apiLimiter); // General API rate limiting
  }

  // Enhanced health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // Check database connection
      const dbStatus = await testDatabaseConnection();

      // Check email service
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

      // Set appropriate status code based on service health
      const statusCode = health.status === "healthy" ? 200 : 
                        health.status === "degraded" ? 503 : 500;

      res.status(statusCode).json(health);
    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'production' ? "Service unavailable" : error.message
      });
    }
  });

  // Ensure Azure container exists
  try {
    await ensureContainerExists();
    console.log('Azure container setup complete');
  } catch (error) {
    console.error('Failed to setup Azure container:', error);
    throw error; // In production, we want to fail fast if critical services are unavailable
  }

  // Configure multer with stricter limits for production
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: isProduction ? 5 * 1024 * 1024 : 10 * 1024 * 1024,
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

  // Register API routes
  app.use('/api/ai', aiRouter);
  app.use('/api/email', emailRouter);
  app.use('/api/auth', authRouter);

  // Calculate endpoint
  app.post("/api/calculate", calculateEndpoint);

  // Document upload endpoint with production safeguards
  app.post("/api/upload-document", upload.single('document'), async (req, res) => {
    const startTime = Date.now();
    console.log('Upload request received:', req.file ? 'File present' : 'No file');

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Production file validation
      if (isProduction) {
        // Additional security checks for production
        if (req.file.size === 0) {
          return res.status(400).json({ error: "Empty file detected" });
        }
      }

      console.log('Processing file:', req.file.originalname);
      const processedData = await processDocument(req.file);

      // Log processing time in production
      if (isProduction) {
        console.log(`Document processing completed in ${Date.now() - startTime}ms`);
      }

      res.json({
        message: "Document processed successfully",
        extractedData: processedData
      });
    } catch (error) {
      console.error('Document processing error:', error);

      // Production-safe error response
      res.status(500).json({
        error: isProduction ? "Error processing document" : error.message
      });
    }
  });


  // Add new sync endpoint
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

  // Add GET all submissions endpoint
  app.get("/api/submissions", async (req, res) => {
    try {
      console.log('Fetching all submissions from database');
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

  // Update the send-report endpoint
  app.post("/api/send-report", async (req, res) => {
    try {
      console.log('Received report email request:', req.body);

      const { submissionId } = req.body;
      if (!submissionId) {
        return res.status(400).json({ error: "Submission ID is required" });
      }

      // Get the submission
      const submission = await storage.getSubmissionById(submissionId);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Send the email
      await EmailService.sendCarbonReport(submission);

      // Update email status in database
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

  // Enhanced error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const errorId = Math.random().toString(36).substring(7);

    // Log error with context
    console.error('Express error:', {
      errorId,
      error: err.message,
      stack: isProduction ? undefined : err.stack,
      path: req.path,
      method: req.method,
      body: isProduction ? undefined : req.body,
      timestamp: new Date().toISOString(),
      headers: isProduction ? undefined : req.headers
    });

    // Determine status code based on error type
    let statusCode = 500;
    if (err.name === "ValidationError") statusCode = 400;
    if (err.name === "UnauthorizedError") statusCode = 401;
    if (err.name === "NotFoundError") statusCode = 404;

    // Send safe error response
    res.status(statusCode).json({
      error: isProduction ? "An error occurred" : err.message,
      errorId,
      ...(isProduction ? {} : { stack: err.stack })
    });
  });

  // Production-only middleware
  if (isProduction) {
    // Add security headers
    app.use(helmet());

    // Log all requests in production
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
  const httpServer = createServer(app);
  return httpServer;
}