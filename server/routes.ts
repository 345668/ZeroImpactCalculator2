import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertSubmissionSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { uploadFileToBlobStorage, ensureContainerExists } from "./utils/azure-storage";
import { extractTextFromDocument, processWithMistral } from "./utils/document-processor";
import { generatePDFReport } from "./utils/pdf-generator";
import { sendReportEmail } from "./utils/email-service"; // Fixed import path

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

async function processDocument(file: Express.Multer.File) {
  try {
    console.log('Starting document processing...');

    // Extract text from document
    console.log('Extracting text from document...');
    const extractedText = await extractTextFromDocument(file);
    console.log('Text extracted successfully');

    // Process with Mistral AI
    console.log('Processing with Mistral AI...');
    const processedData = await processWithMistral(extractedText);
    console.log('Mistral processing complete:', processedData);

    // Upload to Azure Blob Storage
    console.log('Uploading to Azure Blob Storage...');
    const fileUrl = await uploadFileToBlobStorage(file);
    console.log('File uploaded successfully');

    return {
      extractedData: processedData,
      fileUrl
    };
  } catch (error) {
    console.error('Document processing error:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure Azure Storage container exists
  await ensureContainerExists();

  // GET all submissions
  app.get("/api/submissions", async (req, res) => {
    try {
      console.log('Fetching all submissions');
      const submissions = await storage.getAllSubmissions();
      console.log('Found submissions:', submissions.length);
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ message: "Error fetching submissions" });
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
        ...processedData
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

      // Convert boolean strings to actual booleans
      const formData = {
        ...req.body,
        acceptedTerms: req.body.acceptedTerms === true || req.body.acceptedTerms === "true",
        gdprConsent: req.body.gdprConsent === true || req.body.gdprConsent === "true"
      };

      console.log('Validating form data:', formData);
      const validatedData = insertSubmissionSchema.parse(formData);
      console.log('Validation successful:', validatedData);

      const submissionData = {
        ...validatedData,
        acceptedTerms: validatedData.acceptedTerms.toString(),
        gdprConsent: validatedData.gdprConsent.toString(),
      };

      console.log('Creating submission with data:', submissionData);
      const result = await storage.createSubmission(submissionData);
      console.log('Submission created:', result);

      res.json(result);
    } catch (error) {
      console.error('Calculation error:', error);
      if (error.name === "ZodError") {
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

  // Send email endpoint
  app.post("/api/send-email", async (req, res) => {
    try {
      const { submissionId, email } = req.body;
      const submission = await storage.getSubmissionById(submissionId);

      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      if (submission.email !== email) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await sendReportEmail(submission);
      res.json({ message: "Email sent successfully" });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Calculation functions
function calculateCO2Savings(data: any): number {
  // Calculate CO2 savings based on energy consumption reduction
  const savingsKwh = data.currentConsumption - data.projectedConsumption;
  // Using average CO2 emissions per kWh (0.0002 tons CO2 per kWh)
  return savingsKwh * 0.0002;
}

function calculateCarbonCredits(data: any): number {
  // 1:1 ratio with CO2 savings
  return calculateCO2Savings(data);
}

function calculateFinancialValue(data: any): number {
  // Assuming €50 per carbon credit
  return calculateCarbonCredits(data) * 50;
}