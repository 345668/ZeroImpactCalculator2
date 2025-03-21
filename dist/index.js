var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import multer from "multer";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  insertSubmissionSchema: () => insertSubmissionSchema,
  submissions: () => submissions
});
import { pgTable, text, serial, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  // Customer Information
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  // Energy Consultant Information (Optional)
  energyConsultantName: text("energy_consultant_name"),
  energyConsultantCompany: text("energy_consultant_company"),
  energyConsultantId: text("energy_consultant_id"),
  energyConsultantBafaNumber: text("energy_consultant_bafa_number"),
  // Building Information
  buildingOwnership: text("building_ownership").notNull(),
  buildingSize: numeric("building_size").notNull(),
  heatingSystem: text("heating_system").notNull(),
  currentConsumption: numeric("current_consumption").notNull(),
  projectedConsumption: numeric("projected_consumption").notNull(),
  // Calculation Results
  co2Savings: numeric("co2_savings"),
  carbonCredits: numeric("carbon_credits"),
  financialValue: numeric("financial_value"),
  // Additional Fields
  acceptedTerms: text("accepted_terms").notNull(),
  gdprConsent: text("gdpr_consent").notNull(),
  fileUrl: text("file_url"),
  // Email Tracking
  emailSent: text("email_sent").notNull().default("no"),
  emailSentAt: timestamp("email_sent_at"),
  submittedAt: timestamp("submitted_at").defaultNow()
});
var insertSubmissionSchema = createInsertSchema(submissions).extend({
  buildingSize: z.coerce.number().min(1, "Building size must be greater than 0"),
  currentConsumption: z.coerce.number().min(0, "Current consumption must be non-negative"),
  projectedConsumption: z.coerce.number().min(0, "Projected consumption must be non-negative"),
  email: z.string().email("Please enter a valid email address"),
  acceptedTerms: z.union([z.boolean(), z.string()]).transform(
    (val) => typeof val === "boolean" ? String(val) : val
  ),
  gdprConsent: z.union([z.boolean(), z.string()]).transform(
    (val) => typeof val === "boolean" ? String(val) : val
  )
}).omit({
  id: true,
  submittedAt: true,
  emailSent: true,
  emailSentAt: true,
  co2Savings: true,
  carbonCredits: true,
  financialValue: true
});

// server/storage.ts
import { eq, desc } from "drizzle-orm";

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5e3,
  max: 20,
  idleTimeoutMillis: 3e4,
  keepAlive: true
});
var db = drizzle(pool, { schema: schema_exports });
async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT 1 as test");
    console.log("Database connection test result:", result.rows[0]);
    client.release();
    return true;
  } catch (err) {
    console.error("Database connection error:", err);
    return false;
  }
}
testDatabaseConnection().then((success) => {
  if (!success) {
    console.error("Initial database connection failed");
  }
});
setInterval(async () => {
  const success = await testDatabaseConnection();
  if (!success) {
    console.error("Periodic database connection check failed");
  }
}, 3e4);

// server/storage.ts
var DbStorage = class {
  async createSubmission(insertSubmission) {
    console.log("Creating submission with data:", insertSubmission);
    try {
      const currentConsumption = Number(insertSubmission.currentConsumption);
      const projectedConsumption = Number(insertSubmission.projectedConsumption);
      const consumptionDiff = currentConsumption - projectedConsumption;
      const co2Savings = Number((consumptionDiff * 0.2).toFixed(2));
      const carbonCredits = co2Savings;
      const financialValue = Number((carbonCredits * 50).toFixed(2));
      const submissionData = {
        ...insertSubmission,
        co2Savings: co2Savings.toString(),
        carbonCredits: carbonCredits.toString(),
        financialValue: financialValue.toString(),
        acceptedTerms: String(insertSubmission.acceptedTerms),
        submittedAt: /* @__PURE__ */ new Date()
      };
      console.log("Inserting submission data:", submissionData);
      const [submission] = await db.insert(submissions).values(submissionData).returning();
      console.log("Submission created successfully:", submission);
      return submission;
    } catch (error) {
      console.error("Error creating submission:", error);
      throw error;
    }
  }
  async getSubmissionByEmail(email) {
    try {
      const [result] = await db.select().from(submissions).where(eq(submissions.email, email)).orderBy(desc(submissions.submittedAt));
      console.log("Found submission by email:", result);
      return result;
    } catch (error) {
      console.error("Error getting submission by email:", error);
      throw error;
    }
  }
  async getAllSubmissions() {
    try {
      const results = await db.select().from(submissions).orderBy(desc(submissions.submittedAt));
      console.log("Retrieved all submissions:", results.length);
      return results;
    } catch (error) {
      console.error("Error getting all submissions:", error);
      throw error;
    }
  }
  async getSubmissionById(id) {
    try {
      const [result] = await db.select().from(submissions).where(eq(submissions.id, id));
      console.log("Found submission by id:", result);
      return result;
    } catch (error) {
      console.error("Error getting submission by id:", error);
      throw error;
    }
  }
};
var storage = new DbStorage();

// server/routes.ts
import { fromZodError } from "zod-validation-error";

// server/utils/document-processor.ts
import { createWorker } from "tesseract.js";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
async function extractTextFromDocument(file) {
  try {
    let text2 = "";
    console.log("Processing file type:", file.mimetype);
    if (file.mimetype === "application/pdf") {
      console.log("Processing PDF file");
      const dataBuffer = Buffer.from(file.buffer);
      const pdfData = await pdfParse(dataBuffer);
      text2 = pdfData.text;
      console.log("PDF text extraction successful");
    } else if (file.mimetype.startsWith("image/")) {
      console.log("Processing image file with Tesseract");
      const worker = await createWorker();
      const { data: { text: extractedText } } = await worker.recognize(file.buffer);
      await worker.terminate();
      text2 = extractedText;
      console.log("Image text extraction successful");
    } else {
      throw new Error("Unsupported file type. Please upload a PDF or image file.");
    }
    if (!text2 || text2.trim().length === 0) {
      throw new Error("No text could be extracted from the document");
    }
    return text2;
  } catch (error) {
    console.error("Error extracting text:", error);
    throw new Error(`Failed to extract text from document: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function processWithMistral(text2) {
  try {
    console.log("Starting Mistral AI processing");
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          {
            role: "system",
            content: `You are an expert in analyzing energy efficiency documents and extracting key information.
                     Extract the following information in JSON format:
                     - building_size (in m\xB2)
                     - current_consumption (in kWh/year)
                     - projected_consumption (in kWh/year)
                     - heating_system_type
                     If a value is not found, use null.
                     Return only the JSON object without any additional text.`
          },
          {
            role: "user",
            content: text2
          }
        ],
        response_format: { type: "json_object" }
      })
    });
    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }
    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    console.log("Data extraction successful:", result);
    return {
      ...result,
      language: "de"
      // Since the documents appear to be in German
    };
  } catch (error) {
    console.error("Error processing with Mistral:", error);
    throw error;
  }
}

// server/routes/ai.ts
import { Router } from "express";

// server/services/ai.ts
import OpenAI from "openai";

// shared/config.ts
var AI_CONFIG = {
  openai: {
    model: process.env.OPENAI_MODEL || "gpt-4o",
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    maxTokens: 4096,
    temperature: 0,
    // Use environment variable for API key
    apiKey: process.env.OPENAI_API_KEY
  },
  azure: {
    enabled: false,
    // Set to true when using Azure
    endpoint: process.env.AZURE_ENDPOINT,
    apiKey: process.env.AZURE_API_KEY,
    apiVersion: "2024-08-01-preview",
    deploymentId: process.env.AZURE_DEPLOYMENT_ID
  }
};
if (!AI_CONFIG.openai.apiKey) {
  throw new Error("OpenAI API key is required");
}

// server/services/ai.ts
var openai = new OpenAI({
  apiKey: AI_CONFIG.openai.apiKey
});
var AIService = class {
  static async analyzeCarbonImpact(description) {
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
      const result = JSON.parse(response.choices[0].message.content || "{}");
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
  static async generateEmailContent(data) {
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
            Financial Value: \u20AC${data.financialValue}
            Building Size: ${data.buildingSize}m\xB2
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
        max_tokens: 1e3,
        temperature: 0.7
      });
      return response.choices[0].message.content || "";
    } catch (error) {
      console.error("Error generating email content:", error);
      throw new Error("Failed to generate email content");
    }
  }
};

// server/services/email.ts
import sgMail from "@sendgrid/mail";
if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
var SENDER_EMAIL = "sandsneptune@gmail.com";
var EmailService = class {
  static async sendCarbonReport(data) {
    try {
      console.log("Starting email generation process for:", data.email);
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
      console.log("Email content generated successfully");
      const msg = {
        to: {
          email: data.email,
          name: `${data.firstName} ${data.lastName}`
        },
        from: {
          email: SENDER_EMAIL,
          name: "Radical Zero Carbon Credits"
        },
        subject: "Your Carbon Savings Report from Radical Zero",
        html: emailContent,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        },
        categories: ["carbon-report"]
      };
      console.log("Attempting to send email with configured message");
      const [response] = await sgMail.send(msg);
      console.log("SendGrid response status:", response.statusCode);
      if (response.statusCode !== 202) {
        throw new Error(`SendGrid API error: ${response.statusCode}`);
      }
      console.log("Email sent successfully to:", data.email);
      return { success: true, message: "Email sent successfully" };
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  }
  static async sendTestEmail(toEmail) {
    try {
      const msg = {
        to: toEmail,
        from: {
          email: SENDER_EMAIL,
          name: "Radical Zero Carbon Credits"
        },
        subject: "Test Email from Radical Zero",
        text: "This is a test email to verify SendGrid configuration",
        html: "<strong>This is a test email to verify SendGrid configuration</strong>"
      };
      const [response] = await sgMail.send(msg);
      console.log("Test email response:", response.statusCode);
      return response.statusCode === 202;
    } catch (error) {
      console.error("Test email error:", error);
      throw error;
    }
  }
};

// server/routes/ai.ts
import { z as z2 } from "zod";
var router = Router();
var analysisSchema = z2.object({
  description: z2.string().min(1, "Description is required"),
  firstName: z2.string(),
  lastName: z2.string(),
  email: z2.string().email(),
  buildingSize: z2.number(),
  currentConsumption: z2.number(),
  projectedConsumption: z2.number(),
  heatingSystem: z2.string(),
  co2Savings: z2.number(),
  carbonCredits: z2.number(),
  financialValue: z2.number()
});
router.post("/analyze", async (req, res) => {
  try {
    const data = analysisSchema.parse(req.body);
    const analysis = await AIService.analyzeCarbonImpact(data.description);
    await EmailService.sendCarbonReport({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      co2Savings: data.co2Savings,
      carbonCredits: data.carbonCredits,
      financialValue: data.financialValue,
      buildingSize: data.buildingSize,
      currentConsumption: data.currentConsumption,
      projectedConsumption: data.projectedConsumption,
      heatingSystem: data.heatingSystem
    });
    res.json({ ...analysis, emailSent: true });
  } catch (error) {
    if (error instanceof z2.ZodError) {
      res.status(400).json({ error: "Invalid input", details: error.errors });
    } else {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "Failed to analyze carbon impact" });
    }
  }
});
var ai_default = router;

// server/routes/email.ts
import { Router as Router2 } from "express";
import { z as z3 } from "zod";
var router2 = Router2();
var emailRequestSchema = z3.object({
  firstName: z3.string().min(1, "First name is required"),
  lastName: z3.string().min(1, "Last name is required"),
  email: z3.string().email("Invalid email address"),
  co2Savings: z3.number(),
  carbonCredits: z3.number(),
  financialValue: z3.number(),
  buildingSize: z3.number().positive("Building size must be positive"),
  currentConsumption: z3.number().positive("Current consumption must be positive"),
  projectedConsumption: z3.number().positive("Projected consumption must be positive"),
  heatingSystem: z3.string().min(1, "Heating system is required")
});
router2.post("/test-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    await EmailService.sendTestEmail(email);
    res.json({ success: true, message: "Test email sent successfully" });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({ error: "Failed to send test email" });
  }
});
router2.post("/send-report", async (req, res) => {
  try {
    console.log("Received email request body:", JSON.stringify(req.body, null, 2));
    const data = emailRequestSchema.parse(req.body);
    console.log("Validation passed, parsed data:", JSON.stringify(data, null, 2));
    const result = await EmailService.sendCarbonReport(data);
    res.json({
      success: true,
      message: "Report sent successfully"
    });
  } catch (error) {
    console.error("Error in send-report route:", error);
    if (error instanceof z3.ZodError) {
      res.status(400).json({
        error: "Invalid input",
        details: error.errors,
        fields: error.errors.map((e) => ({ field: e.path.join("."), message: e.message }))
      });
    } else {
      const errorMessage = error instanceof Error ? error.message : "Failed to send email report";
      res.status(500).json({ error: errorMessage });
    }
  }
});
var email_default = router2;

// server/routes.ts
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image files are allowed"));
    }
  }
});
async function processDocument(file) {
  try {
    console.log("Starting document processing...");
    const extractedText = await extractTextFromDocument(file);
    console.log("Text extracted successfully");
    const processedData = await processWithMistral(extractedText);
    console.log("Mistral processing complete:", processedData);
    return processedData;
  } catch (error) {
    console.error("Document processing error:", error);
    throw error;
  }
}
async function registerRoutes(app2) {
  console.log("Starting route registration...");
  app2.use((req, res, next) => {
    res.header("Content-Type", "application/json");
    next();
  });
  app2.use("/api/ai", ai_default);
  app2.use("/api/email", email_default);
  app2.get("/api/submissions", async (req, res) => {
    try {
      console.log("Fetching all submissions from database");
      const submissions2 = await storage.getAllSubmissions();
      console.log(`Found ${submissions2.length} submissions`);
      res.json(submissions2);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({
        message: "Error fetching submissions",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/upload-document", upload.single("document"), async (req, res) => {
    console.log("Upload request received:", req.file ? "File present" : "No file");
    try {
      if (!req.file) {
        console.error("No file in request");
        return res.status(400).json({ message: "No file uploaded" });
      }
      console.log("Processing file:", req.file.originalname);
      const processedData = await processDocument(req.file);
      console.log("File processed successfully");
      res.json({
        message: "Document processed successfully",
        extractedData: processedData
      });
    } catch (error) {
      console.error("Document processing error:", error);
      res.status(500).json({
        message: "Error processing document",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/calculate", async (req, res) => {
    try {
      console.log("Received calculation request:", req.body);
      const validatedData = insertSubmissionSchema.parse(req.body);
      console.log("Validation successful:", validatedData);
      const consumptionDiff = Number(validatedData.currentConsumption) - Number(validatedData.projectedConsumption);
      const annualCO2Savings = Number((consumptionDiff * 0.2).toFixed(2));
      const co2Savings = (annualCO2Savings * 10).toString();
      const carbonCredits = co2Savings;
      const financialValue = (Number(carbonCredits) * 50).toString();
      const submissionData = {
        ...validatedData,
        co2Savings,
        carbonCredits,
        financialValue
      };
      const result = await storage.createSubmission(submissionData);
      console.log("Submission created:", result);
      res.json(result);
    } catch (error) {
      console.error("Calculation error:", error);
      if (error instanceof Error && error.name === "ZodError") {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({
          message: "Internal server error",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });
  app2.use((err, _req, res, _next) => {
    console.error("Express error:", err);
    res.status(500).json({
      message: "Internal server error",
      error: err instanceof Error ? err.message : "Unknown error"
    });
  });
  console.log("Route registration completed successfully");
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// server/index.ts
import path3 from "path";
import fs from "fs";
import { fileURLToPath as fileURLToPath3 } from "url";
var __filename3 = fileURLToPath3(import.meta.url);
var __dirname3 = path3.dirname(__filename3);
var app = express2();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use("/api", (req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
(async () => {
  try {
    log("Starting server initialization...");
    log("Testing database connection...");
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error("Failed to connect to database");
    }
    log("Database connection successful");
    log("Registering routes...");
    const server = await registerRoutes(app);
    log("Routes registered successfully");
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", err);
      res.status(status).json({ message });
    });
    const distPath = path3.join(__dirname3, "../dist/public");
    if (fs.existsSync(distPath)) {
      log("Static files directory found, serving static content");
      app.use(express2.static(distPath));
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api")) {
          return next();
        }
        res.sendFile(path3.join(distPath, "index.html"));
      });
    } else {
      log("Static files directory not found, skipping static file serving");
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api")) {
          return next();
        }
        res.status(200).send('Server is running in development mode. Please build the client first with "npm run build" or use the development server.');
      });
    }
    const port = 5e3;
    log(`Attempting to start server on port ${port}...`);
    const server_instance = server.listen({
      port,
      host: "0.0.0.0"
    }, () => {
      log(`Server successfully started and listening on port ${port}`);
    });
    server_instance.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        log(`Error: Port ${port} is already in use. Please free it before starting the server.`);
        process.exit(1);
      } else {
        console.error("Server error:", error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("Fatal error during server startup:", error);
    process.exit(1);
  }
})();
