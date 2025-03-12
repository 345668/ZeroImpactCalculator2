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
    } catch (error) {
      console.error("Error generating email content:", error);
      throw new Error("Failed to generate email content");
    }
  }
}