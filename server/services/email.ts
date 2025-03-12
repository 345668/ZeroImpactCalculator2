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

      // Structure the message exactly as shown in SendGrid documentation
      const msg = {
        personalizations: [
          {
            to: [{ email: data.email }],
            subject: 'Your Carbon Savings Report from Radical Zero'
          }
        ],
        from: {
          email: SENDER_EMAIL,
          name: 'Radical Zero Carbon Credits'
        },
        content: [
          {
            type: "text/html",
            value: emailContent
          }
        ],
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking: { enable: true }
        }
      };

      console.log('Attempting to send email with payload:', JSON.stringify(msg));

      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(msg)
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('SendGrid API error response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorBody
          });
          throw new Error(`SendGrid API error: ${response.status} ${response.statusText}`);
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