import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertSubmissionSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { uploadFileToBlobStorage, ensureContainerExists } from "./utils/azure-storage";
import { extractTextFromDocument, processWithMistral } from "./utils/document-processor";
import { analyzeDocumentWithClaude } from "./utils/claude-ai";
import { generatePDFReport } from "./utils/pdf-generator";
import { sendReportEmail } from "./utils/email-service";

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

    // Process with Mistral AI for basic info
    console.log('Processing with Mistral AI...');
    const mistralData = await processWithMistral(extractedText);
    console.log('Mistral processing complete:', mistralData);

    // Process with Claude AI for detailed analysis
    console.log('Processing with Claude AI...');
    const claudeAnalysis = await analyzeDocumentWithClaude(extractedText);
    console.log('Claude AI analysis complete');

    // Upload to Azure Blob Storage
    console.log('Uploading to Azure Blob Storage...');
    const fileUrl = await uploadFileToBlobStorage(file);
    console.log('File uploaded successfully');

    return {
      extractedData: mistralData,
      detailedAnalysis: claudeAnalysis,
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
      const submissions = await storage.getAllSubmissions();
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
      const validatedData = insertSubmissionSchema.parse({
        ...req.body,
        acceptedTerms: req.body.acceptedTerms === true || req.body.acceptedTerms === "true",
        gdprConsent: req.body.gdprConsent === true || req.body.gdprConsent === "true"
      });

      // Convert boolean to string for database storage
      const submissionData = {
        ...validatedData,
        acceptedTerms: validatedData.acceptedTerms.toString(),
        gdprConsent: validatedData.gdprConsent.toString(),
        // Add calculated fields
        co2Savings: calculateCO2Savings(validatedData),
        carbonCredits: calculateCarbonCredits(validatedData),
        financialValue: calculateFinancialValue(validatedData)
      };

      const result = await storage.createSubmission(submissionData);

      // Create detailed report if file was uploaded
      if (req.body.detailedAnalysis) {
        await storage.createDetailedReport({
          submissionId: result.id,
          ...req.body.detailedAnalysis,
          reportLanguage: req.body.documentLanguage || 'en'
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Calculation error:', error);
      if (error instanceof Error) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Send email endpoint
  app.post("/api/send-email", async (req, res) => {
    try {
      const { submissionId, email } = req.body;
      const submission = await storage.getSubmissionById(submissionId);
      const detailedReport = await storage.getDetailedReport(submissionId);

      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      if (submission.email !== email) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await sendReportEmail(submission, detailedReport);
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