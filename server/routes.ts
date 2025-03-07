import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertSubmissionSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('Starting route registration...'); // Debug log

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

  // Calculate and store submission
  app.post("/api/calculate", async (req, res) => {
    try {
      console.log('Received calculation request:', req.body);

      // Validate the input data
      const validatedData = insertSubmissionSchema.parse(req.body);
      console.log('Validation successful:', validatedData);

      // Create the submission
      const result = await storage.createSubmission(validatedData);
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

  console.log('Route registration completed successfully'); // Debug log
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