import sgMail from '@sendgrid/mail';
import { MailDataRequired } from '@sendgrid/helpers/classes/mail';
import { storage } from '../storage';
import { EmailTemplate, DmarcReport } from '@shared/schema';

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * SendGrid Service for email communications with DMARC report functionality
 */
export class SendGridService {
  
  /**
   * Send an email using a template from the database
   */
  static async sendTemplatedEmail(options: {
    to: string | string[];
    templateId: number;
    dynamicData: Record<string, any>;
    attachments?: any[];
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
  }): Promise<boolean> {
    try {
      const { to, templateId, dynamicData, attachments, cc, bcc, replyTo } = options;
      
      // Get the template from the database
      const template = await storage.getEmailTemplateById(templateId);
      if (!template) {
        console.error(`Email template with ID ${templateId} not found`);
        return false;
      }
      
      // Get and fill template
      let subject = template.subject;
      let body = template.body;
      
      // Replace variables in subject and body
      if (dynamicData) {
        Object.entries(dynamicData).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          subject = subject.replace(regex, String(value));
          body = body.replace(regex, String(value));
        });
      }
      
      // Prepare the email data
      const emailData: Record<string, any> = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL || 'info@radicaldecarbonization.com',
        subject,
        html: body,
      };
      
      // Add optional parameters
      if (cc) emailData.cc = cc;
      if (bcc) emailData.bcc = bcc;
      if (replyTo) emailData.replyTo = replyTo;
      if (attachments && attachments.length > 0) emailData.attachments = attachments;
      
      // If there's a SendGrid template ID on the template, use it
      if (template.sendgridTemplateId) {
        emailData.templateId = template.sendgridTemplateId;
        emailData.dynamicTemplateData = dynamicData;
        // When using SendGrid templates, we don't need the html content
        delete emailData.html;
      }
      
      // Send the email (cast to MailDataRequired since we know we have all required fields)
      const [response] = await sgMail.send(emailData as MailDataRequired);
      console.log(`Email sent with template ${templateId}. Status: ${response.statusCode}`);
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (error) {
      console.error('Error sending templated email:', error);
      return false;
    }
  }
  
  /**
   * Send a DMARC report notification based on DMARC report data
   */
  static async sendDmarcAlert(report: DmarcReport, to: string | string[]): Promise<boolean> {
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
        return false;
      }
      
      console.log(`Using email template: ${template.name} (ID: ${template.id}) for DMARC alert`);
      
      // Prepare DMARC alert data
      const dynamicData = {
        domain: report.domain,
        sourceIp: report.sourceIp,
        sourceOrg: report.sourceOrg || 'Unknown',
        reportingOrg: report.reportingOrg,
        count: report.count,
        disposition: report.disposition,
        dkimResult: report.dkimResult || 'N/A',
        spfResult: report.spfResult || 'N/A',
        alignmentDkim: report.alignmentDkim || 'N/A',
        alignmentSpf: report.alignmentSpf || 'N/A',
        policyEvaluated: report.policyEvaluated || 'N/A',
        reportDate: report.reportDate ? new Date(report.reportDate).toLocaleString() : 'N/A',
        receivedDate: report.receivedDate ? new Date(report.receivedDate).toLocaleString() : 'N/A',
        // Add common security assessment
        securityAssessment: SendGridService.getSecurityAssessment(report),
        reportId: report.reportId
      };
      
      // Send the report notification
      return await SendGridService.sendTemplatedEmail({
        to,
        templateId: template.id,
        dynamicData,
      });
    } catch (error) {
      console.error('Error sending DMARC alert:', error);
      return false;
    }
  }
  
  /**
   * Generate a security assessment based on DMARC report data
   */
  private static getSecurityAssessment(report: DmarcReport): string {
    // Determine security status
    const dkimPass = report.dkimResult === 'pass';
    const spfPass = report.spfResult === 'pass';
    
    if (dkimPass && spfPass) {
      return "✅ All authentication checks passed. This email source appears legitimate.";
    } else if (dkimPass || spfPass) {
      return "⚠️ Partial authentication success. This source may be legitimate but requires review.";
    } else {
      return "❌ Authentication failure. This source is suspicious and might be attempting to spoof your domain.";
    }
  }
  
  /**
   * Fetch stats from SendGrid Analytics API
   * Requires appropriate SendGrid API permissions
   */
  static async getEmailStats(startDate: Date, endDate: Date): Promise<any> {
    try {
      // Format dates for SendGrid API
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // This would normally use SendGrid's Stats API
      // For now, just returning placeholder stats object
      return {
        startDate: startDateStr,
        endDate: endDateStr,
        stats: {
          delivered: 0,
          opens: 0,
          clicks: 0,
          bounces: 0,
          spam_reports: 0,
        },
        message: "Note: Production code would make a real API call to SendGrid's stats endpoint"
      };
    } catch (error) {
      console.error('Error fetching email stats:', error);
      throw error;
    }
  }
  
  /**
   * This method would retrieve DMARC reports from an email inbox using SendGrid inbound parse
   * or other email processing service. In a full implementation, this would:
   * 1. Connect to an inbox where DMARC reports are sent
   * 2. Look for XML report attachments
   * 3. Parse and process the reports
   * 4. Store them in the database
   */
  static async processDmarcEmails(): Promise<number> {
    // This is a placeholder for the actual implementation
    console.log('Processing DMARC emails (placeholder implementation)');
    return 0; // Return the number of processed reports
  }
}