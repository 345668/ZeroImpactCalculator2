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
  co2Savings: numeric("co2_savings"),
  carbonCredits: numeric("carbon_credits"),
  financialValue: numeric("financial_value"),

  // Additional Fields
  acceptedTerms: text("accepted_terms").notNull(),
  gdprConsent: text("gdpr_consent").notNull(),
  fileUrl: text("file_url"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Create insert schema with proper validations
export const insertSubmissionSchema = createInsertSchema(submissions).extend({
  buildingSize: z.coerce.number().min(1, "Building size must be greater than 0"),
  currentConsumption: z.coerce.number().min(0, "Current consumption must be non-negative"),
  projectedConsumption: z.coerce.number().min(0, "Projected consumption must be non-negative"),
  email: z.string().email("Please enter a valid email address"),
  acceptedTerms: z.union([z.boolean(), z.string()]).transform(val => 
    typeof val === 'boolean' ? String(val) : val
  ),
  gdprConsent: z.union([z.boolean(), z.string()]).transform(val => 
    typeof val === 'boolean' ? String(val) : val
  )
}).omit({ 
  id: true,
  submittedAt: true,
  co2Savings: true,
  carbonCredits: true,
  financialValue: true 
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;