import { Router } from "express";
import { AIService } from "../services/ai.js";
import { z } from "zod";

const router = Router();

const analysisSchema = z.object({
  description: z.string().min(1, "Description is required")
});

router.post("/analyze", async (req, res) => {
  try {
    const { description } = analysisSchema.parse(req.body);
    const analysis = await AIService.analyzeCarbonImpact(description);
    res.json(analysis);
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
