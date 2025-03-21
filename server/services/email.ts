import sgMail from '@sendgrid/mail';
import { AIService } from './ai.js';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Use a verified sender email - this should be verified in your SendGrid account
const SENDER_EMAIL = 'pmm@sands-neptune.de';
const SENDER_NAME = 'Radical Zero Carbon Credits';

export class EmailService {
  static async sendCarbonReport(data: any) {
    try {
      console.log('Starting email generation process for:', data.email);

      // Generate personalized content using Mistral AI
      const emailContent = await AIService.generateEmailContent({
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

      // Structure the message in a simpler format to avoid potential API issues
      const msg = {
        to: data.email,
        from: {
          email: SENDER_EMAIL,
          name: SENDER_NAME
        },
        subject: 'Your Carbon Savings Report from Radical Zero',
        html: emailContent
      };

      console.log('Attempting to send email with configured message:', {
        to: msg.to,
        from: msg.from.email,
        subject: msg.subject,
        contentLength: emailContent.length,
        timestamp: new Date().toISOString()
      });

      // Send the email with simplified structure
      const response = await sgMail.send(msg);
      
      console.log('SendGrid API Response:', {
        statusCode: response[0].statusCode,
        headers: response[0].headers,
        timestamp: new Date().toISOString()
      });

      if (response[0].statusCode !== 202) {
        throw new Error(`SendGrid API error: ${response[0].statusCode}`);
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

      // Simplify the message format
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
        `
      };

      console.log('Attempting to send test email with configuration:', {
        to: msg.to,
        from: msg.from.email,
        subject: msg.subject,
        timestamp: new Date().toISOString()
      });

      const response = await sgMail.send(msg);
      console.log('Test email response:', {
        statusCode: response[0].statusCode,
        headers: response[0].headers,
        timestamp: new Date().toISOString()
      });
      return response[0].statusCode === 202;
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