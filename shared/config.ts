// AI Service Configuration
export const AI_CONFIG = {
  openai: {
    model: process.env.OPENAI_MODEL || "gpt-4", // Using correct model name
    maxTokens: 4096,
    temperature: 0,
    // Use environment variable for API key
    apiKey: process.env.OPENAI_API_KEY,
  },
  azure: {
    enabled: process.env.AZURE_ENABLED === "true", // Properly handle Azure toggle
    endpoint: process.env.AZURE_ENDPOINT,
    apiKey: process.env.AZURE_API_KEY,
    apiVersion: "2024-03-01-preview", // Updated to current stable version
    deploymentId: process.env.AZURE_DEPLOYMENT_ID,
  }
} as const;

// Enhanced validation with Azure fallback
if (!AI_CONFIG.openai.apiKey && !AI_CONFIG.azure.enabled) {
  throw new Error("Either OpenAI API key or Azure configuration is required");
}

if (AI_CONFIG.azure.enabled && (!AI_CONFIG.azure.endpoint || !AI_CONFIG.azure.apiKey || !AI_CONFIG.azure.deploymentId)) {
  throw new Error("Azure configuration is incomplete. Please check endpoint, API key, and deployment ID.");
}