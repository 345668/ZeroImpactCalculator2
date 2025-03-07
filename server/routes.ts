import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertSubmissionSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { uploadFileToBlobStorage, ensureContainerExists } from "./utils/azure-storage";
import { extractTextFromDocument, processWithMistral } from "./utils/document-processor";
import { generatePDFReport } from "./utils/pdf-generator";

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
        acceptedTerms: req.body.acceptedTerms === true || req.body.acceptedTerms === "true"
      });

      // Convert boolean to string for database storage
      const submissionData = {
        ...validatedData,
        acceptedTerms: validatedData.acceptedTerms.toString(),
        // Add calculated fields -  These functions need to be defined elsewhere
        co2Savings: calculateCO2Savings(validatedData),
        carbonCredits: calculateCarbonCredits(validatedData),
        financialValue: calculateFinancialValue(validatedData)
      };

      const result = await storage.createSubmission(submissionData);
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

  // PDF Report endpoint
  app.get("/api/submissions/:id/report", async (req, res) => {
    try {
      const submission = await storage.getSubmissionById(parseInt(req.params.id));

      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      const pdfBuffer = await generatePDFReport(submission);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=carbon-credits-report-${submission.id}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      res.status(500).json({ message: "Error generating PDF report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Placeholder functions -  These need to be implemented based on the application logic
function calculateCO2Savings(data: any): number {
  // Implement your CO2 savings calculation logic here
  return 0;
}

function calculateCarbonCredits(data: any): number {
  // Implement your carbon credits calculation logic here
  return 0;
}

function calculateFinancialValue(data: any): number {
  // Implement your financial value calculation logic here
  return 0;
}