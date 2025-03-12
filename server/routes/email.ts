import { Router } from "express";
import { EmailService } from "../services/email.js";
import { z } from "zod";

const router = Router();

const emailRequestSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  co2Savings: z.number(),
  carbonCredits: z.number(),
  financialValue: z.number(),
  buildingSize: z.number().positive("Building size must be positive"),
  currentConsumption: z.number().positive("Current consumption must be positive"),
  projectedConsumption: z.number().positive("Projected consumption must be positive"),
  heatingSystem: z.string().min(1, "Heating system is required")
});

router.post("/test-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    await EmailService.sendTestEmail(email);
    res.json({ success: true, message: "Test email sent successfully" });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: "Failed to send test email" });
  }
});

router.post("/send-report", async (req, res) => {
  try {
    console.log('Received email request body:', JSON.stringify(req.body, null, 2));

    const data = emailRequestSchema.parse(req.body);
    console.log('Validation passed, parsed data:', JSON.stringify(data, null, 2));

    // Send email with results
    const result = await EmailService.sendCarbonReport(data);

    res.json({ 
      success: true, 
      message: "Report sent successfully"
    });
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
