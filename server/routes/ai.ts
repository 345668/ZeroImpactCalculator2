import { Router } from "express";
import { AIService } from "../services/ai.js";
import { EmailService } from "../services/email.js";
import { z } from "zod";

const router = Router();

const analysisSchema = z.object({
  description: z.string().min(1, "Description is required"),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  buildingSize: z.number(),
  currentConsumption: z.number(),
  projectedConsumption: z.number(),
  heatingSystem: z.string(),
  co2Savings: z.number(),
  carbonCredits: z.number(),
  financialValue: z.number()
});

router.post("/analyze", async (req, res) => {
  try {
    const data = analysisSchema.parse(req.body);
    const analysis = await AIService.analyzeCarbonImpact(data.description);

    // Send email with results
    await EmailService.sendCarbonReport({
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

    res.json({ ...analysis, emailSent: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: error.errors });
    } else {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "Failed to analyze carbon impact" });
    }
  }
});

export default router;