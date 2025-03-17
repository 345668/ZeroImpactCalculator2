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

// Configure multer for file uploads
const isProduction = process.env.NODE_ENV === 'production';

// Configure rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 0, // Limit each IP to 100 requests per windowMs in production
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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

  // Apply rate limiting to API routes in production
  if (isProduction) {
    app.use('/api/', apiLimiter);
  }

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
      fileSize: isProduction ? 5 * 1024 * 1024 : 10 * 1024 * 1024, // 5MB in production, 10MB in development
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

  // Add security headers middleware
  app.use((req, res, next) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.replit.app https://api.openai.com;");

    // Cache control for static assets
    if (req.url.match(/\.(css|js|jpg|jpeg|png|gif|ico|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  });

  // Register API routes
  app.use('/api/ai', aiRouter);
  app.use('/api/email', emailRouter);
  app.use('/api/auth', authRouter);

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

  // Energy conversion constants
  const ENERGY_CONVERSION = {
    gas: 10.4,    // kWh per m³
    oil: 9.4,     // kWh per L
    pellet: 4.8,  // kWh per kg
  };

  // CO₂ emission factors (kg CO₂ per kWh)
  const EMISSION_FACTORS = {
    gas: 0.24,
    oil: 0.30,
    pellet: 0.10,
    electricity: 0.343,
  };

  // Calculate endpoint with enhanced carbon calculations
  app.post("/api/calculate", async (req, res) => {
    const startTime = Date.now();

    try {
      console.log('Received calculation request');
      const validatedData = insertSubmissionSchema.parse(req.body);

      // Production data validation
      if (isProduction) {
        // Additional validation checks
        if (validatedData.currentConsumption <= 0 || validatedData.projectedConsumption < 0) {
          return res.status(400).json({ error: "Invalid consumption values" });
        }
      }

      // Convert current energy consumption to kWh
      const currentEnergySource = validatedData.currentEnergySource?.toLowerCase() || 'gas';
      const energyConversionFactor = ENERGY_CONVERSION[currentEnergySource];
      const currentConsumptionKWh = Number(validatedData.currentConsumption) * (energyConversionFactor || 1);

      // Calculate current CO₂ emissions
      const currentEmissionFactor = EMISSION_FACTORS[currentEnergySource];
      const currentCO2Emissions = currentConsumptionKWh * currentEmissionFactor;

      // Calculate new system CO₂ emissions (assuming electric heat pump)
      const projectedConsumptionKWh = Number(validatedData.projectedConsumption);
      const newCO2Emissions = projectedConsumptionKWh * EMISSION_FACTORS.electricity;

      // Calculate annual CO₂ savings in tons (1000 kg = 1 ton)
      const annualCO2Savings = (currentCO2Emissions - newCO2Emissions) / 1000;

      // For single year values
      const co2Savings = annualCO2Savings.toFixed(2);
      const carbonCredits = co2Savings; // 1:1 ratio with CO2 savings
      const financialValue = (Number(carbonCredits) * 50).toFixed(2); // €50 per credit

      // Calculate 10-year projections
      const tenYearCO2Savings = (annualCO2Savings * 10).toFixed(2);
      const tenYearCarbonCredits = tenYearCO2Savings;
      const tenYearFinancialValue = (Number(tenYearCO2Savings) * 50).toFixed(2);

      // Add calculations to the submission data
      const submissionData = {
        ...validatedData,
        co2Savings,
        carbonCredits,
        financialValue,
        calculationDetails: JSON.stringify({
          currentConsumptionKWh,
          currentCO2Emissions,
          newCO2Emissions,
          annualCO2Savings,
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


  // Error handling middleware enhanced for production
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Express error:', err);

    // Production-safe error response
    res.status(500).json({
      error: isProduction ? "Internal server error" : err.message,
      ...(isProduction ? {} : { stack: err.stack })
    });
  });

  console.log('Route registration completed successfully');
  const httpServer = createServer(app);
  return httpServer;
}