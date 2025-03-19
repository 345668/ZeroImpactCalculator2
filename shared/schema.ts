import { pgTable, text, serial, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define users table first to avoid circular dependency
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  calculationDetails: text("calculation_details"),
  acceptedTerms: text("accepted_terms").notNull(),
  gdprConsent: text("gdpr_consent").notNull(),
  fileUrl: text("file_url"),
  emailSent: text("email_sent").notNull().default("no"),
  emailSentAt: timestamp("email_sent_at"),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  submittedAtIdx: index("submitted_at_idx").on(table.submittedAt),
  consultantIdx: index("consultant_idx").on(
    table.energyConsultantId,
    table.energyConsultantBafaNumber
  ),
  emailSentIdx: index("email_sent_idx").on(table.emailSent)
}));

// Define calculation result schema
export const calculationResultSchema = z.object({
  co2Savings: z.number(),
  carbonCredits: z.number(),
  financialValue: z.number(),
  tenYearProjection: z.object({
    co2Savings: z.number(),
    carbonCredits: z.number(),
    financialValue: z.number()
  })
});

// Define submission schema after tables
export const insertSubmissionSchema = createInsertSchema(submissions).extend({
  buildingSize: z.coerce.number().min(1, "Building size must be greater than 0"),
  currentConsumption: z.coerce.number().min(0, "Current consumption must be non-negative"),
  projectedConsumption: z.coerce.number().min(0, "Projected consumption must be non-negative"),
  currentEnergySource: z.enum([
    "natural gas",
    "heating oil",
    "liquefied petroleum gas",
    "district heating",
    "electricity mix",
    "heat pump (electricity mix)"
  ]).default("natural gas"),
  email: z.string().email("Please enter a valid email address"),
  acceptedTerms: z.boolean().or(z.string()).transform(val => 
    String(val === true || val === "true")
  ),
  gdprConsent: z.boolean().or(z.string()).transform(val => 
    String(val === true || val === "true")
  ),
  // Optional calculation results
  co2Savings: z.number().optional(),
  carbonCredits: z.number().optional(),
  financialValue: z.number().optional(),
  tenYearProjection: z.object({
    co2Savings: z.number(),
    carbonCredits: z.number(),
    financialValue: z.number()
  }).optional()
}).omit({
  id: true,
  submittedAt: true,
  emailSent: true,
  emailSentAt: true
});

// Export types
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;
export type CalculationResult = z.infer<typeof calculationResultSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Define user schema after users table
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