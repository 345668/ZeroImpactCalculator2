import { pgTable, text, serial, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const submissions = pgTable("submissions", {
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
  co2Savings: numeric("co2_savings").notNull(),
  carbonCredits: numeric("carbon_credits").notNull(),
  financialValue: numeric("financial_value").notNull(),

  // Additional Fields
  acceptedTerms: text("accepted_terms").notNull(),
  gdprConsent: text("gdpr_consent").notNull(),
  fileUrl: text("file_url"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

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
  // Optional energy consultant fields
  energyConsultantName: z.string().optional(),
  energyConsultantCompany: z.string().optional(),
  energyConsultantId: z.string().optional(),
  energyConsultantBafaNumber: z.string().optional(),
  // Required address
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