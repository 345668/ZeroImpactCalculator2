import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertSubmissionSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import FormData from "form-data";
import fetch from "node-fetch";
import { uploadFileToBlobStorage, ensureContainerExists } from "./utils/azure-storage";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

async function processDocumentWithMistral(file: Express.Multer.File) {
  try {
    // First call: Chat completion to analyze the document
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          {
            role: "system",
            content: "Extract the following information from the document: building size (m²), current energy consumption (kWh/year), projected energy consumption (kWh/year). Return the data in JSON format."
          },
          {
            role: "user",
            content: file.buffer.toString()
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    const data = await response.json();
    const extractedData = data.choices[0].message.content;

    // Language detection
    const langResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          {
            role: "system",
            content: "Detect the language of the following text and return only the ISO 639-1 language code (e.g., 'en', 'de', 'fr')."
          },
          {
            role: "user",
            content: file.buffer.toString()
          }
        ]
      })
    });

    if (!langResponse.ok) {
      throw new Error(`Language detection failed: ${langResponse.statusText}`);
    }

    const langData = await langResponse.json();
    const language = langData.choices[0].message.content.trim().toLowerCase();

    // Upload file to Azure Blob Storage
    const fileUrl = await uploadFileToBlobStorage(file);

    return {
      language,
      extractedData: JSON.parse(extractedData),
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

  app.post("/api/calculate", async (req, res) => {
    try {
      const validatedData = insertSubmissionSchema.parse(req.body);
      const result = await storage.createSubmission(validatedData);
      res.json(result);
    } catch (error) {
      if (error instanceof Error) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.post("/api/upload-document", upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const processedData = await processDocumentWithMistral(req.file);

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

  const httpServer = createServer(app);
  return httpServer;
}