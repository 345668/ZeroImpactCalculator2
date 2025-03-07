import { pgTable, text, serial, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  // Customer Information
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  address: text("address").notNull(),

  // Energy Consultant Information
  consultantName: text("consultant_name").notNull(),
  consultantCompany: text("consultant_company").notNull(),
  consultantId: text("consultant_id").notNull(),
  consultantBafaNumber: text("consultant_bafa_number").notNull(),

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
  acceptedGDPR: text("accepted_gdpr").notNull(),
  fileUrl: text("file_url"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Schema for calculation only
export const calculationSchema = z.object({
  buildingSize: z.coerce.number().min(1, "Building size must be greater than 0"),
  currentConsumption: z.coerce.number().min(0, "Current consumption must be non-negative"),
  projectedConsumption: z.coerce.number().min(0, "Projected consumption must be non-negative"),
  buildingOwnership: z.string(),
  heatingSystem: z.string(),
});

// Full submission schema
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
  acceptedGDPR: z.boolean({
    required_error: "You must accept the GDPR privacy policy",
    invalid_type_error: "GDPR acceptance must be a boolean"
  }).refine((val) => val === true, {
    message: "You must accept the GDPR privacy policy"
  }),
  consultantId: z.string().min(1, "Consultant ID is required"),
  consultantBafaNumber: z.string().min(1, "BAFA number is required"),
  address: z.string().min(1, "Address is required"),
  fileUrl: z.string().optional()
}).omit({ 
  id: true, 
  submittedAt: true,
  co2Savings: true,
  carbonCredits: true,
  financialValue: true 
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;
export type CalculationInput = z.infer<typeof calculationSchema>;