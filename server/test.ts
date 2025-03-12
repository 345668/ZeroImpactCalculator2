import express from "express";
import { EmailService } from "./services/email.js";
import { log } from "./vite.js";

const app = express();
app.use(express.json());

// Test email endpoint
app.post("/api/test-email", async (req, res) => {
  try {
    const testData = {
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      co2Savings: 1234.56,
      carbonCredits: 500,
      financialValue: 25000,
      buildingSize: 2500,
      currentConsumption: 50000,
      projectedConsumption: 30000,
      heatingSystem: "Gas Heating"
    };

    console.log('Generating test email with new template...');
    const result = await EmailService.sendCarbonReport(testData);
    console.log('Email generation result:', result);
    res.json({ success: true, message: "Test email sent successfully" });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: "Failed to send test email" });
  }
});

const port = 5001; // Changed to 5001 to avoid conflict
const server = app.listen(port, "0.0.0.0", () => {
  log(`Test server running on port ${port}`);
});

server.on("error", (error: any) => {
  log(`Server error: ${error.message}`);
  process.exit(1);
});