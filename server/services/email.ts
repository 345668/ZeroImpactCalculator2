import sgMail from '@sendgrid/mail';
import { AIService } from './ai.js';
import { storage } from '../storage';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const SENDER_EMAIL = 'pmm@sands-neptune.de';
const SENDER_NAME = 'Radical Zero Carbon Credits';

export class EmailService {
  static async sendCarbonReport(data: any) {
    try {
      console.log('Starting email generation process for:', data.email);

      // Try to find a carbon report email template first
      const templates = await storage.getAllEmailTemplates();
      let subject = 'Your Carbon Savings Report from Radical Zero';
      let customTemplate = false;
      let emailContent;
      
      const carbonReportTemplate = templates.find((t: any) => 
        t.templateType === 'standard' && 
        t.isDefault === true && 
        (t.name.toLowerCase().includes('carbon') || t.name.toLowerCase().includes('report'))
      );
      
      if (carbonReportTemplate) {
        console.log(`Using custom email template: ${carbonReportTemplate.name} (ID: ${carbonReportTemplate.id})`);
        subject = carbonReportTemplate.subject;
        customTemplate = true;
      }

      // Generate content - if a custom template exists, the AIService will use it
      emailContent = await AIService.generateEmailContent({
        firstName: data.firstName,
        lastName: data.lastName,
        co2Savings: data.co2Savings,
        carbonCredits: data.carbonCredits,
        financialValue: data.financialValue,
        buildingSize: data.buildingSize,
        currentConsumption: data.currentConsumption,
        projectedConsumption: data.projectedConsumption,
        heatingSystem: data.heatingSystem
      });

      console.log('Email content generated successfully');

      // Structure the message according to SendGrid Web API format
      const msg = {
        to: {
          email: data.email,
          name: `${data.firstName} ${data.lastName}`
        },
        from: {
          email: SENDER_EMAIL,
          name: SENDER_NAME
        },
        subject: subject,
        html: emailContent,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        },
        categories: ['carbon-report'],
        replyTo: SENDER_EMAIL,
        mailSettings: {
          sandboxMode: {
            enable: false // Ensure sandbox mode is disabled for production emails
          }
        }
      };

      console.log('Attempting to send email with configured message:', {
        to: msg.to.email,
        from: msg.from.email,
        subject: msg.subject,
        contentLength: emailContent.length,
        timestamp: new Date().toISOString()
      });

      const [response] = await sgMail.send(msg);
      console.log('SendGrid API Response:', {
        statusCode: response.statusCode,
        headers: response.headers,
        body: response.body,
        timestamp: new Date().toISOString()
      });

      if (response.statusCode !== 202) {
        throw new Error(`SendGrid API error: ${response.statusCode}`);
      }

      console.log('Email sent successfully to:', data.email);
      return { success: true, message: 'Email sent successfully' };
    } catch (error: any) {
      console.error('Email service error:', {
        error: error.message,
        response: error.response?.body,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  static async sendTestEmail(toEmail: string) {
    try {
      console.log('Sending test email to:', toEmail);

      const msg = {
        to: toEmail,
        from: {
          email: SENDER_EMAIL,
          name: SENDER_NAME
        },
        subject: 'Test Email from Radical Zero',
        text: 'This is a test email to verify SendGrid configuration',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Test Email from Radical Zero</h2>
            <p>This is a test email to verify SendGrid configuration.</p>
            <p>If you received this email, it means your email configuration is working correctly.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              Sent by Radical Zero Carbon Credits System
            </p>
          </div>
        `,
        mailSettings: {
          sandboxMode: {
            enable: false
          }
        }
      };

      console.log('Attempting to send test email with configuration:', {
        to: msg.to,
        from: msg.from.email,
        subject: msg.subject,
        timestamp: new Date().toISOString()
      });

      const [response] = await sgMail.send(msg);
      console.log('Test email response:', {
        statusCode: response.statusCode,
        headers: response.headers,
        timestamp: new Date().toISOString()
      });
      return response.statusCode === 202;
    } catch (error: any) {
      console.error('Test email error:', {
        error: error.message,
        response: error.response?.body,
        detailedError: JSON.stringify(error.response?.body, null, 2),
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
}