import OpenAI from "openai";
import { AI_CONFIG } from "@shared/config";
import { storage } from '../storage';

// Flag to indicate if LLM email generation should be used
// Set to false to disable LLM and use templates instead
const USE_LLM_FOR_EMAIL_GENERATION = false;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: AI_CONFIG.openai.apiKey,
});

export class AIService {
  static async analyzeCarbonImpact(description: string): Promise<{
    impact: number;
    confidence: number;
    suggestions: string[];
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: AI_CONFIG.openai.model,
        messages: [
          {
            role: "system",
            content: "You are a carbon impact analysis expert. Analyze the given description and provide impact scores and suggestions in JSON format."
          },
          {
            role: "user",
            content: description
          }
        ],
        max_tokens: AI_CONFIG.openai.maxTokens,
        temperature: AI_CONFIG.openai.temperature,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        impact: result.impact,
        confidence: result.confidence,
        suggestions: result.suggestions
      };
    } catch (error) {
      console.error("Error analyzing carbon impact:", error);
      throw new Error("Failed to analyze carbon impact");
    }
  }

  static async generateEmailContent(data: {
    firstName: string;
    lastName: string;
    co2Savings: number;
    carbonCredits: number;
    financialValue: number;
    buildingSize: number;
    currentConsumption: number;
    projectedConsumption: number;
    heatingSystem: string;
    template?: any; // Accept template directly
  }): Promise<string> {
    try {
      // If LLM email generation is enabled, use OpenAI to generate content
      if (USE_LLM_FOR_EMAIL_GENERATION) {
        console.log('Using LLM to generate email content');
        const response = await openai.chat.completions.create({
          model: AI_CONFIG.openai.model,
          messages: [
            {
              role: "system",
              content: "You are an expert in carbon credits and energy efficiency. Write a professional and personalized email to explain the carbon savings calculation results. Use a friendly but professional tone."
            },
            {
              role: "user",
              content: `Write an email for:
              Name: ${data.firstName} ${data.lastName}
              CO2 Savings: ${data.co2Savings} tons/year
              Carbon Credits: ${data.carbonCredits}
              Financial Value: €${data.financialValue}
              Building Size: ${data.buildingSize}m²
              Current Consumption: ${data.currentConsumption} kWh/year
              Projected Consumption: ${data.projectedConsumption} kWh/year
              Heating System: ${data.heatingSystem}

              Include:
              1. Personal greeting
              2. Summary of their potential savings
              3. Explanation of how carbon credits work
              4. Next steps
              5. Professional closing

              Format the email in HTML with proper styling.`
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        return response.choices[0].message.content || '';
      }
      
      // If LLM is disabled, use template-based approach
      console.log('LLM email generation is disabled. Using template-based approach.');
      
      try {
        // Use the directly provided template if available
        let template = data.template;
        
        // If no template was provided, try to find one from the database
        if (!template) {
          template = await storage.getDefaultEmailTemplate();
        }
        
        if (!template) {
          console.warn('No template found. Using fallback HTML template.');
          // Fallback to a basic HTML template if no template is found
          return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
              <h2>Your Carbon Credits Report</h2>
              <p>Hello ${data.firstName} ${data.lastName},</p>
              <p>Thank you for using our Carbon Credits Calculator. Here's a summary of your results:</p>
              
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>CO2 Savings:</strong> ${data.co2Savings} tons/year</p>
                <p><strong>Carbon Credits:</strong> ${data.carbonCredits}</p>
                <p><strong>Financial Value:</strong> €${data.financialValue}</p>
                <p><strong>Building Size:</strong> ${data.buildingSize}m²</p>
                <p><strong>Current Consumption:</strong> ${data.currentConsumption} kWh/year</p>
                <p><strong>Projected Consumption:</strong> ${data.projectedConsumption} kWh/year</p>
                <p><strong>Heating System:</strong> ${data.heatingSystem}</p>
              </div>
              
              <p>These results represent your potential contribution to reducing carbon emissions and fighting climate change.</p>
              
              <p>Best regards,<br>Radical Zero Carbon Credits Team</p>
            </div>
          `;
        }
        
        // Replace variables in the template
        let body = template.body;
        
        // Replace all the variables in the template
        const variables = {
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: `${data.firstName} ${data.lastName}`,
          co2Savings: data.co2Savings,
          carbonCredits: data.carbonCredits,
          financialValue: data.financialValue,
          buildingSize: data.buildingSize,
          currentConsumption: data.currentConsumption,
          projectedConsumption: data.projectedConsumption,
          heatingSystem: data.heatingSystem,
          energyReduction: (data.currentConsumption - data.projectedConsumption).toFixed(2),
          reductionPercentage: ((1 - (data.projectedConsumption / data.currentConsumption)) * 100).toFixed(2),
          date: new Date().toLocaleDateString(),
          year: new Date().getFullYear().toString()
        };
        
        // Replace all placeholders with actual values
        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          body = body.replace(regex, String(value));
        });
        
        // Process markdown-style formatting
        const processEmailTemplate = (content: string): string => {
          let processed = content;
          
          // Convert markdown links to HTML links
          processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #007bff; text-decoration: underline;">$1</a>');
          
          // Convert bullet points
          processed = processed.replace(/^- (.+)$/gm, '<li style="margin-bottom: 8px;">$1</li>');
          processed = processed.replace(/(<li[^>]*>.*<\/li>)\s*(<li[^>]*>)/g, '$1$2');
          processed = processed.replace(/(<li[^>]*>.*<\/li>)+/g, '<ul style="padding-left: 20px; margin: 15px 0;">$&</ul>');
          
          // Replace horizontal rules
          processed = processed.replace(/---/g, '<hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">');
          
          // First, preserve consecutive line breaks to maintain paragraph spacing
          // This will replace double line breaks with a special marker
          processed = processed.replace(/\n\n/g, '§PARAGRAPH§');
          
          // Now replace remaining single line breaks with <br> tags for line breaks within paragraphs
          processed = processed.replace(/\n/g, '<br>\n');
          
          // Now convert the paragraph markers back to proper paragraph tags
          processed = processed.replace(/§PARAGRAPH§/g, '</p><p style="margin: 16px 0;">');
          
          // Wrap in paragraph tags if not already wrapped
          if (!processed.startsWith('<p')) {
            processed = '<p style="margin: 16px 0;">' + processed;
          }
          if (!processed.endsWith('</p>')) {
            processed = processed + '</p>';
          }
          
          return processed;
        };
        
        // Process the template
        body = processEmailTemplate(body);
        
        // Add proper styling for paragraphs and other elements
        body = `
          <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="padding: 20px;">
              ${body}
            </div>
          </div>
        `;
        
        return body;
      } catch (templateError) {
        console.error("Error using template:", templateError);
        throw new Error("Failed to generate email content using template");
      }
    } catch (error) {
      console.error("Error generating email content:", error);
      throw new Error("Failed to generate email content");
    }
  }
}