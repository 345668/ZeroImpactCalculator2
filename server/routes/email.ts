import { Router } from "express";
import { AIService } from "../services/ai.js";
import { EmailService } from "../services/email.js";
import { z } from "zod";
import { submissions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';

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
    console.log('Received email request body:', JSON.stringify(req.body, null, 2));

    const data = emailRequestSchema.parse(req.body);
    console.log('Validation passed, parsed data:', JSON.stringify(data, null, 2));

    // Check if we've already sent an email for this submission recently
    const [existingSubmission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.email, data.email))
      .orderBy(submissions.submittedAt, 'desc')
      .limit(1);

    if (existingSubmission?.emailSent === "yes") {
      return res.json({ 
        success: true, 
        message: "Report was already sent to this email" 
      });
    }

    // Validate email address with SendGrid
    try {
      const validationResponse = await fetch('https://api.sendgrid.com/v3/validations/email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: data.email })
      });

      if (!validationResponse.ok) {
        throw new Error('Email validation failed');
      }

      const validationResult = await validationResponse.json();
      console.log('Email validation result:', validationResult);

      if (validationResult.result?.verdict !== 'Valid') {
        throw new Error('Invalid email address');
      }
    } catch (validationError) {
      console.error('Email validation error:', validationError);
      // Continue even if validation fails, as it might be a temporary issue
    }

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