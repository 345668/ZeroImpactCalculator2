import { pgTable, text, serial, numeric, timestamp, index, boolean } from "drizzle-orm/pg-core";
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
  streetName: text("street_name").notNull().default(''),
  postalCode: text("postal_code").notNull().default(''),
  country: text("country").notNull().default(''),
  region: text("region").notNull().default(''),
  buildingOwnership: text("building_ownership").notNull(),
  buildingSize: numeric("building_size").notNull(),
  heatingSystem: text("heating_system").notNull(),
  currentEnergySource: text("current_energy_source").notNull().default('natural gas'),
  currentConsumption: numeric("current_consumption").notNull(),
  projectedConsumption: numeric("projected_consumption").notNull(),
  co2Savings: numeric("co2_savings"),
  carbonCredits: numeric("carbon_credits"),
  financialValue: numeric("financial_value"),
  calculationDetails: text("calculation_details"),
  acceptedTerms: text("accepted_terms").notNull(),
  gdprConsent: text("gdpr_consent").notNull(),
  energyConsultantName: text("energy_consultant_name"),
  energyConsultantCompany: text("energy_consultant_company"),
  energyConsultantId: text("energy_consultant_id"),
  energyConsultantBafaNumber: text("energy_consultant_bafa_number"),
  // Enhanced file storage fields
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: numeric("file_size"),
  fileType: text("file_type"),
  fileUploadedAt: timestamp("file_uploaded_at"),
  fileMetadata: text("file_metadata"), // Store JSON with additional metadata
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
  emailSentIdx: index("email_sent_idx").on(table.emailSent),
  fileUrlIdx: index("file_url_idx").on(table.fileUrl)
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
    "heating oil",
    "natural gas",
    "liquefied petroleum gas",
    "district heating",
    "electricity mix",
    "coal heating",
    "wood pellets",
    "firewood",
    "biogas",
    "heat pump (electricity mix)",
    "heat pump (green electricity)",
    "green electricity",
    "solar thermal",
    "pv self-consumption"
  ]).default("natural gas"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  streetName: z.string().min(1, "Street name is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  region: z.string().optional().default(""),
  acceptedTerms: z.boolean().or(z.enum(["true", "false"]).transform(val => val === "true")).refine(val => val === true, {
    message: "You must accept the terms and conditions"
  }),
  gdprConsent: z.boolean().or(z.enum(["true", "false"]).transform(val => val === "true")).refine(val => val === true, {
    message: "You must accept the GDPR consent"
  }),
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
// Email Templates table
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  language: text("language").default("en"),
  variables: text("variables"), // JSON string of available variables
  templateType: text("template_type").default("standard"), // standard, dmarc-report, security-alert
  sendgridTemplateId: text("sendgrid_template_id"), // For SendGrid dynamic templates
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: serial("created_by").references(() => users.id),
});

// DMARC Reports table for storing and analyzing DMARC reports
export const dmarcReports = pgTable("dmarc_reports", {
  id: serial("id").primaryKey(),
  reportId: text("report_id").notNull().unique(),
  domain: text("domain").notNull(),
  sourceIp: text("source_ip").notNull(),
  sourceOrg: text("source_org"),
  reportingOrg: text("reporting_org").notNull(),
  count: numeric("count").notNull(),
  disposition: text("disposition").notNull(), // none, quarantine, reject
  dkimResult: text("dkim_result"), // pass, fail, neutral
  spfResult: text("spf_result"), // pass, fail, neutral
  alignmentDkim: text("alignment_dkim"), // pass, fail
  alignmentSpf: text("alignment_spf"), // pass, fail
  policyEvaluated: text("policy_evaluated"), // pass, fail
  reportDate: timestamp("report_date").notNull(),
  receivedDate: timestamp("received_date").defaultNow(),
  rawReport: text("raw_report"), // Store the original XML report
  processed: boolean("processed").default(false),
  emailNotificationSent: boolean("email_notification_sent").default(false),
}, (table) => ({
  domainIdx: index("domain_idx").on(table.domain),
  reportDateIdx: index("report_date_idx").on(table.reportDate),
  sourceIpIdx: index("source_ip_idx").on(table.sourceIp),
}));

// Email Template schema
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates)
  .extend({
    body: z.string().min(10, "Template body must be at least 10 characters"),
    name: z.string().min(3, "Template name must be at least 3 characters"),
    subject: z.string().min(3, "Subject must be at least 3 characters"),
    templateType: z.enum(["standard", "dmarc-report", "security-alert"]).default("standard"),
    sendgridTemplateId: z.string().optional(),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

// DMARC report schema
export const insertDmarcReportSchema = createInsertSchema(dmarcReports)
  .extend({
    reportId: z.string().min(5, "Report ID is required"),
    domain: z.string().min(3, "Domain is required"),
    sourceIp: z.string().min(7, "Source IP is required"),
    reportingOrg: z.string().min(2, "Reporting organization is required"),
    count: z.coerce.number().min(0, "Count must be non-negative"),
    disposition: z.enum(["none", "quarantine", "reject"]),
    reportDate: z.coerce.date(),
  })
  .omit({
    id: true,
    receivedDate: true,
  });

export type DmarcReport = typeof dmarcReports.$inferSelect;
export type InsertDmarcReport = z.infer<typeof insertDmarcReportSchema>;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
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