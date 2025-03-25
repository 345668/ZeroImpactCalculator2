import express from "express";
import { insertEmailTemplateSchema } from "@shared/schema";
import { storage } from "../storage";
import { z } from "zod";

const router = express.Router();

// Auth middleware to protect routes
function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!req.session.user) {
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Authentication required to access this resource" 
    });
  }
  next();
}

// Admin-only middleware
function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ 
      error: "Forbidden", 
      message: "Administrator privileges required" 
    });
  }
  next();
}

// Get all email templates
router.get("/", requireAuth, async (req, res) => {
  try {
    const templates = await storage.getAllEmailTemplates();
    res.json(templates);
  } catch (error) {
    console.error("Error fetching email templates:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      message: "Failed to fetch email templates" 
    });
  }
});

// Get a specific email template by ID
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ 
        error: "Bad request", 
        message: "Invalid template ID" 
      });
    }

    const template = await storage.getEmailTemplateById(id);
    if (!template) {
      return res.status(404).json({ 
        error: "Not found", 
        message: "Email template not found" 
      });
    }

    res.json(template);
  } catch (error) {
    console.error("Error fetching email template:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      message: "Failed to fetch email template" 
    });
  }
});

// Create a new email template
router.post("/", requireAdmin, async (req, res) => {
  try {
    // Validate request body
    const validatedData = insertEmailTemplateSchema.parse(req.body);
    
    // Add the creator's user ID
    const userId = req.session.user!.id;
    
    // Create the template
    const newTemplate = await storage.createEmailTemplate({
      ...validatedData,
      userId,
    });
    
    res.status(201).json(newTemplate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        message: "Invalid template data", 
        details: error.errors 
      });
    }
    
    console.error("Error creating email template:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      message: "Failed to create email template" 
    });
  }
});

// Update an existing email template
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ 
        error: "Bad request", 
        message: "Invalid template ID" 
      });
    }
    
    // Get the existing template
    const existingTemplate = await storage.getEmailTemplateById(id);
    if (!existingTemplate) {
      return res.status(404).json({ 
        error: "Not found", 
        message: "Email template not found" 
      });
    }
    
    // Validate request body (allow partial updates)
    const partialSchema = insertEmailTemplateSchema.partial();
    const validatedData = partialSchema.parse(req.body);
    
    // Update the template
    const updatedTemplate = await storage.updateEmailTemplate(id, validatedData);
    
    res.json(updatedTemplate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        message: "Invalid template data", 
        details: error.errors 
      });
    }
    
    console.error("Error updating email template:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      message: "Failed to update email template" 
    });
  }
});

// Delete an email template
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ 
        error: "Bad request", 
        message: "Invalid template ID" 
      });
    }
    
    // Get the existing template
    const existingTemplate = await storage.getEmailTemplateById(id);
    if (!existingTemplate) {
      return res.status(404).json({ 
        error: "Not found", 
        message: "Email template not found" 
      });
    }
    
    // Delete the template
    const success = await storage.deleteEmailTemplate(id);
    
    if (success) {
      res.status(204).send();
    } else {
      res.status(500).json({ 
        error: "Internal server error", 
        message: "Failed to delete email template" 
      });
    }
  } catch (error) {
    console.error("Error deleting email template:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      message: "Failed to delete email template" 
    });
  }
});

// Get default email template for a language
router.get("/default/:language", requireAuth, async (req, res) => {
  try {
    const language = req.params.language;
    
    // Get the default template for the specified language
    const template = await storage.getDefaultEmailTemplate(language);
    
    if (!template) {
      return res.status(404).json({ 
        error: "Not found", 
        message: `No default email template found for language: ${language}` 
      });
    }
    
    res.json(template);
  } catch (error) {
    console.error("Error fetching default email template:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      message: "Failed to fetch default email template" 
    });
  }
});

export default router;