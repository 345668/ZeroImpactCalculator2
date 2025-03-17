import { pgTable, text, serial, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  energyConsultantName: text("energy_consultant_name"),
  energyConsultantCompany: text("energy_consultant_company"),
  energyConsultantId: text("energy_consultant_id"),
  energyConsultantBafaNumber: text("energy_consultant_bafa_number"),
  buildingOwnership: text("building_ownership").notNull(),
  buildingSize: numeric("building_size").notNull(),
  heatingSystem: text("heating_system").notNull(),
  currentEnergySource: text("current_energy_source").notNull(),
  currentConsumption: numeric("current_consumption").notNull(),
  projectedConsumption: numeric("projected_consumption").notNull(),
  co2Savings: numeric("co2_savings"),
  carbonCredits: numeric("carbon_credits"),
  financialValue: numeric("financial_value"),
  calculationDetails: text("calculation_details"), // Stored as JSON string
  acceptedTerms: text("accepted_terms").notNull(),
  gdprConsent: text("gdpr_consent").notNull(),
  fileUrl: text("file_url"),
  emailSent: text("email_sent").notNull().default("no"),
  emailSentAt: timestamp("email_sent_at"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubmissionSchema = createInsertSchema(submissions).extend({
  buildingSize: z.coerce.number().min(1, "Building size must be greater than 0"),
  currentConsumption: z.coerce.number().min(0, "Current consumption must be non-negative"),
  projectedConsumption: z.coerce.number().min(0, "Projected consumption must be non-negative"),
  currentEnergySource: z.enum(["gas", "oil", "pellet"]).default("gas"),
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
  emailSent: true,
  emailSentAt: true,
  co2Savings: true,
  carbonCredits: true,
  financialValue: true,
  calculationDetails: true
});

export const insertUserSchema = createInsertSchema(users)
  .extend({
    email: z.string().email("Invalid email format"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .omit({
    id: true,
    passwordHash: true,
    createdAt: true,
    updatedAt: true,
  });

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;