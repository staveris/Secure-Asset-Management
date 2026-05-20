import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  bigint,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  serial,
  date,
  real,
  uniqueIndex,
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
  storageQuotaBytes: bigint("storage_quota_bytes", { mode: "number" }).notNull().default(1073741824),
  storageUsedBytes: bigint("storage_used_bytes", { mode: "number" }).notNull().default(0),
  maxUsers: integer("max_users").notNull().default(10),
  maxFileSizeBytes: integer("max_file_size_bytes").notNull().default(26214400),
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
  fullAccessEnabled: boolean("full_access_enabled").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
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
  assessmentId: integer("assessment_id").references(() => assessments.id),
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

export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id")
    .references(() => tasks.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({
  id: true,
  createdAt: true,
});

export const evidenceItems = pgTable("evidence_items", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  assessmentId: integer("assessment_id").references(() => assessments.id),
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

export const supplierTypeEnum = pgEnum("supplier_type", [
  "ICT", "CLOUD", "MSP", "MSSP", "SOFTWARE", "HARDWARE", "OUTSOURCER", "TELCO", "CONSULTING", "OTHER",
]);

export const supplierContractStatusEnum = pgEnum("supplier_contract_status", [
  "NONE", "DRAFT", "ACTIVE", "EXPIRED", "TERMINATED",
]);

export const supplierAccessLevelEnum = pgEnum("supplier_access_level", [
  "NONE", "NETWORK", "VPN", "PRIVILEGED", "APPLICATION", "DATA",
]);

export const supplierDataClassificationEnum = pgEnum("supplier_data_classification", [
  "PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED",
]);

export const supplierAssuranceLevelEnum = pgEnum("supplier_assurance_level", [
  "NONE", "BASIC", "STANDARD", "ADVANCED",
]);

export const supplierStatusEnum = pgEnum("supplier_status", [
  "ACTIVE", "INACTIVE", "ONBOARDING",
]);

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
  supplierType: supplierTypeEnum("supplier_type"),
  legalName: text("legal_name"),
  taxIdOrRegNo: text("tax_id_or_reg_no"),
  country: text("country"),
  website: text("website"),
  primaryContactName: text("primary_contact_name"),
  primaryContactEmail: text("primary_contact_email"),
  securityContactEmail: text("security_contact_email"),
  incidentHotline: text("incident_hotline"),
  contractStatus: supplierContractStatusEnum("contract_status").default("NONE"),
  contractStartDate: timestamp("contract_start_date"),
  contractEndDate: timestamp("contract_end_date"),
  renewalDate: timestamp("renewal_date"),
  accessLevel: supplierAccessLevelEnum("access_level").default("NONE"),
  dataTypes: jsonb("data_types").$type<string[]>(),
  dataClassification: supplierDataClassificationEnum("data_classification").default("PUBLIC"),
  subprocessorsAllowed: boolean("subprocessors_allowed").default(false),
  lastReviewAt: timestamp("last_review_at"),
  nextReviewDueAt: timestamp("next_review_due_at"),
  inherentRiskScore: integer("inherent_risk_score").default(0),
  residualRiskScore: integer("residual_risk_score").default(0),
  assuranceLevel: supplierAssuranceLevelEnum("assurance_level").default("NONE"),
  status: supplierStatusEnum("supplier_status").default("ACTIVE"),
});

export const supplierDependencyTypeEnum = pgEnum("supplier_dependency_type", [
  "SERVICE", "SYSTEM", "APPLICATION", "DATASET", "PROCESS", "LOCATION",
]);

export const supplierCriticalityImpactEnum = pgEnum("supplier_criticality_impact", [
  "LOW", "MEDIUM", "HIGH", "CRITICAL",
]);

export const supplierServiceDependencies = pgTable("supplier_service_dependencies", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  dependencyType: supplierDependencyTypeEnum("dependency_type").notNull().default("SERVICE"),
  name: text("name").notNull(),
  criticalityImpact: supplierCriticalityImpactEnum("criticality_impact").notNull().default("LOW"),
  description: text("description"),
});

export const supplierQuestionnaireTemplates = pgTable("supplier_questionnaire_templates", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  version: text("version").notNull().default("1.0"),
  appliesTo: jsonb("applies_to").$type<{ supplierTypes?: string[]; accessLevels?: string[]; criticalities?: string[] }>(),
  isActive: boolean("is_active").notNull().default(true),
});

export const supplierQuestionResponseTypeEnum = pgEnum("supplier_question_response_type", [
  "YES_NO", "SCALE", "TEXT", "MULTI",
]);

export const supplierQuestionnaireQuestions = pgTable("supplier_questionnaire_questions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => supplierQuestionnaireTemplates.id, { onDelete: "cascade" }).notNull(),
  section: text("section").notNull(),
  questionText: text("question_text").notNull(),
  responseType: supplierQuestionResponseTypeEnum("response_type").notNull().default("YES_NO"),
  weight: integer("weight").notNull().default(1),
  evidenceRequired: boolean("evidence_required").notNull().default(false),
  evidenceTypes: jsonb("evidence_types").$type<string[]>(),
  nis2Ref: jsonb("nis2_ref").$type<string[]>(),
  cirRef: jsonb("cir_ref").$type<string[]>(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const supplierAssessmentStatusEnum = pgEnum("supplier_assessment_status", [
  "DRAFT", "IN_PROGRESS", "SUBMITTED", "APPROVED",
]);

export const supplierRiskRatingEnum = pgEnum("supplier_risk_rating", [
  "LOW", "MEDIUM", "HIGH", "CRITICAL",
]);

export const supplierAssessments = pgTable("supplier_assessments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  templateId: integer("template_id").references(() => supplierQuestionnaireTemplates.id).notNull(),
  status: supplierAssessmentStatusEnum("supplier_assessment_status").notNull().default("DRAFT"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  score: real("score"),
  riskRating: supplierRiskRatingEnum("risk_rating"),
});

export const supplierAssessmentResponses = pgTable("supplier_assessment_responses", {
  id: serial("id").primaryKey(),
  supplierAssessmentId: integer("supplier_assessment_id").references(() => supplierAssessments.id, { onDelete: "cascade" }).notNull(),
  questionId: integer("question_id").references(() => supplierQuestionnaireQuestions.id).notNull(),
  answer: jsonb("answer"),
  score: real("score"),
  notes: text("notes"),
  evidenceLinkId: integer("evidence_link_id").references(() => evidenceItems.id),
  answeredBy: integer("answered_by").references(() => users.id),
  answeredAt: timestamp("answered_at").defaultNow(),
});

export const supplierRequirementStatusEnum = pgEnum("supplier_requirement_status", [
  "NOT_SET", "IN_CONTRACT", "IMPLEMENTED", "VERIFIED", "EXCEPTION",
]);

export const supplierSecurityRequirements = pgTable("supplier_security_requirements", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  requirementKey: text("requirement_key").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  requiredForTier: text("required_for_tier").notNull().default("HIGH"),
  status: supplierRequirementStatusEnum("supplier_requirement_status").notNull().default("NOT_SET"),
  evidenceLinkId: integer("evidence_link_id").references(() => evidenceItems.id),
  reviewDueAt: timestamp("review_due_at"),
});

export const supplierContractClauseCategory = pgEnum("supplier_contract_clause_category", [
  "INCIDENT", "AUDIT", "ACCESS", "SUBPROCESSOR", "VULN", "BC_DR", "DATA", "SDLC",
]);

export const supplierContractClauseLibrary = pgTable("supplier_contract_clause_library", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  clauseText: text("clause_text").notNull(),
  category: supplierContractClauseCategory("category").notNull(),
  mapping: jsonb("mapping").$type<{ nis2Refs?: string[]; cirRefs?: string[] }>(),
});

export const supplierContractDocStatusEnum = pgEnum("supplier_contract_doc_status", [
  "DRAFT", "ACTIVE", "EXPIRED", "TERMINATED",
]);

export const supplierContracts = pgTable("supplier_contracts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  status: supplierContractDocStatusEnum("contract_doc_status").notNull().default("DRAFT"),
  signedAt: timestamp("signed_at"),
  expiresAt: timestamp("expires_at"),
  fileEvidenceId: integer("file_evidence_id").references(() => evidenceItems.id),
});

export const supplierContractClauseInstances = pgTable("supplier_contract_clause_instances", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").references(() => supplierContracts.id, { onDelete: "cascade" }).notNull(),
  clauseLibraryId: integer("clause_library_id").references(() => supplierContractClauseLibrary.id).notNull(),
  isIncluded: boolean("is_included").notNull().default(false),
  notes: text("notes"),
});

export const supplierExceptionTypeEnum = pgEnum("supplier_exception_type", [
  "REQUIREMENT_WAIVER", "RISK_ACCEPTANCE", "TEMPORARY_COMPENSATING_CONTROL",
]);

export const supplierExceptions = pgTable("supplier_exceptions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  exceptionType: supplierExceptionTypeEnum("exception_type").notNull(),
  reason: text("reason").notNull(),
  compensatingControls: text("compensating_controls"),
  expiryDate: timestamp("expiry_date"),
  requestedBy: integer("requested_by").references(() => users.id).notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  evidenceLinkId: integer("evidence_link_id").references(() => evidenceItems.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supplierIncidentSeverityEnum = pgEnum("supplier_incident_severity", [
  "LOW", "MEDIUM", "HIGH", "CRITICAL",
]);

export const supplierIncidentStatusEnum = pgEnum("supplier_incident_status_enum", [
  "OPEN", "CONTAINED", "RESOLVED", "CLOSED",
]);

export const supplierIncidents = pgTable("supplier_incidents", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  notifiedAt: timestamp("notified_at"),
  affectsServices: jsonb("affects_services").$type<string[]>(),
  severity: supplierIncidentSeverityEnum("severity").notNull().default("MEDIUM"),
  status: supplierIncidentStatusEnum("supplier_incident_status").notNull().default("OPEN"),
  requiresNis2Reporting: boolean("requires_nis2_reporting").default(false),
  linkedPlatformIncidentId: integer("linked_platform_incident_id").references(() => incidentCases.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const riskLibraryEntries = pgTable("risk_library_entries", {
  id: serial("id").primaryKey(),
  libraryCode: text("library_code").notNull(),
  riskId: text("risk_id").notNull(),
  frameworkContext: text("framework_context"),
  category: text("category").notNull(),
  title: text("title").notNull(),
  riskStatement: text("risk_statement"),
  typicalImpact: text("typical_impact"),
  regulatoryMapping: text("regulatory_mapping"),
  affectedAssetsOrServices: text("affected_assets_or_services"),
  defaultLikelihood: text("default_likelihood"),
  defaultImpact: text("default_impact"),
  defaultRiskRating: text("default_risk_rating"),
  defaultTreatmentOption: text("default_treatment_option"),
  treatmentDirection: text("treatment_direction"),
  suggestedControls: jsonb("suggested_controls").$type<string[]>().default([]),
  suggestedEvidence: jsonb("suggested_evidence").$type<string[]>().default([]),
  defaultOwnerRole: text("default_owner_role"),
  reviewFrequency: text("review_frequency"),
  tags: jsonb("tags").$type<string[]>().default([]),
  defaultStatus: text("default_status").notNull().default("Not Assessed"),
  sourceUrl: text("source_url"),
  notes: text("notes"),
  contentHash: text("content_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  uniqLibraryRisk: uniqueIndex("risk_library_entries_lib_risk_uniq").on(t.libraryCode, t.riskId),
}));

export const tenantRiskRegisterItems = pgTable("tenant_risk_register_items", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  libraryCode: text("library_code").notNull(),
  riskId: text("risk_id").notNull(),
  libraryEntryId: integer("library_entry_id").references(() => riskLibraryEntries.id),
  category: text("category").notNull(),
  title: text("title").notNull(),
  riskStatement: text("risk_statement"),
  typicalImpact: text("typical_impact"),
  regulatoryMapping: text("regulatory_mapping"),
  affectedAssetsOrServices: text("affected_assets_or_services"),
  inherentLikelihood: text("inherent_likelihood"),
  inherentImpact: text("inherent_impact"),
  inherentRiskRating: text("inherent_risk_rating"),
  treatmentOption: text("treatment_option"),
  treatmentDirection: text("treatment_direction"),
  suggestedControls: jsonb("suggested_controls").$type<string[]>().default([]),
  suggestedEvidence: jsonb("suggested_evidence").$type<string[]>().default([]),
  ownerUserId: integer("owner_user_id").references(() => users.id),
  status: text("status").notNull().default("Not Assessed"),
  treatmentStatus: text("treatment_status"),
  residualLikelihood: text("residual_likelihood"),
  residualImpact: text("residual_impact"),
  residualRiskRating: text("residual_risk_rating"),
  treatmentPlan: text("treatment_plan"),
  dueDate: timestamp("due_date"),
  evidenceLinks: jsonb("evidence_links").$type<string[]>().default([]),
  acceptanceDecision: text("acceptance_decision"),
  acceptanceApprovedBy: integer("acceptance_approved_by").references(() => users.id),
  lastReviewDate: timestamp("last_review_date"),
  nextReviewDate: timestamp("next_review_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  uniqTenantLibraryRisk: uniqueIndex("tenant_risk_register_tenant_lib_risk_uniq").on(t.tenantId, t.libraryCode, t.riskId),
}));

export const passwordHistory = pgTable("password_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  passwordHash: text("password_hash").notNull(),
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
export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
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

export const insertSupplierServiceDependencySchema = createInsertSchema(supplierServiceDependencies).omit({ id: true });
export type SupplierServiceDependency = typeof supplierServiceDependencies.$inferSelect;
export type InsertSupplierServiceDependency = z.infer<typeof insertSupplierServiceDependencySchema>;

export const insertSupplierQuestionnaireTemplateSchema = createInsertSchema(supplierQuestionnaireTemplates).omit({ id: true });
export type SupplierQuestionnaireTemplate = typeof supplierQuestionnaireTemplates.$inferSelect;
export type InsertSupplierQuestionnaireTemplate = z.infer<typeof insertSupplierQuestionnaireTemplateSchema>;

export const insertSupplierQuestionnaireQuestionSchema = createInsertSchema(supplierQuestionnaireQuestions).omit({ id: true });
export type SupplierQuestionnaireQuestion = typeof supplierQuestionnaireQuestions.$inferSelect;
export type InsertSupplierQuestionnaireQuestion = z.infer<typeof insertSupplierQuestionnaireQuestionSchema>;

export const insertSupplierAssessmentSchema = createInsertSchema(supplierAssessments).omit({ id: true, createdAt: true, submittedAt: true, approvedAt: true });
export type SupplierAssessment = typeof supplierAssessments.$inferSelect;
export type InsertSupplierAssessment = z.infer<typeof insertSupplierAssessmentSchema>;

export const insertSupplierAssessmentResponseSchema = createInsertSchema(supplierAssessmentResponses).omit({ id: true, answeredAt: true });
export type SupplierAssessmentResponse = typeof supplierAssessmentResponses.$inferSelect;
export type InsertSupplierAssessmentResponse = z.infer<typeof insertSupplierAssessmentResponseSchema>;

export const insertSupplierSecurityRequirementSchema = createInsertSchema(supplierSecurityRequirements).omit({ id: true });
export type SupplierSecurityRequirement = typeof supplierSecurityRequirements.$inferSelect;
export type InsertSupplierSecurityRequirement = z.infer<typeof insertSupplierSecurityRequirementSchema>;

export const insertSupplierContractClauseLibrarySchema = createInsertSchema(supplierContractClauseLibrary).omit({ id: true });
export type SupplierContractClauseLibraryItem = typeof supplierContractClauseLibrary.$inferSelect;
export type InsertSupplierContractClauseLibraryItem = z.infer<typeof insertSupplierContractClauseLibrarySchema>;

export const insertSupplierContractSchema = createInsertSchema(supplierContracts).omit({ id: true });
export type SupplierContract = typeof supplierContracts.$inferSelect;
export type InsertSupplierContract = z.infer<typeof insertSupplierContractSchema>;

export const insertSupplierContractClauseInstanceSchema = createInsertSchema(supplierContractClauseInstances).omit({ id: true });
export type SupplierContractClauseInstance = typeof supplierContractClauseInstances.$inferSelect;
export type InsertSupplierContractClauseInstance = z.infer<typeof insertSupplierContractClauseInstanceSchema>;

export const insertSupplierExceptionSchema = createInsertSchema(supplierExceptions).omit({ id: true, createdAt: true, approvedAt: true });
export type SupplierException = typeof supplierExceptions.$inferSelect;
export type InsertSupplierException = z.infer<typeof insertSupplierExceptionSchema>;

export const insertSupplierIncidentSchema = createInsertSchema(supplierIncidents).omit({ id: true, createdAt: true });
export type SupplierIncident = typeof supplierIncidents.$inferSelect;
export type InsertSupplierIncident = z.infer<typeof insertSupplierIncidentSchema>;

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

export const insertPasswordHistorySchema = createInsertSchema(passwordHistory).omit({ id: true, createdAt: true });
export type PasswordHistory = typeof passwordHistory.$inferSelect;
export type InsertPasswordHistory = z.infer<typeof insertPasswordHistorySchema>;

export const atomicImplementationStatusEnum = pgEnum("atomic_implementation_status", [
  "NOT_STARTED",
  "IN_PROGRESS",
  "IMPLEMENTED",
  "VERIFIED",
]);

export const atomicConfidenceEnum = pgEnum("atomic_confidence", [
  "NONE",
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export const featureFlags = pgTable("feature_flags", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  key: text("key").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const legalSources = pgTable("legal_sources", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  version: text("version"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const atomicControls = pgTable("atomic_controls", {
  id: serial("id").primaryKey(),
  controlId: text("control_id").notNull().unique(),
  sourceKey: text("source_key").notNull(),
  legalRef: text("legal_ref").notNull(),
  clausePath: text("clause_path").notNull(),
  shortTitle: text("short_title").notNull(),
  obligationText: text("obligation_text").notNull(),
  obligationVerb: text("obligation_verb"),
  applicability: jsonb("applicability").$type<Record<string, any>>().default({}),
  evidenceTypes: jsonb("evidence_types").$type<string[]>().default([]),
  testProcedure: jsonb("test_procedure").$type<Record<string, any>>().default({}),
  domain: text("domain").default("Governance"),
  weight: integer("weight").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  contentHash: text("content_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const controlPackVersions = pgTable("control_pack_versions", {
  id: serial("id").primaryKey(),
  sourceKey: text("source_key").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  generator: text("generator").notNull(),
  hash: text("hash").notNull(),
  controlCount: integer("control_count").notNull().default(0),
  notes: text("notes"),
});

export const controlObjectiveAtomicMaps = pgTable("control_objective_atomic_maps", {
  id: serial("id").primaryKey(),
  controlObjectiveId: integer("control_objective_id").references(() => controlObjectives.id).notNull(),
  atomicControlId: integer("atomic_control_id").references(() => atomicControls.id).notNull(),
  confidence: integer("confidence").notNull().default(50),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const atomicAssessments = pgTable("atomic_assessments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  scope: text("scope"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  status: assessmentStatusEnum("status").notNull().default("DRAFT"),
  parentAssessmentId: integer("parent_assessment_id").references(() => assessments.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at"),
});

export const atomicAssessmentResponses = pgTable("atomic_assessment_responses", {
  id: serial("id").primaryKey(),
  atomicAssessmentId: integer("atomic_assessment_id").references(() => atomicAssessments.id).notNull(),
  atomicControlId: integer("atomic_control_id").references(() => atomicControls.id).notNull(),
  implementationStatus: atomicImplementationStatusEnum("implementation_status").notNull().default("NOT_STARTED"),
  maturityLevel: integer("maturity_level").notNull().default(0),
  confidence: atomicConfidenceEnum("confidence").notNull().default("NONE"),
  notes: text("notes"),
  answeredBy: integer("answered_by").references(() => users.id),
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
});

export const taskAtomicLinks = pgTable("task_atomic_links", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  atomicControlId: integer("atomic_control_id").references(() => atomicControls.id).notNull(),
});

export const tenantDailyAtomicSnapshots = pgTable("tenant_daily_atomic_snapshots", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  date: text("snapshot_date").notNull(),
  atomicCompliancePct: real("atomic_compliance_pct").notNull().default(0),
  atomicVerifiedPct: real("atomic_verified_pct").notNull().default(0),
  atomicMaturityAvg: real("atomic_maturity_avg").notNull().default(0),
  atomicOverdueTasks: integer("atomic_overdue_tasks").notNull().default(0),
  atomicEvidenceCoveragePct: real("atomic_evidence_coverage_pct").notNull().default(0),
  lastComputedAt: timestamp("last_computed_at").defaultNow().notNull(),
});

export const importRuns = pgTable("import_runs", {
  id: serial("id").primaryKey(),
  sourceKey: text("source_key").notNull(),
  actorUserId: integer("actor_user_id").references(() => users.id).notNull(),
  mode: text("mode").notNull(),
  status: text("status").notNull().default("PENDING"),
  addedCount: integer("added_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  unchangedCount: integer("unchanged_count").notNull().default(0),
  deactivatedCount: integer("deactivated_count").notNull().default(0),
  totalCount: integer("total_count").notNull().default(0),
  packHash: text("pack_hash"),
  errorSummary: jsonb("error_summary").$type<Record<string, any>>(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
});

export const insertImportRunSchema = createInsertSchema(importRuns).omit({ id: true, startedAt: true, finishedAt: true });
export type ImportRun = typeof importRuns.$inferSelect;
export type InsertImportRun = z.infer<typeof insertImportRunSchema>;

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({ id: true, createdAt: true });
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;

export const insertLegalSourceSchema = createInsertSchema(legalSources).omit({ id: true, createdAt: true });
export type LegalSource = typeof legalSources.$inferSelect;
export type InsertLegalSource = z.infer<typeof insertLegalSourceSchema>;

export const insertAtomicControlSchema = createInsertSchema(atomicControls).omit({ id: true, createdAt: true, updatedAt: true });
export type AtomicControl = typeof atomicControls.$inferSelect;
export type InsertAtomicControl = z.infer<typeof insertAtomicControlSchema>;

export const insertControlPackVersionSchema = createInsertSchema(controlPackVersions).omit({ id: true, generatedAt: true });
export type ControlPackVersion = typeof controlPackVersions.$inferSelect;
export type InsertControlPackVersion = z.infer<typeof insertControlPackVersionSchema>;

export const insertControlObjectiveAtomicMapSchema = createInsertSchema(controlObjectiveAtomicMaps).omit({ id: true, createdAt: true });
export type ControlObjectiveAtomicMap = typeof controlObjectiveAtomicMaps.$inferSelect;
export type InsertControlObjectiveAtomicMap = z.infer<typeof insertControlObjectiveAtomicMapSchema>;

export const insertAtomicAssessmentSchema = createInsertSchema(atomicAssessments).omit({ id: true, createdAt: true, submittedAt: true });
export type AtomicAssessment = typeof atomicAssessments.$inferSelect;
export type InsertAtomicAssessment = z.infer<typeof insertAtomicAssessmentSchema>;

export const insertAtomicAssessmentResponseSchema = createInsertSchema(atomicAssessmentResponses).omit({ id: true, answeredAt: true });
export type AtomicAssessmentResponse = typeof atomicAssessmentResponses.$inferSelect;
export type InsertAtomicAssessmentResponse = z.infer<typeof insertAtomicAssessmentResponseSchema>;

export const insertTaskAtomicLinkSchema = createInsertSchema(taskAtomicLinks).omit({ id: true });
export type TaskAtomicLink = typeof taskAtomicLinks.$inferSelect;
export type InsertTaskAtomicLink = z.infer<typeof insertTaskAtomicLinkSchema>;

export const insertTenantDailyAtomicSnapshotSchema = createInsertSchema(tenantDailyAtomicSnapshots).omit({ id: true, lastComputedAt: true });
export type TenantDailyAtomicSnapshot = typeof tenantDailyAtomicSnapshots.$inferSelect;
export type InsertTenantDailyAtomicSnapshot = z.infer<typeof insertTenantDailyAtomicSnapshotSchema>;

// ----- DORA module -----
export const doraRegulatoryProfile = pgTable("dora_regulatory_profile", {
  tenantId: integer("tenant_id").primaryKey().references(() => tenants.id, { onDelete: "cascade" }),
  doraEnabled: boolean("dora_enabled").notNull().default(false),
  doraScopeConfirmed: boolean("dora_scope_confirmed").notNull().default(false),
  doraEntityType: text("dora_entity_type"),
  doraArticle2InScope: boolean("dora_article2_in_scope").notNull().default(false),
  doraArticle2Exclusion: boolean("dora_article2_exclusion").notNull().default(false),
  doraArticle16Simplified: boolean("dora_article16_simplified").notNull().default(false),
  doraMicroenterprise: boolean("dora_microenterprise").notNull().default(false),
  euEeaFinancialEntity: boolean("eu_eea_financial_entity").notNull().default(false),
  competentAuthority: text("competent_authority"),
  country: text("country"),
  usesIctThirdPartyServices: boolean("uses_ict_third_party_services").notNull().default(false),
  hasCriticalOrImportantFunctions: boolean("has_critical_or_important_functions").notNull().default(false),
  ictServicesSupportCriticalOrImportantFunctions: boolean("ict_services_support_critical_or_important_functions").notNull().default(false),
  paymentRelatedEntity: boolean("payment_related_entity").notNull().default(false),
  tlptSelectedOrRequired: boolean("tlpt_selected_or_required").notNull().default(false),
  participatesInInformationSharing: boolean("participates_in_information_sharing").notNull().default(false),
  ictThirdPartyProviderProfile: boolean("ict_third_party_provider_profile").notNull().default(false),
  criticalIctThirdPartyProviderDesignated: boolean("critical_ict_third_party_provider_designated").notNull().default(false),
  doraApplicabilityNotes: text("dora_applicability_notes"),
  doraLastScopeReviewDate: timestamp("dora_last_scope_review_date"),
  doraScopeReviewedBy: integer("dora_scope_reviewed_by").references(() => users.id),
  adminOverrideEnabled: boolean("admin_override_enabled").notNull().default(false),
  adminOverrideReason: text("admin_override_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDoraRegulatoryProfileSchema = createInsertSchema(doraRegulatoryProfile).omit({
  createdAt: true,
  updatedAt: true,
});
export type DoraRegulatoryProfile = typeof doraRegulatoryProfile.$inferSelect;
export type InsertDoraRegulatoryProfile = z.infer<typeof insertDoraRegulatoryProfileSchema>;

export const insertRiskLibraryEntrySchema = createInsertSchema(riskLibraryEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type RiskLibraryEntry = typeof riskLibraryEntries.$inferSelect;
export type InsertRiskLibraryEntry = z.infer<typeof insertRiskLibraryEntrySchema>;

export const insertTenantRiskRegisterItemSchema = createInsertSchema(tenantRiskRegisterItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type TenantRiskRegisterItem = typeof tenantRiskRegisterItems.$inferSelect;
export type InsertTenantRiskRegisterItem = z.infer<typeof insertTenantRiskRegisterItemSchema>;

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
