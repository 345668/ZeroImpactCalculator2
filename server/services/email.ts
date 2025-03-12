import sgMail from '@sendgrid/mail';
import { AIService } from './ai.js';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const SENDER_EMAIL = 'sandsneptune@gmail.com'; // Using verified sender email

export class EmailService {
  static async sendCarbonReport(data: any) {
    try {
      console.log('Starting email generation process for:', data.email);
      console.log('Input data:', JSON.stringify(data, null, 2));

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

      console.log('Email content generated successfully:', emailContent.substring(0, 100) + '...');

      // Structure the message exactly as shown in SendGrid documentation
      const msg = {
        personalizations: [{
          to: [{ email: data.email }],
          subject: 'Your Carbon Savings Report from Radical Zero'
        }],
        from: {
          email: SENDER_EMAIL,
          name: 'Radical Zero Carbon Credits'
        },
        content: [{
          type: "text/html",
          value: emailContent
        }],
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking: { enable: true }
        }
      };

      console.log('Attempting to send email with message:', JSON.stringify(msg, null, 2));

      try {
        const [response] = await sgMail.send(msg);
        console.log('SendGrid response:', response.statusCode);

        if (response.statusCode !== 202) {
          throw new Error(`SendGrid API error: ${response.statusCode}`);
        }

        console.log('Email sent successfully to:', data.email);
        return { success: true, message: 'Email sent successfully' };
      } catch (sendError: any) {
        console.error('SendGrid sending error:', {
          error: sendError.message,
          code: sendError.code,
          response: sendError.response?.body
        });
        throw new Error(`Failed to send email: ${sendError.message}`);
      }
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }
}