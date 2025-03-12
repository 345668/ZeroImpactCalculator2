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

      const result = JSON.parse(response.choices[0].message.content);
      
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

  // Add more AI analysis methods as needed
}
