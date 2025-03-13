import express, { type Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage.js";
import { insertSubmissionSchema } from "@shared/schema.js";
import { fromZodError } from "zod-validation-error";
import { extractTextFromDocument, processWithMistral } from "./utils/document-processor.js";
import { EmailService } from "./services/email.js";
import { uploadFileToBlobStorage, ensureContainerExists } from "./utils/azure-storage.js";
import aiRouter from "./routes/ai.js";
import emailRouter from "./routes/email.js";
import authRouter from "./routes/auth.js";

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

  // Ensure Azure container exists
  try {
    await ensureContainerExists();
    console.log('Azure container setup complete');
  } catch (error) {
    console.error('Failed to setup Azure container:', error);
  }

  // Add CORS headers middleware
  app.use((req, res, next) => {
    res.header('Content-Type', 'application/json');
    next();
  });

  // Register API routes
  app.use('/api/ai', aiRouter);
  app.use('/api/email', emailRouter);
  app.use('/api/auth', authRouter);

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

  // Calculate endpoint
  app.post("/api/calculate", async (req, res) => {
    try {
      console.log('Received calculation request:', req.body);
      const validatedData = insertSubmissionSchema.parse(req.body);
      console.log('Validation successful:', validatedData);

      // Calculate annual savings
      const consumptionDiff = Number(validatedData.currentConsumption) - Number(validatedData.projectedConsumption);
      const annualCO2Savings = Number((consumptionDiff * 0.2).toFixed(2)); // tons of CO2 per year

      // Project over 10 years
      const co2Savings = (annualCO2Savings * 10).toString(); // 10 year projection
      const carbonCredits = co2Savings; // 1:1 ratio with CO2 savings
      const financialValue = (Number(carbonCredits) * 50).toString(); // €50 per credit

      // Add calculations to the submission data
      const submissionData = {
        ...validatedData,
        co2Savings,
        carbonCredits,
        financialValue
      };

      console.log('Creating submission with data:', submissionData);
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