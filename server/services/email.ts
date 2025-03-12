import sgMail from '@sendgrid/mail';
import { AIService } from './ai.js';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export class EmailService {
  static async sendCarbonReport(data: any) {
    try {
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

      const msg = {
        to: data.email,
        from: 'noreply@radical-zero.com', // Replace with your verified sender
        subject: 'Your Carbon Savings Report from Radical Zero',
        html: emailContent,
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('SendGrid email error:', error);
      throw error;
    }
  }
}
