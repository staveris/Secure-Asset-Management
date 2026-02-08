import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", [
  "PLATFORM_ADMIN",
  "TENANT_ADMIN",
  "TENANT_MANAGER",
  "TENANT_USER",
  "READONLY_AUDITOR",
]);

export const implementationStatusEnum = pgEnum("implementation_status", [
  "NOT_STARTED",
  "IN_PROGRESS",
  "IMPLEMENTED",
  "VERIFIED",
]);

export const evidenceConfidenceEnum = pgEnum("evidence_confidence", [
  "NONE",
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const incidentSeverityEnum = pgEnum("incident_severity", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const incidentStatusEnum = pgEnum("incident_status", [
  "DETECTED",
  "TRIAGED",
  "CONTAINED",
  "ERADICATED",
  "RECOVERED",
  "CLOSED",
]);

export const assessmentStatusEnum = pgEnum("assessment_status", [
  "DRAFT",
  "IN_PROGRESS",
  "COMPLETED",
  "ARCHIVED",
]);

export const riskTreatmentEnum = pgEnum("risk_treatment", [
  "ACCEPT",
  "MITIGATE",
  "TRANSFER",
  "AVOID",
]);

export const riskStatusEnum = pgEnum("risk_status", [
  "IDENTIFIED",
  "ANALYZING",
  "TREATING",
  "MONITORING",
  "CLOSED",
]);

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sector: text("sector").notNull().default("general"),
  entityType: text("entity_type").notNull().default("essential"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default("TENANT_USER"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const requirements = pgTable("requirements", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  nis2Article: text("nis2_article").notNull(),
  nis2Paragraph: text("nis2_paragraph"),
  greekRef: text("greek_ref"),
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const controlObjectives = pgTable("control_objectives", {
  id: serial("id").primaryKey(),
  requirementId: integer("requirement_id")
    .references(() => requirements.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  guidance: text("guidance"),
  evidenceTypes: jsonb("evidence_types").$type<string[]>().default([]),
});

export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  name: text("name").notNull(),
  scope: text("scope"),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  status: assessmentStatusEnum("status").notNull().default("DRAFT"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assessmentResponses = pgTable("assessment_responses", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id")
    .references(() => assessments.id)
    .notNull(),
  controlObjectiveId: integer("control_objective_id")
    .references(() => controlObjectives.id)
    .notNull(),
  implementationStatus: implementationStatusEnum("implementation_status")
    .notNull()
    .default("NOT_STARTED"),
  maturityLevel: integer("maturity_level").notNull().default(0),
  evidenceConfidence: evidenceConfidenceEnum("evidence_confidence")
    .notNull()
    .default("NONE"),
  notes: text("notes"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  controlObjectiveId: integer("control_objective_id").references(
    () => controlObjectives.id,
  ),
  title: text("title").notNull(),
  description: text("description"),
  ownerUserId: integer("owner_user_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  status: taskStatusEnum("status").notNull().default("TODO"),
  priority: taskPriorityEnum("priority").notNull().default("MEDIUM"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const evidenceItems = pgTable("evidence_items", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  relatedType: text("related_type").notNull(),
  relatedId: integer("related_id").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type"),
  size: integer("size"),
  uploadedBy: integer("uploaded_by")
    .references(() => users.id)
    .notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const incidentCases = pgTable("incident_cases", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  severity: incidentSeverityEnum("severity").notNull().default("MEDIUM"),
  isSignificant: boolean("is_significant").notNull().default(false),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  status: incidentStatusEnum("status").notNull().default("DETECTED"),
  earlyWarningDueAt: timestamp("early_warning_due_at"),
  notificationDueAt: timestamp("notification_due_at"),
  finalReportDueAt: timestamp("final_report_due_at"),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  name: text("name").notNull(),
  criticality: text("criticality").notNull().default("low"),
  services: text("services"),
  lastAssessmentAt: timestamp("last_assessment_at"),
  notes: text("notes"),
});

export const riskItems = pgTable("risk_items", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  title: text("title").notNull(),
  likelihood: integer("likelihood").notNull().default(3),
  impact: integer("impact").notNull().default(3),
  treatment: riskTreatmentEnum("treatment").notNull().default("MITIGATE"),
  ownerUserId: integer("owner_user_id").references(() => users.id),
  status: riskStatusEnum("status").notNull().default("IDENTIFIED"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  actorUserId: integer("actor_user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});
export const insertRequirementSchema = createInsertSchema(requirements).omit({
  id: true,
});
export const insertControlObjectiveSchema = createInsertSchema(
  controlObjectives,
).omit({ id: true });
export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
  createdAt: true,
});
export const insertAssessmentResponseSchema = createInsertSchema(
  assessmentResponses,
).omit({ id: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEvidenceItemSchema = createInsertSchema(evidenceItems).omit({
  id: true,
  uploadedAt: true,
});
export const insertIncidentCaseSchema = createInsertSchema(incidentCases).omit({
  id: true,
  updatedAt: true,
});
export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
});
export const insertRiskItemSchema = createInsertSchema(riskItems).omit({
  id: true,
  updatedAt: true,
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Requirement = typeof requirements.$inferSelect;
export type InsertRequirement = z.infer<typeof insertRequirementSchema>;
export type ControlObjective = typeof controlObjectives.$inferSelect;
export type InsertControlObjective = z.infer<
  typeof insertControlObjectiveSchema
>;
export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type AssessmentResponse = typeof assessmentResponses.$inferSelect;
export type InsertAssessmentResponse = z.infer<
  typeof insertAssessmentResponseSchema
>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type EvidenceItem = typeof evidenceItems.$inferSelect;
export type InsertEvidenceItem = z.infer<typeof insertEvidenceItemSchema>;
export type IncidentCase = typeof incidentCases.$inferSelect;
export type InsertIncidentCase = z.infer<typeof insertIncidentCaseSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type RiskItem = typeof riskItems.$inferSelect;
export type InsertRiskItem = z.infer<typeof insertRiskItemSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  companyName: z.string().min(2),
  sector: z.string().min(1),
  entityType: z.string().min(1),
});
