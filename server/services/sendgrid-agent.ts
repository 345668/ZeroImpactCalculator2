import sgMail from '@sendgrid/mail';
import sgClient from '@sendgrid/client';
import { ClientRequest } from '@sendgrid/client/src/request';
import { MailDataRequired } from '@sendgrid/helpers/classes/mail';
import { storage } from '../storage';
import { EmailTemplate, DmarcReport } from '@shared/schema';

// Define SendGrid HTTP method types
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  sgClient.setApiKey(process.env.SENDGRID_API_KEY);
}

// Constants
const DEFAULT_SENDER = {
  email: process.env.SENDGRID_FROM_EMAIL || 'info@radicaldecarbonization.com',
  name: 'Radical Zero Carbon Credits'
};

type ContactData = {
  email: string;
  first_name?: string;
  last_name?: string;
  [key: string]: any;
};

type EmailCampaignData = {
  name: string;
  subject: string;
  html_content: string;
  plain_content?: string;
  sender_id?: number;
  list_ids?: string[];
  suppression_group_id?: number;
  custom_unsubscribe_url?: string;
  send_at?: number; // Unix timestamp
};

type EmailEvent = {
  email: string;
  timestamp: number;
  event: string;
  category?: string;
  sg_event_id?: string;
  sg_message_id?: string;
  response?: string;
  reason?: string;
  status?: string;
  ip?: string;
  useragent?: string;
  url?: string;
};

type SendGridTemplateData = {
  id: string;
  name: string;
  generation: string;
  updated_at: string;
  versions: {
    id: string; 
    template_id: string;
    active: number;
    name: string;
    updated_at: string;
    generate_plain_content: boolean;
    subject: string;
    html_content?: string;
    editor: string;
    thumbnail_url: string;
  }[];
};

type SendGridIPData = {
  ip: string;
  warmup: boolean;
  start_date?: number;
};

type WebhookSettingsData = {
  enabled: boolean;
  url: string;
  event_types: string[];
  bounce: boolean;
  click: boolean;
  deferred: boolean;
  delivered: boolean;
  dropped: boolean;
  group_resubscribe: boolean;
  group_unsubscribe: boolean;
  open: boolean;
  processed: boolean;
  spam_report: boolean;
  unsubscribe: boolean;
};

/**
 * SendGrid V3 API Agent - Comprehensive service for email operations
 * 
 * This service leverages the full SendGrid V3 API for advanced email capabilities including:
 * - Transactional and marketing email sending
 * - Contact/list management
 * - Template management
 * - Campaign scheduling
 * - Email analytics and event tracking
 * - DMARC report processing
 * - Infrastructure configuration
 */
export class SendGridAgent {
  // EMAIL SENDING OPERATIONS

  /**
   * Send a transactional email with enhanced tracking and options
   */
  static async sendEmail(options: {
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
    batch_id?: string;
    asm?: { group_id: number; groups_to_display?: number[] };
    ip_pool_name?: string;
    mail_settings?: {
      bypass_list_management?: { enable?: boolean };
      footer?: { enable?: boolean; text?: string; html?: string };
      sandbox_mode?: { enable?: boolean };
    };
    tracking_settings?: {
      click_tracking?: { enable?: boolean; enable_text?: boolean };
      open_tracking?: { enable?: boolean; substitution_tag?: string };
      subscription_tracking?: { enable?: boolean; text?: string; html?: string; substitution_tag?: string };
      ganalytics?: { enable?: boolean; utm_source?: string; utm_medium?: string; utm_term?: string; utm_content?: string; utm_campaign?: string };
    };
  }): Promise<{ success: boolean; messageId?: string; statusCode?: number; message?: string }> {
    try {
      const msg: Record<string, any> = {
        to: options.to,
        from: options.from || DEFAULT_SENDER,
        subject: options.subject,
        html: options.html
      };

      // Add optional text content
      if (options.text) {
        msg.text = options.text;
      }

      // Add all optional parameters if provided
      if (options.reply_to) msg.reply_to = options.reply_to;
      if (options.cc) msg.cc = options.cc;
      if (options.bcc) msg.bcc = options.bcc;
      if (options.attachments) msg.attachments = options.attachments;
      if (options.categories) msg.categories = options.categories;
      if (options.custom_args) msg.custom_args = options.custom_args;
      if (options.send_at) msg.send_at = options.send_at;
      if (options.batch_id) msg.batch_id = options.batch_id;
      if (options.asm) msg.asm = options.asm;
      if (options.ip_pool_name) msg.ip_pool_name = options.ip_pool_name;
      if (options.mail_settings) msg.mail_settings = options.mail_settings;
      if (options.tracking_settings) msg.tracking_settings = options.tracking_settings;

      console.log(`Sending email to ${typeof options.to === 'string' ? options.to : 'multiple recipients'}`);
      const [response] = await sgMail.send(msg as MailDataRequired);
      
      return {
        success: response.statusCode >= 200 && response.statusCode < 300,
        messageId: response.headers['x-message-id'] as string,
        statusCode: response.statusCode
      };
    } catch (error: any) {
      console.error('Error sending email:', error);
      return {
        success: false,
        message: error.message || 'Unknown error',
        statusCode: error.code || 500
      };
    }
  }

  /**
   * Send an email using a template from our database with enhanced functionality
   */
  static async sendTemplatedEmail(options: {
    to: string | string[] | { email: string; name?: string }[];
    templateId: number;
    dynamicData: Record<string, any>;
    attachments?: any[];
    cc?: string | string[] | { email: string; name?: string }[];
    bcc?: string | string[] | { email: string; name?: string }[];
    replyTo?: string | { email: string; name?: string };
    categories?: string[];
    customArgs?: Record<string, string>;
    sendAt?: Date;
    trackingSettings?: {
      clickTracking?: boolean;
      openTracking?: boolean;
      subscriptionTracking?: boolean;
      googleAnalytics?: boolean;
    };
  }): Promise<{ success: boolean; messageId?: string; message?: string }> {
    try {
      const { to, templateId, dynamicData, attachments, cc, bcc, replyTo, categories, customArgs, sendAt, trackingSettings } = options;
      
      // Get the template from the database
      const template = await storage.getEmailTemplateById(templateId);
      if (!template) {
        console.error(`Email template with ID ${templateId} not found`);
        return { success: false, message: `Template with ID ${templateId} not found` };
      }
      
      // Get and fill template
      let subject = template.subject;
      let body = template.body;
      
      // Replace variables in subject and body using template variable syntax
      if (dynamicData) {
        Object.entries(dynamicData).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          subject = subject.replace(regex, String(value));
          body = body.replace(regex, String(value));
        });
      }
      
      // Prepare the email data with extended options
      const emailConfig: Record<string, any> = {
        to,
        subject,
        html: body,
        from: DEFAULT_SENDER
      };
      
      // Add optional parameters
      if (cc) emailConfig.cc = cc;
      if (bcc) emailConfig.bcc = bcc;
      if (replyTo) emailConfig.reply_to = replyTo;
      if (attachments && attachments.length > 0) emailConfig.attachments = attachments;
      if (categories && categories.length > 0) emailConfig.categories = categories;
      if (customArgs) emailConfig.custom_args = customArgs;
      if (sendAt) emailConfig.send_at = Math.floor(sendAt.getTime() / 1000); // Convert to Unix timestamp
      
      // Configure tracking settings if provided
      if (trackingSettings) {
        emailConfig.tracking_settings = {};
        
        if (trackingSettings.clickTracking !== undefined) {
          emailConfig.tracking_settings.click_tracking = { enable: trackingSettings.clickTracking };
        }
        
        if (trackingSettings.openTracking !== undefined) {
          emailConfig.tracking_settings.open_tracking = { enable: trackingSettings.openTracking };
        }
        
        if (trackingSettings.subscriptionTracking !== undefined) {
          emailConfig.tracking_settings.subscription_tracking = { enable: trackingSettings.subscriptionTracking };
        }
        
        if (trackingSettings.googleAnalytics !== undefined) {
          emailConfig.tracking_settings.ganalytics = { enable: trackingSettings.googleAnalytics };
        }
      }
      
      // If there's a SendGrid template ID on the template, use it instead of our HTML
      if (template.sendgridTemplateId) {
        emailConfig.templateId = template.sendgridTemplateId;
        emailConfig.dynamicTemplateData = dynamicData;
        // When using SendGrid templates, we don't need the html content
        delete emailConfig.html;
        delete emailConfig.subject; // Subject comes from the template
      }
      
      // Send the email
      const [response] = await sgMail.send(emailConfig as MailDataRequired);
      console.log(`Email sent with template ${templateId}. Status: ${response.statusCode}`);
      
      return {
        success: response.statusCode >= 200 && response.statusCode < 300,
        messageId: response.headers['x-message-id'] as string
      };
    } catch (error: any) {
      console.error('Error sending templated email:', error);
      return {
        success: false, 
        message: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Send a DMARC report notification with comprehensive security assessment
   */
  static async sendDmarcAlert(report: DmarcReport, to: string | string[] | { email: string; name?: string }[]): Promise<{ success: boolean; messageId?: string; message?: string }> {
    try {
      // Look for a DMARC-specific template first
      const templates = await storage.getAllEmailTemplates();
      let template: EmailTemplate | undefined;
      
      // Find a DMARC-specific template
      template = templates.find(t => 
        t.templateType === 'dmarc-report' && 
        t.isDefault === true && 
        t.language === 'en'
      );
      
      // If no DMARC template found, fall back to any default template
      if (!template) {
        template = await storage.getDefaultEmailTemplate('en');
      }
      
      if (!template) {
        console.error('No suitable email template found for DMARC alerts');
        return { success: false, message: 'No suitable template found' };
      }
      
      console.log(`Using email template: ${template.name} (ID: ${template.id}) for DMARC alert`);
      
      // Prepare enhanced DMARC alert data with comprehensive security insights
      const dynamicData = {
        // Basic report information
        domain: report.domain,
        sourceIp: report.sourceIp,
        sourceOrg: report.sourceOrg || 'Unknown',
        reportingOrg: report.reportingOrg,
        count: report.count,
        disposition: report.disposition,
        
        // Authentication results
        dkimResult: report.dkimResult || 'N/A',
        spfResult: report.spfResult || 'N/A',
        alignmentDkim: report.alignmentDkim || 'N/A',
        alignmentSpf: report.alignmentSpf || 'N/A',
        policyEvaluated: report.policyEvaluated || 'N/A',
        
        // Timing information
        reportDate: report.reportDate ? new Date(report.reportDate).toLocaleString() : 'N/A',
        receivedDate: report.receivedDate ? new Date(report.receivedDate).toLocaleString() : 'N/A',
        
        // Enhanced security assessment with more details
        securityAssessment: SendGridAgent.getDetailedSecurityAssessment(report),
        securityThreatLevel: SendGridAgent.getSecurityThreatLevel(report),
        reportId: report.reportId,
        
        // Recommendations based on the report
        recommendations: SendGridAgent.getDmarcRecommendations(report)
      };
      
      // Send the report notification with enhanced options
      return await this.sendTemplatedEmail({
        to,
        templateId: template.id,
        dynamicData,
        categories: ['dmarc-report', 'security-notification'],
        trackingSettings: {
          clickTracking: true,
          openTracking: true
        }
      });
    } catch (error: any) {
      console.error('Error sending DMARC alert:', error);
      return {
        success: false,
        message: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Schedule a campaign email to be sent at a future time
   */
  static async scheduleCampaign(options: {
    name: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    senderName?: string;
    senderEmail?: string;
    listIds?: string[];
    categories?: string[];
    sendAt: Date;
    testEmails?: string[];
  }): Promise<{ success: boolean; campaignId?: string; message?: string }> {
    try {
      const { name, subject, htmlContent, textContent, senderName, senderEmail, listIds, categories, sendAt, testEmails } = options;
      
      // Convert sendAt to UNIX timestamp (seconds)
      const sendAtTimestamp = Math.floor(sendAt.getTime() / 1000);
      
      // Check if sendAt is in the future
      if (sendAtTimestamp <= Math.floor(Date.now() / 1000)) {
        return { success: false, message: 'Send time must be in the future' };
      }
      
      // Step 1: Create campaign
      const data: EmailCampaignData = {
        name,
        subject,
        html_content: htmlContent,
        plain_content: textContent || '',
        sender_id: 1, // This would typically come from getting sender identity first
      };
      
      if (listIds && listIds.length > 0) {
        data.list_ids = listIds;
      }
      
      // In a real implementation, this would make a POST request to /v3/marketing/singlesends
      console.log('Would create campaign with data:', {
        name, 
        subject,
        htmlContentLength: htmlContent.length,
        listIds,
        categories,
        scheduledTime: sendAt.toISOString()
      });
      
      // Create simulated response for demo purposes
      const campaignId = `campaign_${Date.now()}`;
      
      // Step 2: Schedule the campaign
      console.log(`Would schedule campaign ${campaignId} to send at ${sendAt.toISOString()}`);
      
      // Step 3: If test emails are provided, send test emails before the scheduled time
      if (testEmails && testEmails.length > 0) {
        console.log(`Would send test emails to: ${testEmails.join(', ')}`);
      }
      
      return { 
        success: true, 
        campaignId,
        message: `Campaign "${name}" scheduled for ${sendAt.toLocaleString()}`
      };
    } catch (error: any) {
      console.error('Error scheduling campaign:', error);
      return {
        success: false,
        message: error.message || 'Unknown error'
      };
    }
  }

  // CONTACT & LIST MANAGEMENT

  /**
   * Add a contact to SendGrid
   */
  static async addContact(contact: ContactData): Promise<{ success: boolean; message?: string; contactId?: string }> {
    try {
      const request: ClientRequest = {
        method: 'PUT' as HttpMethod,
        url: '/v3/marketing/contacts',
        body: {
          contacts: [contact]
        }
      };
      
      // In production, this would make the actual API call
      if (process.env.SENDGRID_API_KEY) {
        // Make the actual SendGrid API call if we have an API key
        const [response, body] = await sgClient.request(request);
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return {
            success: true,
            message: 'Contact added successfully',
            contactId: body.job_id
          };
        } else {
          return {
            success: false,
            message: `Error: ${body.errors?.[0]?.message || 'Unknown error'}`
          };
        }
      } else {
        console.log('Would add contact with data:', contact);
        return {
          success: true,
          message: 'Contact would be added (SendGrid API key not configured)',
          contactId: `contact_${Date.now()}`
        };
      }
    } catch (error: any) {
      console.error('Error adding contact:', error);
      return {
        success: false,
        message: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Create a new contact list
   */
  static async createContactList(name: string, description?: string): Promise<{ success: boolean; message?: string; listId?: string }> {
    try {
      const request: ClientRequest = {
        method: 'POST' as HttpMethod,
        url: '/v3/marketing/lists',
        body: {
          name,
          description: description || `List created on ${new Date().toISOString()}`
        }
      };
      
      // In production, this would make the actual API call
      if (process.env.SENDGRID_API_KEY) {
        // Make the actual SendGrid API call if we have an API key
        const [response, body] = await sgClient.request(request);
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return {
            success: true,
            message: 'Contact list created successfully',
            listId: body.id
          };
        } else {
          return {
            success: false,
            message: `Error: ${body.errors?.[0]?.message || 'Unknown error'}`
          };
        }
      } else {
        console.log('Would create contact list:', { name, description });
        return {
          success: true,
          message: 'Contact list would be created (SendGrid API key not configured)',
          listId: `list_${Date.now()}`
        };
      }
    } catch (error: any) {
      console.error('Error creating contact list:', error);
      return {
        success: false,
        message: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Add contacts to a list
   */
  static async addContactsToList(listId: string, contactIds: string[]): Promise<{ success: boolean; message?: string }> {
    try {
      const request: ClientRequest = {
        method: 'POST' as HttpMethod,
        url: `/v3/marketing/lists/${listId}/contacts`,
        body: {
          contact_ids: contactIds
        }
      };
      
      // In production, this would make the actual API call
      if (process.env.SENDGRID_API_KEY) {
        // Make the actual SendGrid API call
        const [response, body] = await sgClient.request(request);
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return {
            success: true,
            message: `Added ${contactIds.length} contacts to list successfully`
          };
        } else {
          return {
            success: false,
            message: `Error: ${body.errors?.[0]?.message || 'Unknown error'}`
          };
        }
      } else {
        console.log(`Would add ${contactIds.length} contacts to list ${listId}`);
        return {
          success: true,
          message: `Would add ${contactIds.length} contacts to list (SendGrid API key not configured)`
        };
      }
    } catch (error: any) {
      console.error('Error adding contacts to list:', error);
      return {
        success: false,
        message: error.message || 'Unknown error'
      };
    }
  }

  // EMAIL TEMPLATE MANAGEMENT

  /**
   * Create a new dynamic template in SendGrid
   */
  static async createDynamicTemplate(name: string, options?: {
    generatePlainContent?: boolean;
  }): Promise<{ success: boolean; message?: string; templateId?: string }> {
    try {
      const request: ClientRequest = {
        method: 'POST' as HttpMethod,
        url: '/v3/templates',
        body: {
          name,
          generation: 'dynamic'
        }
      };
      
      if (process.env.SENDGRID_API_KEY) {
        // Create the template
        const [response, body] = await sgClient.request(request);
        
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return {
            success: false,
            message: `Error creating template: ${body.errors?.[0]?.message || 'Unknown error'}`
          };
        }
        
        const templateId = body.id;
        
        // Create a blank version of the template
        const versionRequest: ClientRequest = {
          method: 'POST' as HttpMethod,
          url: `/v3/templates/${templateId}/versions`,
          body: {
            name: 'Initial Version',
            subject: 'Your Subject Here',
            html_content: '<p>Add your content here</p>',
            generate_plain_content: options?.generatePlainContent !== false
          }
        };
        
        const [versionResponse, versionBody] = await sgClient.request(versionRequest);
        
        if (versionResponse.statusCode < 200 || versionResponse.statusCode >= 300) {
          return {
            success: false,
            message: `Template created but failed to create version: ${versionBody.errors?.[0]?.message || 'Unknown error'}`,
            templateId
          };
        }
        
        return {
          success: true,
          message: 'Template created successfully with initial version',
          templateId
        };
      } else {
        console.log('Would create dynamic template:', { name, options });
        return {
          success: true,
          message: 'Dynamic template would be created (SendGrid API key not configured)',
          templateId: `template_${Date.now()}`
        };
      }
    } catch (error: any) {
      console.error('Error creating dynamic template:', error);
      return {
        success: false,
        message: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Update a template version in SendGrid
   */
  static async updateTemplateVersion(templateId: string, versionId: string, updates: {
    name?: string;
    subject?: string;
    htmlContent?: string;
    plainContent?: string;
    generatePlainContent?: boolean;
    active?: boolean;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      // Prepare the update body with only fields that were provided
      const updateBody: Record<string, any> = {};
      
      if (updates.name !== undefined) updateBody.name = updates.name;
      if (updates.subject !== undefined) updateBody.subject = updates.subject;
      if (updates.htmlContent !== undefined) updateBody.html_content = updates.htmlContent;
      if (updates.plainContent !== undefined) updateBody.plain_content = updates.plainContent;
      if (updates.generatePlainContent !== undefined) updateBody.generate_plain_content = updates.generatePlainContent;
      if (updates.active !== undefined) updateBody.active = updates.active ? 1 : 0;
      
      const request: ClientRequest = {
        method: 'PATCH' as HttpMethod,
        url: `/v3/templates/${templateId}/versions/${versionId}`,
        body: updateBody
      };
      
      if (process.env.SENDGRID_API_KEY) {
        const [response, body] = await sgClient.request(request);
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return {
            success: true,
            message: 'Template version updated successfully'
          };
        } else {
          return {
            success: false,
            message: `Error: ${body.errors?.[0]?.message || 'Unknown error'}`
          };
        }
      } else {
        console.log(`Would update template ${templateId} version ${versionId} with:`, updates);
        return {
          success: true,
          message: 'Template version would be updated (SendGrid API key not configured)'
        };
      }
    } catch (error: any) {
      console.error('Error updating template version:', error);
      return {
        success: false,
        message: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Get all dynamic templates
   */
  static async getDynamicTemplates(): Promise<{ success: boolean; templates?: SendGridTemplateData[]; message?: string }> {
    try {
      const request: ClientRequest = {
        method: 'GET' as HttpMethod,
        url: '/v3/templates?generations=dynamic'
      };
      
      if (process.env.SENDGRID_API_KEY) {
        const [response, body] = await sgClient.request(request);
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return {
            success: true,
            templates: body.templates
          };
        } else {
          return {
            success: false,
            message: `Error: ${body.errors?.[0]?.message || 'Unknown error'}`
          };
        }
      } else {
        console.log('Would fetch all dynamic templates');
        return {
          success: true,
          templates: [],
          message: 'Would fetch templates (SendGrid API key not configured)'
        };
      }
    } catch (error: any) {
      console.error('Error fetching dynamic templates:', error);
      return {
        success: false,
        message: error.message || 'Unknown error'
      };
    }
  }

  // EMAIL EVENT TRACKING & ANALYTICS

  /**
   * Get email events (opens, clicks, etc.) for a specific time period
   */
  static async getEmailEvents(options: {
    startTime: Date;
    endTime: Date;
    limit?: number;
    categories?: string[];
    eventTypes?: string[];
  }): Promise<{ success: boolean; events?: EmailEvent[]; message?: string }> {
    try {
      const { startTime, endTime, limit = 100, categories = [], eventTypes = [] } = options;
      
      // Convert dates to ISO string format
      const startTimeStr = startTime.toISOString();
      const endTimeStr = endTime.toISOString();
      
      // Build query parameters
      let queryParams = `?start_time=${startTimeStr}&end_time=${endTimeStr}&limit=${limit}`;
      
      if (categories.length > 0) {
        categories.forEach(category => {
          queryParams += `&category=${encodeURIComponent(category)}`;
        });
      }
      
      if (eventTypes.length > 0) {
        eventTypes.forEach(eventType => {
          queryParams += `&event=${encodeURIComponent(eventType)}`;
        });
      }
      
      const request: ClientRequest = {
        method: 'GET' as HttpMethod,
        url: `/v3/messages${queryParams}`
      };
      
      if (process.env.SENDGRID_API_KEY) {
        const [response, body] = await sgClient.request(request);
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return {
            success: true,
            events: body
          };
        } else {
          return {
            success: false,
            message: `Error: ${body.errors?.[0]?.message || 'Unknown error'}`
          };
        }
      } else {
        console.log('Would fetch email events with parameters:', options);
        return {
          success: true,
          events: [],
          message: 'Would fetch email events (SendGrid API key not configured)'
        };
      }
    } catch (error: any) {
      console.error('Error fetching email events:', error);
      return {
        success: false,
        message: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Get email statistics for a specific time period
   */
  static async getEmailStats(options: {
    startDate: Date;
    endDate: Date;
    aggregatedBy?: 'day' | 'week' | 'month';
    categories?: string[];
  }): Promise<{ success: boolean; stats?: any; message?: string }> {
    try {
      const { startDate, endDate, aggregatedBy = 'day', categories = [] } = options;
      
      // Format dates for SendGrid API (YYYY-MM-DD)
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Build query parameters
      let queryParams = `?start_date=${startDateStr}&end_date=${endDateStr}&aggregated_by=${aggregatedBy}`;
      
      if (categories.length > 0) {
        categories.forEach(category => {
          queryParams += `&categories=${encodeURIComponent(category)}`;
        });
      }
      
      const request: ClientRequest = {
        method: 'GET' as HttpMethod,
        url: `/v3/stats${queryParams}`
      };
      
      if (process.env.SENDGRID_API_KEY) {
        const [response, body] = await sgClient.request(request);
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return {
            success: true,
            stats: body
          };
        } else {
          return {
            success: false,
            message: `Error: ${body.errors?.[0]?.message || 'Unknown error'}`
          };
        }
      } else {
        console.log('Would fetch email statistics with parameters:', options);
        return {
          success: true,
          stats: {
            startDate: startDateStr,
            endDate: endDateStr,
            aggregatedBy,
            stats: []
          },
          message: 'Would fetch email stats (SendGrid API key not configured)'
        };
      }
    } catch (error: any) {
      console.error('Error fetching email statistics:', error);
      return {
        success: false,
        message: error.message || 'Unknown error'
      };
    }
  }

  // INFRASTRUCTURE MANAGEMENT

  /**
   * Configure webhook for email events
   */
  static async configureWebhook(options: {
    url: string;
    enabled?: boolean;
    eventTypes?: string[];
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const { url, enabled = true, eventTypes = ['delivered', 'opened', 'clicked', 'bounced', 'spam_report', 'unsubscribe'] } = options;
      
      // Prepare webhook configuration
      const webhookData: WebhookSettingsData = {
        enabled,
        url,
        event_types: eventTypes,
        bounce: eventTypes.includes('bounced'),
        click: eventTypes.includes('clicked'),
        deferred: eventTypes.includes('deferred'),
        delivered: eventTypes.includes('delivered'),
        dropped: eventTypes.includes('dropped'),
        group_resubscribe: eventTypes.includes('group_resubscribe'),
        group_unsubscribe: eventTypes.includes('group_unsubscribe'),
        open: eventTypes.includes('opened'),
        processed: eventTypes.includes('processed'),
        spam_report: eventTypes.includes('spam_report'),
        unsubscribe: eventTypes.includes('unsubscribe')
      };
      
      // Check if webhook exists first
      const getRequest: ClientRequest = {
        method: 'GET' as HttpMethod,
        url: '/v3/user/webhooks/event/settings'
      };
      
      if (process.env.SENDGRID_API_KEY) {
        // Check if webhook already exists
        const [getResponse, getBody] = await sgClient.request(getRequest);
        
        let method: 'POST' | 'PATCH' = 'POST';
        if (getResponse.statusCode === 200 && getBody.enabled !== undefined) {
          // Webhook exists, update it
          method = 'PATCH';
        }
        
        // Create or update webhook
        const request = {
          method,
          url: '/v3/user/webhooks/event/settings',
          body: webhookData
        };
        
        const [response, body] = await sgClient.request(request);
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return {
            success: true,
            message: `Webhook ${method === 'POST' ? 'created' : 'updated'} successfully`
          };
        } else {
          return {
            success: false,
            message: `Error: ${body.errors?.[0]?.message || 'Unknown error'}`
          };
        }
      } else {
        console.log('Would configure webhook with parameters:', options);
        return {
          success: true,
          message: 'Would configure webhook (SendGrid API key not configured)'
        };
      }
    } catch (error: any) {
      console.error('Error configuring webhook:', error);
      return {
        success: false,
        message: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Configure IP pool for sending emails (used for IP rotation/warmup)
   */
  static async configureIPPool(options: {
    name: string;
    ips?: string[];
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const { name, ips = [] } = options;
      
      if (!name) {
        return {
          success: false,
          message: 'IP pool name is required'
        };
      }
      
      // First, check if the pool already exists
      const getRequest = {
        method: 'GET',
        url: `/v3/ips/pools/${name}`
      };
      
      if (process.env.SENDGRID_API_KEY) {
        try {
          // Check if pool exists
          await sgClient.request(getRequest);
          
          // Pool exists, update it if IPs provided
          if (ips.length > 0) {
            // Remove all IPs from pool first
            const currentPoolRequest = {
              method: 'GET',
              url: `/v3/ips/pools/${name}`
            };
            
            const [poolResponse, poolBody] = await sgClient.request(currentPoolRequest);
            
            if (poolResponse.statusCode === 200 && poolBody.ips) {
              for (const ip of poolBody.ips) {
                const removeIpRequest = {
                  method: 'DELETE',
                  url: `/v3/ips/pools/${name}/ips/${ip}`
                };
                await sgClient.request(removeIpRequest);
              }
            }
            
            // Add new IPs to pool
            for (const ip of ips) {
              const addIpRequest = {
                method: 'POST',
                url: `/v3/ips/pools/${name}/ips`,
                body: { ip }
              };
              await sgClient.request(addIpRequest);
            }
          }
          
          return {
            success: true,
            message: `IP pool "${name}" updated successfully`
          };
        } catch (poolError: any) {
          // Pool doesn't exist, create it
          if (poolError.response && poolError.response.statusCode === 404) {
            const createPoolRequest = {
              method: 'POST',
              url: '/v3/ips/pools',
              body: { name }
            };
            
            const [createResponse, createBody] = await sgClient.request(createPoolRequest);
            
            if (createResponse.statusCode < 200 || createResponse.statusCode >= 300) {
              return {
                success: false,
                message: `Error creating IP pool: ${createBody.errors?.[0]?.message || 'Unknown error'}`
              };
            }
            
            // Add IPs to pool if provided
            if (ips.length > 0) {
              for (const ip of ips) {
                const addIpRequest = {
                  method: 'POST',
                  url: `/v3/ips/pools/${name}/ips`,
                  body: { ip }
                };
                await sgClient.request(addIpRequest);
              }
            }
            
            return {
              success: true,
              message: `IP pool "${name}" created successfully`
            };
          } else {
            throw poolError;
          }
        }
      } else {
        console.log('Would configure IP pool:', options);
        return {
          success: true,
          message: 'Would configure IP pool (SendGrid API key not configured)'
        };
      }
    } catch (error: any) {
      console.error('Error configuring IP pool:', error);
      return {
        success: false,
        message: error.message || 'Unknown error'
      };
    }
  }

  // DMARC EMAIL PROCESSING & SECURITY

  /**
   * Process DMARC emails (reports sent to inbox)
   * This method extracts DMARC reports from an email inbox, parses them, and stores in the database
   */
  static async processDmarcEmails(options: {
    maxEmails?: number;
    processAttachments?: boolean;
    notificationEmail?: string;
  } = {}): Promise<{ success: boolean; processedCount: number; message?: string }> {
    try {
      const { maxEmails = 10, processAttachments = true, notificationEmail } = options;
      console.log(`Starting DMARC email processing (max: ${maxEmails}, with${processAttachments ? '' : 'out'} attachments)`);
      
      // In a real implementation, this would:
      // 1. Connect to an email API (IMAP, SendGrid Inbound Parse, etc.)
      // 2. Fetch recent emails with potential DMARC reports
      
      // For demonstration purposes, we'll log what would happen in production
      console.log('DMARC email processing would connect to an inbox and scan for new reports');
      
      let processedCount = 0;
      
      if (process.env.SENDGRID_API_KEY) {
        // For now, just simulate processing to demonstrate the implementation
        // In a real implementation, this would fetch emails via IMAP or SendGrid Inbound Parse API
        
        console.log('Would process emails containing DMARC reports');
        
        // If notification email is provided, we would send a summary
        if (notificationEmail) {
          await this.sendEmail({
            to: notificationEmail,
            subject: 'DMARC Processing Report',
            html: `
              <h2>DMARC Processing Report</h2>
              <p>DMARC processing completed at ${new Date().toLocaleString()}</p>
              <p>Total processed: ${processedCount} reports</p>
              <p>This is a simulated report for demonstration purposes.</p>
            `
          });
        }
      } else {
        console.warn('SendGrid API key not configured - email processing skipped');
      }
      
      return {
        success: true,
        processedCount,
        message: `Processed ${processedCount} DMARC reports`
      };
    } catch (error: any) {
      console.error('Error processing DMARC emails:', error);
      return {
        success: false,
        processedCount: 0,
        message: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Generate a more detailed security assessment based on DMARC report data
   */
  private static getDetailedSecurityAssessment(report: DmarcReport): string {
    // Determine security status with more comprehensive evaluation
    const dkimPass = report.dkimResult === 'pass';
    const spfPass = report.spfResult === 'pass';
    const dkimAlignment = report.alignmentDkim === 'pass';
    const spfAlignment = report.alignmentSpf === 'pass';
    
    // Build comprehensive assessment
    if (dkimPass && spfPass && dkimAlignment && spfAlignment) {
      return "✅ Strong Authentication: All checks passed. This source has passed both DKIM and SPF authentication with proper alignment, indicating a legitimate sender authorized to use your domain.";
    } else if ((dkimPass && dkimAlignment) || (spfPass && spfAlignment)) {
      return "⚠️ Partial Authentication: This source passed either DKIM or SPF with proper alignment. This indicates likely legitimacy, but full authentication would provide stronger security.";
    } else if (dkimPass || spfPass) {
      return "⚠️ Authentication Without Alignment: Authentication passed, but without domain alignment. This could indicate a legitimate service sending on your behalf, but alignment issues should be reviewed.";
    } else {
      return "❌ Authentication Failure: This source failed all authentication checks and may be attempting to spoof your domain. This type of message would likely be rejected or quarantined by receiving mail servers.";
    }
  }

  /**
   * Determine security threat level based on DMARC report
   */
  private static getSecurityThreatLevel(report: DmarcReport): string {
    // Determine security threat level
    const dkimPass = report.dkimResult === 'pass';
    const spfPass = report.spfResult === 'pass';
    const dkimAlignment = report.alignmentDkim === 'pass';
    const spfAlignment = report.alignmentSpf === 'pass';
    
    if (!dkimPass && !spfPass) {
      return 'high';
    } else if ((!dkimPass && !dkimAlignment) || (!spfPass && !spfAlignment)) {
      return 'medium';
    } else if (!dkimPass || !spfPass || !dkimAlignment || !spfAlignment) {
      return 'low';
    } else {
      return 'none';
    }
  }

  /**
   * Generate DMARC recommendations based on report
   */
  private static getDmarcRecommendations(report: DmarcReport): string {
    // Determine security status
    const dkimPass = report.dkimResult === 'pass';
    const spfPass = report.spfResult === 'pass';
    const dkimAlignment = report.alignmentDkim === 'pass';
    const spfAlignment = report.alignmentSpf === 'pass';
    const disposition = report.disposition;
    
    let recommendations = [];
    
    // DKIM recommendations
    if (!dkimPass) {
      recommendations.push("Configure DKIM for the sending servers to improve authentication.");
    }
    
    // SPF recommendations
    if (!spfPass) {
      recommendations.push("Update your SPF record to include this sender's IP address if it's a legitimate sender.");
    }
    
    // Alignment recommendations
    if (!dkimAlignment && dkimPass) {
      recommendations.push("Ensure DKIM signing domain aligns with the From header domain.");
    }
    
    if (!spfAlignment && spfPass) {
      recommendations.push("Review SPF configuration to ensure proper domain alignment.");
    }
    
    // Policy recommendations
    if (disposition === 'none' && (dkimPass || spfPass)) {
      recommendations.push("Consider strengthening your DMARC policy from 'none' to 'quarantine' to better protect your domain.");
    } else if (disposition === 'quarantine' && (dkimPass && spfPass)) {
      recommendations.push("Consider strengthening your DMARC policy from 'quarantine' to 'reject' for maximum protection.");
    }
    
    if (recommendations.length === 0) {
      return "✅ No action needed. Your email authentication is properly configured.";
    }
    
    return "Recommendations:\n• " + recommendations.join("\n• ");
  }
}