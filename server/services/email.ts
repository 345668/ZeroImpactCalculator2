import sgMail from '@sendgrid/mail';
import { AIService } from './ai.js';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const SENDER_EMAIL = 'reports@radical-zero.com'; // Make sure this email is verified in SendGrid

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

      const msg = {
        to: data.email,
        from: {
          email: SENDER_EMAIL,
          name: 'Radical Zero Carbon Credits'
        },
        subject: 'Your Carbon Savings Report from Radical Zero',
        html: emailContent,
        personalizations: [
          {
            to: [{ email: data.email }],
            dynamic_template_data: {
              firstName: data.firstName,
              lastName: data.lastName,
              co2Savings: data.co2Savings,
              carbonCredits: data.carbonCredits,
              financialValue: data.financialValue,
              buildingSize: data.buildingSize,
              currentConsumption: data.currentConsumption,
              projectedConsumption: data.projectedConsumption,
              heatingSystem: data.heatingSystem
            }
          }
        ],
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking: { enable: true }
        },
        mail_settings: {
          sandbox_mode: { enable: false }
        }
      };

      console.log('Attempting to send email to:', data.email);

      try {
        await sgMail.send(msg);
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