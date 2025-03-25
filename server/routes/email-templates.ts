import express from 'express';
import { storage } from '../storage';
import { insertEmailTemplateSchema } from '../../shared/schema';
import { z } from 'zod';

const router = express.Router();

// Create new email template
router.post('/', async (req, res) => {
  try {
    if (!req.session?.user?.id) {
      return res.status(401).json({ error: 'You must be logged in to create email templates' });
    }

    // Validate request body
    const validation = insertEmailTemplateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid email template data', details: validation.error.errors });
    }

    // Add the current user's ID to the template
    const template = await storage.createEmailTemplate({
      ...validation.data,
      userId: req.session.user.id
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating email template:', error);
    res.status(500).json({ error: 'Failed to create email template' });
  }
});

// Get all email templates
router.get('/', async (req, res) => {
  try {
    const templates = await storage.getAllEmailTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

// Get default email template (optionally filtered by language)
router.get('/default', async (req, res) => {
  try {
    const language = req.query.language as string || 'en';
    const template = await storage.getDefaultEmailTemplate(language);
    
    if (!template) {
      return res.status(404).json({ error: 'No default template found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching default template:', error);
    res.status(500).json({ error: 'Failed to fetch default template' });
  }
});

// Get email template by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    const template = await storage.getEmailTemplateById(id);
    if (!template) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ error: 'Failed to fetch email template' });
  }
});

// Update email template
router.patch('/:id', async (req, res) => {
  try {
    if (!req.session?.user?.id) {
      return res.status(401).json({ error: 'You must be logged in to update email templates' });
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    // Validate request body (partial validation)
    const updateSchema = insertEmailTemplateSchema.partial();
    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid email template data', details: validation.error.errors });
    }

    // Check if template exists
    const existingTemplate = await storage.getEmailTemplateById(id);
    if (!existingTemplate) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    // Update template
    const updatedTemplate = await storage.updateEmailTemplate(id, validation.data);
    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

// Delete email template
router.delete('/:id', async (req, res) => {
  try {
    if (!req.session?.user?.id) {
      return res.status(401).json({ error: 'You must be logged in to delete email templates' });
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    // Check if template exists
    const existingTemplate = await storage.getEmailTemplateById(id);
    if (!existingTemplate) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    // Delete template
    const success = await storage.deleteEmailTemplate(id);
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete email template' });
    }

    res.json({ success: true, message: 'Email template deleted successfully' });
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({ error: 'Failed to delete email template' });
  }
});

export default router;