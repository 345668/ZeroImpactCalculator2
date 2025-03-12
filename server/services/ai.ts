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
1. Main container should have a light grey background (#f5f5f5) with padding and rounded corners
2. Title banner should be a prominent blue (#0066CC) section with:
   - Larger font size (24px)
   - Centered text in white
   - Good padding (30px)
   - Rounded top corners (8px)
3. Content section should have:
   - White background
   - Generous padding (30px)
   - Subtle border
   - Rounded bottom corners (8px)
4. All highlighted or emphasized text should use the same blue color (#0066CC)
5. Important numbers and statistics should be in bold and blue (#0066CC)
6. Include divider lines between sections using a light grey color
7. Use proper spacing between paragraphs and sections
8. All numerical values should be formatted with commas for thousands and proper units

Example HTML structure:
<div style="background-color: #f5f5f5; padding: 30px; border-radius: 8px; font-family: Arial, sans-serif;">
  <div style="background-color: #0066CC; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Your Carbon Savings Report</h1>
  </div>
  <div style="background-color: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
    [Content goes here with blue highlights for numbers]
  </div>
</div>`
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
            1. A prominent blue (#0066CC) header banner with centered title
            2. Personal greeting using their first name
            3. Summary section highlighting their key metrics in blue:
               - Building size
               - Current and projected energy consumption
               - CO2 savings with 10-year projection
               - Number of carbon credits
               - Financial value in euros
            4. Clear explanation of how their energy savings translate to carbon credits
            5. Next steps section with bullet points
            6. Professional closing

            Format all numbers with:
            - Comma separators for thousands
            - Appropriate units in blue
            - Bold and blue highlighting for emphasis`
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