import { pgTable, text, serial, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  // Building Information (Step 1)
  buildingOwnership: text("building_ownership").notNull(),
  buildingSize: numeric("building_size").notNull(),

  // Energy Information (Steps 2-3)
  currentConsumption: numeric("current_consumption").notNull(),
  projectedConsumption: numeric("projected_consumption").notNull(),

  // Heating System (Step 4)
  heatingSystem: text("heating_system").notNull(),

  // Calculation Results (Step 5)
  co2Savings: numeric("co2_savings").notNull(),
  carbonCredits: numeric("carbon_credits").notNull(),
  financialValue: numeric("financial_value").notNull(),

  // Contact Information (Step 6)
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  acceptedTerms: text("accepted_terms").notNull(),
  acceptedGDPR: text("accepted_gdpr").notNull(),

  // Energy Consultant Details (Step 7)
  consultantName: text("consultant_name").notNull(),
  consultantCompany: text("consultant_company").notNull(),
  consultantId: text("consultant_id").notNull(),
  consultantBafaNumber: text("consultant_bafa_number").notNull(),

  // Additional Fields
  fileUrl: text("file_url"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Step 1-4: Building and Energy Information Schema
export const calculationSchema = z.object({
  buildingSize: z.coerce.number().min(1, "Building size must be greater than 0"),
  currentConsumption: z.coerce.number().min(0, "Current consumption must be non-negative"),
  projectedConsumption: z.coerce.number().min(0, "Projected consumption must be non-negative"),
  buildingOwnership: z.string(),
  heatingSystem: z.string(),
});

// Step 6: Contact Information Schema
export const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  address: z.string().min(1, "Address is required"),
  acceptedTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions"
  }),
  acceptedGDPR: z.boolean().refine((val) => val === true, {
    message: "You must accept the GDPR privacy policy"
  })
});

// Step 7: Consultant Information Schema
export const consultantSchema = z.object({
  consultantName: z.string().min(1, "Consultant name is required"),
  consultantCompany: z.string().min(1, "Consultant company is required"),
  consultantId: z.string().min(1, "Consultant ID is required"),
  consultantBafaNumber: z.string().min(1, "BAFA number is required")
});

// Full submission schema combining all steps
export const insertSubmissionSchema = createInsertSchema(submissions)
  .merge(calculationSchema)
  .merge(contactSchema)
  .merge(consultantSchema)
  .omit({ 
    id: true, 
    submittedAt: true,
    co2Savings: true,
    carbonCredits: true,
    financialValue: true 
  });

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;
export type CalculationInput = z.infer<typeof calculationSchema>;