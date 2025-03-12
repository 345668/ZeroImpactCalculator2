// AI Service Configuration
export const AI_CONFIG = {
  openai: {
    model: process.env.OPENAI_MODEL || "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    maxTokens: 4096,
    temperature: 0,
    // Use environment variable for API key
    apiKey: process.env.OPENAI_API_KEY,
  },
  azure: {
    enabled: false, // Set to true when using Azure
    endpoint: process.env.AZURE_ENDPOINT,
    apiKey: process.env.AZURE_API_KEY,
    apiVersion: "2024-08-01-preview",
    deploymentId: process.env.AZURE_DEPLOYMENT_ID,
  }
} as const;

// Validation
if (!AI_CONFIG.openai.apiKey) {
  throw new Error("OpenAI API key is required");
}
