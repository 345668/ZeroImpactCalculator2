import express, { type Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage.js";
import { insertSubmissionSchema } from "@shared/schema.js";
import { fromZodError } from "zod-validation-error";
import { extractTextFromDocument, processWithMistral } from "./utils/document-processor.js";
import { sendReportEmail } from "./utils/email-service.js";
import aiRouter from "./routes/ai.js";
import emailRouter from "./routes/email.js";
import { 
  calculateCO2Savings, 
  calculateCarbonCredits, 
  calculateFinancialValue,
  heatingSystemSchema
} from "./utils/carbon-calculator.js";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    // Accept only PDFs and images
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

async function processDocument(file: Express.Multer.File) {
  try {
    console.log('Starting document processing...');
    const extractedText = await extractTextFromDocument(file);
    console.log('Text extracted successfully');
    const processedData = await processWithMistral(extractedText);
    console.log('Mistral processing complete:', processedData);
    return processedData;
  } catch (error) {
    console.error('Document processing error:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('Starting route registration...');

  // Add CORS headers middleware
  app.use((req, res, next) => {
    res.header('Content-Type', 'application/json');
    next();
  });

  // Register API routes first
  app.use('/api/ai', aiRouter);
  app.use('/api/email', emailRouter);

  // GET all submissions endpoint
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

  // Document upload endpoint
  app.post("/api/upload-document", upload.single('document'), async (req, res) => {
    console.log('Upload request received:', req.file ? 'File present' : 'No file');

    try {
      if (!req.file) {
        console.error('No file in request');
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log('Processing file:', req.file.originalname);
      const processedData = await processDocument(req.file);
      console.log('File processed successfully');

      res.json({
        message: "Document processed successfully",
        extractedData: processedData
      });
    } catch (error) {
      console.error('Document processing error:', error);
      res.status(500).json({
        message: "Error processing document",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Calculate endpoint
  app.post("/api/calculate", async (req, res) => {
    try {
      console.log('Received calculation request:', req.body);
      const validatedData = insertSubmissionSchema.parse(req.body);
      console.log('Validation successful:', validatedData);

      // Parse heating system type
      const heatingSystem = heatingSystemSchema.parse(validatedData.heatingSystem.toLowerCase());

      // Calculate CO2 savings using the new utility functions
      const annualCO2Savings = calculateCO2Savings(
        heatingSystem,
        Number(validatedData.currentConsumption),
        Number(validatedData.projectedConsumption)
      );

      // Calculate carbon credits and financial value
      const carbonCredits = calculateCarbonCredits(annualCO2Savings);
      const financialValue = calculateFinancialValue(carbonCredits);

      // Add calculations to the submission data
      const submissionData = {
        ...validatedData,
        co2Savings: annualCO2Savings.toString(),
        carbonCredits: carbonCredits.toString(),
        financialValue: financialValue.toString()
      };

      const result = await storage.createSubmission(submissionData);
      console.log('Submission created:', result);
      res.json(result);
    } catch (error) {
      console.error('Calculation error:', error);
      if (error instanceof Error && error.name === "ZodError") {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ 
          message: "Internal server error",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // Error handling middleware
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Express error:', err);
    res.status(500).json({
      message: "Internal server error",
      error: err instanceof Error ? err.message : "Unknown error"
    });
  });

  console.log('Route registration completed successfully');
  const httpServer = createServer(app);
  return httpServer;
}