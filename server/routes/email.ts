import { Router } from "express";
import { AIService } from "../services/ai.js";
import { EmailService } from "../services/email.js";
import { z } from "zod";

const router = Router();

const emailRequestSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  buildingSize: z.number().positive("Building size must be positive"),
  currentConsumption: z.number().positive("Current consumption must be positive"),
  projectedConsumption: z.number().positive("Projected consumption must be positive"),
  heatingSystem: z.string().min(1, "Heating system is required"),
  co2Savings: z.number(),
  carbonCredits: z.number(),
  financialValue: z.number()
});

router.post("/send-report", async (req, res) => {
  try {
    console.log('Received email request:', req.body);

    const data = emailRequestSchema.parse(req.body);
    console.log('Validation passed, sending email report');

    // Send email with results
    const result = await EmailService.sendCarbonReport({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      co2Savings: data.co2Savings,
      carbonCredits: data.carbonCredits,
      financialValue: data.financialValue,
      buildingSize: data.buildingSize,
      currentConsumption: data.currentConsumption,
      projectedConsumption: data.projectedConsumption,
      heatingSystem: data.heatingSystem
    });

    res.json({ success: true, message: "Report sent successfully", ...result });
  } catch (error) {
    console.error('Error in send-report route:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors,
        fields: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send email report';
      res.status(500).json({ error: errorMessage });
    }
  }
});

export default router;