import express from 'express';
import { SendGridAgent } from '../services/sendgrid-agent';
import { storage } from '../storage';
import csurf from 'csurf';
import { DmarcReport } from '@shared/schema';

// CSRF protection middleware
const csrfProtection = csurf({ cookie: true });

// Type definition for agent requests
interface SendEmailRequest {
  to: string | string[] | { email: string; name?: string }[];
  subject: string;
  html: string;
  text?: string;
  from?: { email: string; name?: string };
  reply_to?: { email: string; name?: string };
  cc?: string | string[] | { email: string; name?: string }[];
  bcc?: string | string[] | { email: string; name?: string }[];
  attachments?: { content: string; filename: string; type: string; disposition?: string }[];
  categories?: string[];
  custom_args?: Record<string, string>;
  send_at?: number;
  tracking_settings?: {
    click_tracking?: { enable?: boolean; enable_text?: boolean };
    open_tracking?: { enable?: boolean; substitution_tag?: string };
    subscription_tracking?: { enable?: boolean; text?: string; html?: string; substitution_tag?: string };
    ganalytics?: { enable?: boolean; utm_source?: string; utm_medium?: string; utm_term?: string; utm_content?: string; utm_campaign?: string };
  };
}

interface TemplatedEmailRequest {
  to: string | string[] | { email: string; name?: string }[];
  templateId: number;
  dynamicData: Record<string, any>;
  attachments?: any[];
  cc?: string | string[] | { email: string; name?: string }[];
  bcc?: string | string[] | { email: string; name?: string }[];
  replyTo?: string | { email: string; name?: string };
  categories?: string[];
  customArgs?: Record<string, string>;
  sendAt?: string; // ISO date string
  trackingSettings?: {
    clickTracking?: boolean;
    openTracking?: boolean;
    subscriptionTracking?: boolean;
    googleAnalytics?: boolean;
  };
}

interface ContactRequest {
  email: string;
  first_name?: string;
  last_name?: string;
  [key: string]: any;
}

interface ContactListRequest {
  name: string;
  description?: string;
}

interface AddContactsToListRequest {
  listId: string;
  contactIds: string[];
}

interface CampaignRequest {
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  senderName?: string;
  senderEmail?: string;
  listIds?: string[];
  categories?: string[];
  sendAt: string; // ISO date string
  testEmails?: string[];
}

interface DynamicTemplateRequest {
  name: string;
  generatePlainContent?: boolean;
}

interface TemplateVersionRequest {
  templateId: string;
  versionId: string;
  name?: string;
  subject?: string;
  htmlContent?: string;
  plainContent?: string;
  generatePlainContent?: boolean;
  active?: boolean;
}

interface EmailEventsRequest {
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  limit?: number;
  categories?: string[];
  eventTypes?: string[];
}

interface EmailStatsRequest {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  aggregatedBy?: 'day' | 'week' | 'month';
  categories?: string[];
}

interface WebhookRequest {
  url: string;
  enabled?: boolean;
  eventTypes?: string[];
}

interface IPPoolRequest {
  name: string;
  ips?: string[];
}

interface DmarcProcessRequest {
  maxEmails?: number;
  processAttachments?: boolean;
  notificationEmail?: string;
}

interface SendDmarcAlertRequest {
  reportId: number;
  to: string | string[] | { email: string; name?: string }[];
}

/**
 * Register email agent routes
 */
export function registerEmailAgentRoutes(app: express.Express): void {
  const router = express.Router();

  // Require authentication for all email agent routes
  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    // @ts-ignore
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    next();
  }

  // Require admin role for certain operations
  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    // @ts-ignore
    if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  }

  /**
   * Core Email Operations
   */

  // Send a basic email
  router.post('/send', requireAuth, csrfProtection, async (req, res) => {
    try {
      const emailRequest: SendEmailRequest = req.body;

      // Basic validation
      if (!emailRequest.to || !emailRequest.subject || !emailRequest.html) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields (to, subject, html)'
        });
      }

      const result = await SendGridAgent.sendEmail(emailRequest);
      return res.json(result);
    } catch (error: any) {
      console.error('Error in /email-agent/send:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });

  // Send an email using a template
  router.post('/send-templated', requireAuth, csrfProtection, async (req, res) => {
    try {
      const emailRequest: TemplatedEmailRequest = req.body;

      // Basic validation
      if (!emailRequest.to || !emailRequest.templateId || !emailRequest.dynamicData) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields (to, templateId, dynamicData)'
        });
      }

      // Convert date string to Date object if provided
      if (emailRequest.sendAt) {
        emailRequest.sendAt = new Date(emailRequest.sendAt);
      }

      const result = await SendGridAgent.sendTemplatedEmail(emailRequest);
      return res.json(result);
    } catch (error: any) {
      console.error('Error in /email-agent/send-templated:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });

  // Schedule a campaign
  router.post('/schedule-campaign', requireAuth, csrfProtection, async (req, res) => {
    try {
      const campaignRequest: CampaignRequest = req.body;

      // Basic validation
      if (!campaignRequest.name || !campaignRequest.subject || !campaignRequest.htmlContent || !campaignRequest.sendAt) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields (name, subject, htmlContent, sendAt)'
        });
      }

      // Convert ISO date string to Date object
      const sendAt = new Date(campaignRequest.sendAt);

      const result = await SendGridAgent.scheduleCampaign({
        ...campaignRequest,
        sendAt
      });
      return res.json(result);
    } catch (error: any) {
      console.error('Error in /email-agent/schedule-campaign:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });

  /**
   * Contact Management
   */

  // Add a contact
  router.post('/contacts', requireAuth, csrfProtection, async (req, res) => {
    try {
      const contactRequest: ContactRequest = req.body;

      // Basic validation
      if (!contactRequest.email) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: email'
        });
      }

      const result = await SendGridAgent.addContact(contactRequest);
      return res.json(result);
    } catch (error: any) {
      console.error('Error in /email-agent/contacts:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });

  // Create a contact list
  router.post('/contact-lists', requireAuth, csrfProtection, async (req, res) => {
    try {
      const listRequest: ContactListRequest = req.body;

      // Basic validation
      if (!listRequest.name) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: name'
        });
      }

      const result = await SendGridAgent.createContactList(listRequest.name, listRequest.description);
      return res.json(result);
    } catch (error: any) {
      console.error('Error in /email-agent/contact-lists:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });

  // Add contacts to a list
  router.post('/contact-lists/add-contacts', requireAuth, csrfProtection, async (req, res) => {
    try {
      const request: AddContactsToListRequest = req.body;

      // Basic validation
      if (!request.listId || !request.contactIds || !Array.isArray(request.contactIds) || request.contactIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: listId and contactIds array'
        });
      }

      const result = await SendGridAgent.addContactsToList(request.listId, request.contactIds);
      return res.json(result);
    } catch (error: any) {
      console.error('Error in /email-agent/contact-lists/add-contacts:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });

  /**
   * Template Management
   */

  // Create a dynamic template
  router.post('/templates', requireAuth, csrfProtection, async (req, res) => {
    try {
      const templateRequest: DynamicTemplateRequest = req.body;

      // Basic validation
      if (!templateRequest.name) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: name'
        });
      }

      const result = await SendGridAgent.createDynamicTemplate(
        templateRequest.name,
        { generatePlainContent: templateRequest.generatePlainContent }
      );
      return res.json(result);
    } catch (error: any) {
      console.error('Error in /email-agent/templates:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });

  // Update a template version
  router.patch('/templates/:templateId/versions/:versionId', requireAuth, csrfProtection, async (req, res) => {
    try {
      const { templateId, versionId } = req.params;
      const versionRequest: Partial<TemplateVersionRequest> = req.body;

      if (!templateId || !versionId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: templateId and versionId'
        });
      }

      const result = await SendGridAgent.updateTemplateVersion(templateId, versionId, versionRequest);
      return res.json(result);
    } catch (error: any) {
      console.error(`Error in /email-agent/templates/${req.params.templateId}/versions/${req.params.versionId}:`, error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });

  // Get all dynamic templates
  router.get('/templates', requireAuth, csrfProtection, async (req, res) => {
    try {
      const result = await SendGridAgent.getDynamicTemplates();
      return res.json(result);
    } catch (error: any) {
      console.error('Error in GET /email-agent/templates:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });

  /**
   * Analytics & Tracking
   */

  // Get email events
  router.get('/events', requireAuth, csrfProtection, async (req, res) => {
    try {
      const query = req.query as unknown as EmailEventsRequest;

      // Basic validation
      if (!query.startTime || !query.endTime) {
        return res.status(400).json({
          success: false,
          message: 'Missing required query parameters: startTime and endTime'
        });
      }

      const result = await SendGridAgent.getEmailEvents({
        startTime: new Date(query.startTime),
        endTime: new Date(query.endTime),
        limit: query.limit,
        categories: query.categories,
        eventTypes: query.eventTypes
      });
      return res.json(result);
    } catch (error: any) {
      console.error('Error in GET /email-agent/events:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });

  // Get email statistics
  router.get('/stats', requireAuth, csrfProtection, async (req, res) => {
    try {
      const query = req.query as unknown as EmailStatsRequest;

      // Basic validation
      if (!query.startDate || !query.endDate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required query parameters: startDate and endDate'
        });
      }

      const result = await SendGridAgent.getEmailStats({
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
        aggregatedBy: query.aggregatedBy,
        categories: query.categories
      });
      return res.json(result);
    } catch (error: any) {
      console.error('Error in GET /email-agent/stats:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });

  /**
   * Infrastructure Configuration (Admin only)
   */

  // Configure webhook for email events
  router.post('/webhooks', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const webhookRequest: WebhookRequest = req.body;

      // Basic validation
      if (!webhookRequest.url) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: url'
        });
      }

      const result = await SendGridAgent.configureWebhook(webhookRequest);
      return res.json(result);
    } catch (error: any) {
      console.error('Error in /email-agent/webhooks:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });

  // Configure IP pool for sending emails
  router.post('/ip-pools', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const poolRequest: IPPoolRequest = req.body;

      // Basic validation
      if (!poolRequest.name) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: name'
        });
      }

      const result = await SendGridAgent.configureIPPool(poolRequest);
      return res.json(result);
    } catch (error: any) {
      console.error('Error in /email-agent/ip-pools:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });

  /**
   * DMARC Report Handling
   */

  // Process DMARC emails
  router.post('/process-dmarc', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const dmarcRequest: DmarcProcessRequest = req.body;
      const result = await SendGridAgent.processDmarcEmails(dmarcRequest);
      return res.json(result);
    } catch (error: any) {
      console.error('Error in /email-agent/process-dmarc:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });

  // Send DMARC alert
  router.post('/send-dmarc-alert', requireAuth, csrfProtection, async (req, res) => {
    try {
      const alertRequest: SendDmarcAlertRequest = req.body;

      // Basic validation
      if (!alertRequest.reportId || !alertRequest.to) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: reportId and to'
        });
      }

      // Get the DMARC report from the database
      const report = await storage.getDmarcReportById(alertRequest.reportId);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: `DMARC report with ID ${alertRequest.reportId} not found`
        });
      }

      const result = await SendGridAgent.sendDmarcAlert(report, alertRequest.to);
      
      // Update the report status if the email was sent successfully
      if (result.success) {
        await storage.updateDmarcReportStatus(alertRequest.reportId, true, true);
      }
      
      return res.json(result);
    } catch (error: any) {
      console.error('Error in /email-agent/send-dmarc-alert:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });

  // Mount the router
  app.use('/api/email-agent', router);
  console.log('Email agent routes registered');
}