import { pgTable, text, serial, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  buildingOwnership: text("building_ownership").notNull(),
  buildingSize: numeric("building_size").notNull(),
  heatingSystem: text("heating_system").notNull(),
  currentConsumption: numeric("current_consumption").notNull(),
  projectedConsumption: numeric("projected_consumption").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  acceptedTerms: text("accepted_terms").notNull(),
  co2Savings: numeric("co2_savings").notNull(),
  carbonCredits: numeric("carbon_credits").notNull(),
  financialValue: numeric("financial_value").notNull(),
  fileUrl: text("file_url"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const insertSubmissionSchema = createInsertSchema(submissions).extend({
  buildingSize: z.coerce.number().min(1, "Building size must be greater than 0"),
  currentConsumption: z.coerce.number().min(0, "Current consumption must be non-negative"),
  projectedConsumption: z.coerce.number().min(0, "Projected consumption must be non-negative"),
  email: z.string().email("Please enter a valid email address"),
  acceptedTerms: z.literal("true", {
    errorMap: () => ({ message: "You must accept the terms and conditions" })
  }),
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