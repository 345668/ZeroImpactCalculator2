import { pgTable, text, serial, numeric, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  // Customer Information
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  address: text("address").notNull(),

  // Energy Consultant Information
  consultantName: text("consultant_name"),
  consultantCompany: text("consultant_company"),
  consultantId: text("consultant_id"),
  consultantBafaNumber: text("consultant_bafa_number"),

  // Building and Energy Information
  buildingOwnership: text("building_ownership").notNull(),
  buildingSize: numeric("building_size").notNull(),
  heatingSystem: text("heating_system").notNull(),
  currentConsumption: numeric("current_consumption").notNull(),
  projectedConsumption: numeric("projected_consumption").notNull(),

  // Calculation Results
  co2Savings: numeric("co2_savings").notNull(),
  carbonCredits: numeric("carbon_credits").notNull(),
  financialValue: numeric("financial_value").notNull(),

  // Additional Fields
  email: text("email").notNull(),
  acceptedTerms: text("accepted_terms").notNull(),
  gdprConsent: text("gdpr_consent").notNull(),
  fileUrl: text("file_url"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// New table for detailed reports
export const detailedReports = pgTable("detailed_reports", {
  id: serial("id").primaryKey(),
  submissionId: numeric("submission_id").notNull(),

  // Building Details
  buildingType: text("building_type"),
  constructionYear: numeric("construction_year"),
  totalFloorArea: numeric("total_floor_area"),

  // Energy Analysis
  currentEnergyClass: text("current_energy_class"),
  targetEnergyClass: text("target_energy_class"),
  annualHeatingDemand: numeric("annual_heating_demand"),
  primaryEnergyDemand: numeric("primary_energy_demand"),

  // Renovation Measures
  proposedMeasures: json("proposed_measures"),
  expectedSavings: json("expected_savings"),
  implementationTimeline: json("implementation_timeline"),

  // Cost Analysis
  estimatedCosts: numeric("estimated_costs"),
  potentialSubsidies: numeric("potential_subsidies"),
  returnOnInvestment: numeric("return_on_investment"),

  // Environmental Impact
  lifetimeCO2Reduction: numeric("lifetime_co2_reduction"),
  renewableEnergyPotential: json("renewable_energy_potential"),

  // Report Metadata
  reportDate: timestamp("report_date").defaultNow(),
  reportLanguage: text("report_language"),
  aiAnalysisSummary: text("ai_analysis_summary"),

  // Raw Data
  rawExtractedData: json("raw_extracted_data"),
});

// Keep existing schemas and add new one for detailed reports
export const insertSubmissionSchema = createInsertSchema(submissions).extend({
  buildingSize: z.coerce.number().min(1, "Building size must be greater than 0"),
  currentConsumption: z.coerce.number().min(0, "Current consumption must be non-negative"),
  projectedConsumption: z.coerce.number().min(0, "Projected consumption must be non-negative"),
  email: z.string().email("Please enter a valid email address"),
  acceptedTerms: z.boolean({
    required_error: "You must accept the terms and conditions",
    invalid_type_error: "Accepted terms must be a boolean"
  }).refine((val) => val === true, {
    message: "You must accept the terms and conditions"
  }),
  gdprConsent: z.boolean({
    required_error: "You must consent to data processing under GDPR",
    invalid_type_error: "GDPR consent must be a boolean"
  }).refine((val) => val === true, {
    message: "You must consent to data processing under GDPR"
  }),
  consultantName: z.string().optional(),
  consultantCompany: z.string().optional(),
  consultantId: z.string().optional(),
  consultantBafaNumber: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  fileUrl: z.string().optional()
}).omit({ 
  id: true, 
  submittedAt: true,
  co2Savings: true,
  carbonCredits: true,
  financialValue: true 
});

export const insertDetailedReportSchema = createInsertSchema(detailedReports).omit({
  id: true,
  reportDate: true
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;
export type DetailedReport = typeof detailedReports.$inferSelect;
export type InsertDetailedReport = z.infer<typeof insertDetailedReportSchema>;