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

// Azure Storage Configuration
export const AZURE_STORAGE_CONFIG = {
  blobStorage: {
    enabled: process.env.AZURE_BLOB_STORAGE_ENABLED === "true",
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || "documents",
    useEmulator: process.env.AZURE_STORAGE_USE_EMULATOR === "true",
  },
  tableStorage: {
    enabled: process.env.AZURE_TABLE_STORAGE_ENABLED === "true",
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    tableName: process.env.AZURE_TABLE_NAME || "submissions",
    useEmulator: process.env.AZURE_STORAGE_USE_EMULATOR === "true",
  }
} as const;

// Enhanced validation with Azure fallback
if (!AI_CONFIG.openai.apiKey && !AI_CONFIG.azure.enabled) {
  throw new Error("Either OpenAI API key or Azure configuration is required");
}

if (AI_CONFIG.azure.enabled && (!AI_CONFIG.azure.endpoint || !AI_CONFIG.azure.apiKey || !AI_CONFIG.azure.deploymentId)) {
  throw new Error("Azure configuration is incomplete. Please check endpoint, API key, and deployment ID.");
}