import sgMail from '@sendgrid/mail';
import { AIService } from './ai.js';
import { db } from '../db.js';
import { submissions } from '@shared/schema';
import { eq } from 'drizzle-orm';

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

      // First check if submission exists in database
      const [submission] = await db
        .select()
        .from(submissions)
        .where(eq(submissions.email, data.email))
        .orderBy(submissions.submittedAt, 'desc')
        .limit(1);

      if (!submission) {
        throw new Error('No submission found for this email');
      }

      // Check if email was already sent
      if (submission.emailSent === "yes") {
        return { 
          success: true, 
          message: "Email was already sent to this customer" 
        };
      }

      // Generate personalized content using Mistral AI
      const emailContent = await AIService.generateEmailContent({
        firstName: submission.firstName,
        lastName: submission.lastName,
        co2Savings: submission.co2Savings,
        carbonCredits: submission.carbonCredits,
        financialValue: submission.financialValue,
        buildingSize: submission.buildingSize,
        currentConsumption: submission.currentConsumption,
        projectedConsumption: submission.projectedConsumption,
        heatingSystem: submission.heatingSystem
      });

      console.log('Email content generated successfully:', emailContent.substring(0, 100) + '...');

      // Structure the message exactly as shown in SendGrid documentation
      const msg = {
        personalizations: [{
          to: [{ 
            email: submission.email,
            name: `${submission.firstName} ${submission.lastName}`
          }],
          subject: 'Your Carbon Savings Report from Radical Zero',
          dynamic_template_data: {
            firstName: submission.firstName,
            lastName: submission.lastName,
            co2Savings: submission.co2Savings,
            carbonCredits: submission.carbonCredits,
            financialValue: submission.financialValue
          }
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
        },
        categories: ['carbon-report']
      };

      console.log('Attempting to send email with message:', JSON.stringify(msg, null, 2));

      try {
        const [response] = await sgMail.send(msg);
        console.log('SendGrid response:', response.statusCode);

        if (response.statusCode !== 202) {
          throw new Error(`SendGrid API error: ${response.statusCode}`);
        }

        // Update submission with email sent status
        await db
          .update(submissions)
          .set({ 
            emailSent: "yes", 
            emailSentAt: new Date() 
          })
          .where(eq(submissions.id, submission.id));

        console.log('Email sent successfully to:', submission.email);
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