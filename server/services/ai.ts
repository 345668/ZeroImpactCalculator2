import OpenAI from "openai";
import { AI_CONFIG } from "@shared/config";

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
  }): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: AI_CONFIG.openai.model,
        messages: [
          {
            role: "system",
            content: `You are an expert in carbon credits and energy efficiency. Write a professional and personalized email to explain the carbon savings calculation results. Use a friendly but professional tone.

The email should follow this HTML styling:
1. Title banner should be a rich blue color (#0066CC)
2. All highlighted or emphasized text should use the same blue color (#0066CC)
3. Use a clean, modern layout with proper spacing
4. Important numbers and statistics should be in bold and blue
5. Include a blue accent line under the main sections`
          },
          {
            role: "user",
            content: `Write an HTML email for:
            Name: ${data.firstName} ${data.lastName}
            CO2 Savings: ${data.co2Savings} tons/year
            Carbon Credits: ${data.carbonCredits}
            Financial Value: €${data.financialValue}
            Building Size: ${data.buildingSize}m²
            Current Consumption: ${data.currentConsumption} kWh/year
            Projected Consumption: ${data.projectedConsumption} kWh/year
            Heating System: ${data.heatingSystem}

            The email should include:
            1. A blue (#0066CC) header banner with the Radical Zero logo and title
            2. Personal greeting
            3. Summary of their potential savings (with blue highlighted numbers)
            4. Explanation of how carbon credits work
            5. Next steps
            6. Professional closing

            Format the email in clean HTML with proper styling and blue color scheme.`
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error("Error generating email content:", error);
      throw new Error("Failed to generate email content");
    }
  }
}