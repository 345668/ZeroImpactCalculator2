import sgMail from '@sendgrid/mail';
import { AIService } from './ai.js';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const SENDER_EMAIL = 'sandsneptune@gmail.com';

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

      // Structure the message according to SendGrid Web API format
      const msg = {
        to: {
          email: data.email,
          name: `${data.firstName} ${data.lastName}`
        },
        from: {
          email: SENDER_EMAIL,
          name: 'Radical Zero Carbon Credits'
        },
        subject: 'Your Carbon Savings Report from Radical Zero',
        html: emailContent,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        },
        categories: ['carbon-report']
      };

      console.log('Attempting to send email with configured message');

      const [response] = await sgMail.send(msg);
      console.log('SendGrid response status:', response.statusCode);

      if (response.statusCode !== 202) {
        throw new Error(`SendGrid API error: ${response.statusCode}`);
      }

      console.log('Email sent successfully to:', data.email);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

  static async sendTestEmail(toEmail: string) {
    try {
      const msg = {
        to: toEmail,
        from: {
          email: SENDER_EMAIL,
          name: 'Radical Zero Carbon Credits'
        },
        subject: 'Test Email from Radical Zero',
        text: 'This is a test email to verify SendGrid configuration',
        html: '<strong>This is a test email to verify SendGrid configuration</strong>'
      };

      const [response] = await sgMail.send(msg);
      console.log('Test email response:', response.statusCode);
      return response.statusCode === 202;
    } catch (error) {
      console.error('Test email error:', error);
      throw error;
    }
  }
}