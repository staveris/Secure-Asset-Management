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
  date,
  real,
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

export const controlStatusEnum = pgEnum("control_status", [
  "NOT_IMPLEMENTED",
  "PLANNED",
  "IN_PROGRESS",
  "IMPLEMENTED",
  "VERIFIED",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "EARLY_WARNING",
  "NOTIFICATION",
  "FINAL_REPORT",
]);

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sectorGroup: text("sector_group").default("ANNEX_I"),
  sector: text("sector").notNull().default("general"),
  subsector: text("subsector"),
  entityType: text("entity_type").notNull().default("essential"),
  country: text("country"),
  applicabilityProfile: jsonb("applicability_profile").$type<Record<string, boolean>>(),
  status: text("status").notNull().default("active"),
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
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inviteTokens = pgTable("invite_tokens", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  email: text("email").notNull(),
  role: userRoleEnum("role").notNull().default("TENANT_USER"),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
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

export const sectorPacks = pgTable("sector_packs", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  appliesTo: jsonb("applies_to").$type<{ sectorGroups?: string[]; sectors?: string[]; subsectors?: string[] }>(),
  isActive: boolean("is_active").notNull().default(true),
});

export const controlObjectives = pgTable("control_objectives", {
  id: serial("id").primaryKey(),
  requirementId: integer("requirement_id")
    .references(() => requirements.id)
    .notNull(),
  sectorPackId: integer("sector_pack_id").references(() => sectorPacks.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  guidance: text("guidance"),
  domain: text("domain").default("Governance"),
  weight: integer("weight").notNull().default(1),
  tags: jsonb("tags").$type<string[]>().default([]),
  evidenceTypes: jsonb("evidence_types").$type<string[]>().default([]),
});

export const applicabilityRules = pgTable("applicability_rules", {
  id: serial("id").primaryKey(),
  controlObjectiveId: integer("control_objective_id").references(() => controlObjectives.id).notNull(),
  rule: jsonb("rule").$type<{ sectors?: string[]; subsectors?: string[]; entityTypes?: string[]; flags?: string[] }>().notNull(),
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
  approverUserId: integer("approver_user_id").references(() => users.id),
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
  storagePath: text("storage_path"),
  sha256: text("sha256"),
  lockedAt: timestamp("locked_at"),
  lockedBy: integer("locked_by").references(() => users.id),
  lockReason: text("lock_reason"),
  uploadedBy: integer("uploaded_by")
    .references(() => users.id)
    .notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const evidenceAccessLogs = pgTable("evidence_access_logs", {
  id: serial("id").primaryKey(),
  evidenceId: integer("evidence_id").references(() => evidenceItems.id).notNull(),
  actorUserId: integer("actor_user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  ip: text("ip"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const evidenceUnlockRequests = pgTable("evidence_unlock_requests", {
  id: serial("id").primaryKey(),
  evidenceId: integer("evidence_id").references(() => evidenceItems.id).notNull(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  requestedBy: integer("requested_by").references(() => users.id).notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  decidedAt: timestamp("decided_at"),
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
  description: text("description"),
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
  ip: text("ip"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const controls = pgTable("controls", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  controlObjectiveId: integer("control_objective_id").references(() => controlObjectives.id).notNull(),
  implementationOwnerUserId: integer("implementation_owner_user_id").references(() => users.id),
  status: controlStatusEnum("status").notNull().default("NOT_IMPLEMENTED"),
  maturityLevel: integer("maturity_level").notNull().default(0),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const incidentNotifications = pgTable("incident_notifications", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").references(() => incidentCases.id).notNull(),
  type: notificationTypeEnum("type").notNull(),
  preparedAt: timestamp("prepared_at"),
  sentAt: timestamp("sent_at"),
  channel: text("channel"),
  content: jsonb("content").$type<{ subject?: string; body?: string; recipients?: string[] }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tenantDailySnapshots = pgTable("tenant_daily_snapshots", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  date: text("snapshot_date").notNull(),
  compliancePct: real("compliance_pct").notNull().default(0),
  verifiedPct: real("verified_pct").notNull().default(0),
  maturityAvg: real("maturity_avg").notNull().default(0),
  overdueTasks: integer("overdue_tasks").notNull().default(0),
  evidenceCoverage: real("evidence_coverage").notNull().default(0),
  incidentsOpen: integer("incidents_open").notNull().default(0),
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
export const insertInviteTokenSchema = createInsertSchema(inviteTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});
export const insertRequirementSchema = createInsertSchema(requirements).omit({
  id: true,
});
export const insertSectorPackSchema = createInsertSchema(sectorPacks).omit({
  id: true,
});
export const insertControlObjectiveSchema = createInsertSchema(
  controlObjectives,
).omit({ id: true });
export const insertApplicabilityRuleSchema = createInsertSchema(applicabilityRules).omit({
  id: true,
});
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
  lockedAt: true,
  lockedBy: true,
  lockReason: true,
});
export const insertEvidenceAccessLogSchema = createInsertSchema(evidenceAccessLogs).omit({
  id: true,
  createdAt: true,
});
export const insertEvidenceUnlockRequestSchema = createInsertSchema(evidenceUnlockRequests).omit({
  id: true,
  createdAt: true,
  decidedAt: true,
  approvedBy: true,
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
export const insertControlSchema = createInsertSchema(controls).omit({
  id: true,
  updatedAt: true,
});
export const insertIncidentNotificationSchema = createInsertSchema(incidentNotifications).omit({
  id: true,
  createdAt: true,
});
export const insertTenantDailySnapshotSchema = createInsertSchema(tenantDailySnapshots).omit({
  id: true,
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InviteToken = typeof inviteTokens.$inferSelect;
export type InsertInviteToken = z.infer<typeof insertInviteTokenSchema>;
export type Requirement = typeof requirements.$inferSelect;
export type InsertRequirement = z.infer<typeof insertRequirementSchema>;
export type SectorPack = typeof sectorPacks.$inferSelect;
export type InsertSectorPack = z.infer<typeof insertSectorPackSchema>;
export type ControlObjective = typeof controlObjectives.$inferSelect;
export type InsertControlObjective = z.infer<
  typeof insertControlObjectiveSchema
>;
export type ApplicabilityRule = typeof applicabilityRules.$inferSelect;
export type InsertApplicabilityRule = z.infer<typeof insertApplicabilityRuleSchema>;
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
export type EvidenceAccessLog = typeof evidenceAccessLogs.$inferSelect;
export type InsertEvidenceAccessLog = z.infer<typeof insertEvidenceAccessLogSchema>;
export type EvidenceUnlockRequest = typeof evidenceUnlockRequests.$inferSelect;
export type InsertEvidenceUnlockRequest = z.infer<typeof insertEvidenceUnlockRequestSchema>;
export type IncidentCase = typeof incidentCases.$inferSelect;
export type InsertIncidentCase = z.infer<typeof insertIncidentCaseSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type RiskItem = typeof riskItems.$inferSelect;
export type InsertRiskItem = z.infer<typeof insertRiskItemSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Control = typeof controls.$inferSelect;
export type InsertControl = z.infer<typeof insertControlSchema>;
export type IncidentNotification = typeof incidentNotifications.$inferSelect;
export type InsertIncidentNotification = z.infer<typeof insertIncidentNotificationSchema>;
export type TenantDailySnapshot = typeof tenantDailySnapshots.$inferSelect;
export type InsertTenantDailySnapshot = z.infer<typeof insertTenantDailySnapshotSchema>;

export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({ id: true, updatedAt: true });
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  fullName: z.string().min(2),
  companyName: z.string().min(2),
});
