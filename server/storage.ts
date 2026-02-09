import { eq, and, desc, sql, count, avg, ne, like, or, isNull, asc } from "drizzle-orm";
import { db } from "./db";
import {
  tenants,
  users,
  requirements,
  controlObjectives,
  assessments,
  assessmentResponses,
  tasks,
  evidenceItems,
  incidentCases,
  suppliers,
  riskItems,
  auditLogs,
  controls,
  incidentNotifications,
  tenantDailySnapshots,
  sectorPacks,
  applicabilityRules,
  inviteTokens,
  evidenceAccessLogs,
  evidenceUnlockRequests,
  passwordHistory,
  featureFlags,
  legalSources,
  atomicControls,
  controlPackVersions,
  controlObjectiveAtomicMaps,
  atomicAssessments,
  atomicAssessmentResponses,
  taskAtomicLinks,
  tenantDailyAtomicSnapshots,
  type InsertTenant,
  type InsertUser,
  type InsertRequirement,
  type InsertControlObjective,
  type InsertAssessment,
  type InsertAssessmentResponse,
  type InsertTask,
  type InsertEvidenceItem,
  type InsertIncidentCase,
  type InsertSupplier,
  type InsertRiskItem,
  type InsertControl,
  type InsertIncidentNotification,
  type InsertTenantDailySnapshot,
  type InsertSectorPack,
  type InsertApplicabilityRule,
  type InsertInviteToken,
  type InsertEvidenceAccessLog,
  type InsertEvidenceUnlockRequest,
  type Tenant,
  type User,
  type Requirement,
  type ControlObjective,
  type Assessment,
  type AssessmentResponse,
  type Task,
  type EvidenceItem,
  type IncidentCase,
  type Supplier,
  type RiskItem,
  type AuditLog,
  type Control,
  type IncidentNotification,
  type TenantDailySnapshot,
  type SectorPack,
  type ApplicabilityRule,
  type InviteToken,
  type EvidenceAccessLog,
  type EvidenceUnlockRequest,
  type InsertFeatureFlag,
  type FeatureFlag,
  type InsertLegalSource,
  type LegalSource,
  type InsertAtomicControl,
  type AtomicControl,
  type InsertControlPackVersion,
  type ControlPackVersion,
  type InsertControlObjectiveAtomicMap,
  type ControlObjectiveAtomicMap,
  type InsertAtomicAssessment,
  type AtomicAssessment,
  type InsertAtomicAssessmentResponse,
  type AtomicAssessmentResponse,
  type InsertTaskAtomicLink,
  type TaskAtomicLink,
  type InsertTenantDailyAtomicSnapshot,
  type TenantDailyAtomicSnapshot,
} from "@shared/schema";

export interface IStorage {
  createTenant(data: InsertTenant): Promise<Tenant>;
  getTenant(id: number): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  updateTenant(id: number, data: Partial<InsertTenant>): Promise<Tenant | undefined>;
  deleteTenant(id: number): Promise<void>;

  createUser(data: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByTenant(tenantId: number): Promise<User[]>;
  updateUserLastLogin(id: number): Promise<void>;
  updateUser(id: number, data: Partial<{fullName: string, role: string, isActive: boolean}>): Promise<User | undefined>;
  updateUserPassword(id: number, newPasswordHash: string): Promise<void>;
  updateUserProfile(id: number, data: Partial<{fullName: string, email: string}>): Promise<void>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  verifyUserEmail(id: number): Promise<void>;
  updateUserVerificationToken(id: number, token: string, expires: Date): Promise<void>;
  createInviteToken(data: InsertInviteToken): Promise<InviteToken>;
  getInviteTokenByHash(tokenHash: string): Promise<InviteToken | undefined>;
  markInviteTokenUsed(id: number): Promise<void>;

  createRequirement(data: InsertRequirement): Promise<Requirement>;
  getAllRequirements(): Promise<Requirement[]>;
  getRequirementsWithControls(): Promise<(Requirement & { controlObjectives: ControlObjective[] })[]>;

  createControlObjective(data: InsertControlObjective): Promise<ControlObjective>;
  getAllControlObjectives(): Promise<ControlObjective[]>;

  createSectorPack(data: InsertSectorPack): Promise<SectorPack>;
  getAllSectorPacks(): Promise<SectorPack[]>;
  getSectorPacksByApplicability(sector: string, subsector?: string): Promise<SectorPack[]>;

  createApplicabilityRule(data: InsertApplicabilityRule): Promise<ApplicabilityRule>;
  getApplicabilityRulesForControl(controlObjectiveId: number): Promise<ApplicabilityRule[]>;

  createAssessment(data: InsertAssessment): Promise<Assessment>;
  getAssessmentsByTenant(tenantId: number): Promise<Assessment[]>;
  getAssessment(id: number): Promise<Assessment | undefined>;

  createAssessmentResponse(data: InsertAssessmentResponse): Promise<AssessmentResponse>;
  getAssessmentResponses(assessmentId: number): Promise<AssessmentResponse[]>;
  getAssessmentResponseById(id: number): Promise<AssessmentResponse | undefined>;
  updateAssessmentResponse(id: number, data: Partial<InsertAssessmentResponse>): Promise<AssessmentResponse | undefined>;

  createTask(data: InsertTask): Promise<Task>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksByTenant(tenantId: number): Promise<Task[]>;
  getTasksByAssessment(assessmentId: number): Promise<Task[]>;
  getIncompleteTasksByTenant(tenantId: number): Promise<Task[]>;
  updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined>;

  getEvidenceByTenant(tenantId: number): Promise<EvidenceItem[]>;
  createEvidenceItem(data: InsertEvidenceItem): Promise<EvidenceItem>;
  deleteEvidenceItem(id: number): Promise<void>;
  lockEvidence(id: number, lockedBy: number, reason: string): Promise<EvidenceItem | undefined>;
  unlockEvidence(id: number): Promise<EvidenceItem | undefined>;
  createEvidenceAccessLog(data: InsertEvidenceAccessLog): Promise<EvidenceAccessLog>;
  getEvidenceAccessLogs(evidenceId: number): Promise<EvidenceAccessLog[]>;
  createEvidenceUnlockRequest(data: InsertEvidenceUnlockRequest): Promise<EvidenceUnlockRequest>;
  getEvidenceUnlockRequests(tenantId: number): Promise<EvidenceUnlockRequest[]>;
  updateEvidenceUnlockRequest(id: number, data: {status: string, approvedBy: number}): Promise<EvidenceUnlockRequest | undefined>;

  createIncidentCase(data: InsertIncidentCase): Promise<IncidentCase>;
  getIncidentCase(id: number): Promise<IncidentCase | undefined>;
  getIncidentsByTenant(tenantId: number): Promise<IncidentCase[]>;
  updateIncidentCase(id: number, data: Partial<InsertIncidentCase>): Promise<IncidentCase | undefined>;

  createSupplier(data: InsertSupplier): Promise<Supplier>;
  getSuppliersByTenant(tenantId: number): Promise<Supplier[]>;

  createRiskItem(data: InsertRiskItem): Promise<RiskItem>;
  getRisksByTenant(tenantId: number): Promise<RiskItem[]>;

  createAuditLog(data: { tenantId?: number | null; actorUserId?: number | null; action: string; entityType: string; entityId?: string; details?: any }): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  getAuditLogsByTenant(tenantId: number, limit?: number): Promise<AuditLog[]>;

  createControl(data: InsertControl): Promise<Control>;
  getControlsByTenant(tenantId: number): Promise<Control[]>;
  updateControl(id: number, data: Partial<InsertControl>): Promise<Control | undefined>;

  createIncidentNotification(data: InsertIncidentNotification): Promise<IncidentNotification>;
  getIncidentNotifications(incidentId: number): Promise<IncidentNotification[]>;
  updateIncidentNotification(id: number, data: Partial<InsertIncidentNotification>): Promise<IncidentNotification | undefined>;

  createTenantDailySnapshot(data: InsertTenantDailySnapshot): Promise<TenantDailySnapshot>;
  getSnapshotsByTenant(tenantId: number, limit?: number): Promise<TenantDailySnapshot[]>;

  recomputeTenantSnapshot(tenantId: number): Promise<TenantDailySnapshot>;

  getDashboardData(tenantId: number): Promise<any>;
  getAdminDashboardData(): Promise<any>;

  recalculateTenantStorageUsed(tenantId: number): Promise<void>;
  getTenantStorageInfo(tenantId: number): Promise<{ storageQuotaBytes: number; storageUsedBytes: number; maxUsers: number; maxFileSizeBytes: number; userCount: number; evidenceCount: number }>;
  updateTenantQuota(tenantId: number, data: { storageQuotaBytes?: number; maxUsers?: number; maxFileSizeBytes?: number }): Promise<Tenant | undefined>;

  getFeatureFlags(tenantId?: number): Promise<FeatureFlag[]>;
  getFeatureFlag(tenantId: number | null, key: string): Promise<FeatureFlag | undefined>;
  setFeatureFlag(tenantId: number | null, key: string, enabled: boolean): Promise<FeatureFlag>;
  isFeatureEnabled(tenantId: number, key: string): Promise<boolean>;

  createLegalSource(data: InsertLegalSource): Promise<LegalSource>;
  getAllLegalSources(): Promise<LegalSource[]>;

  createAtomicControl(data: InsertAtomicControl): Promise<AtomicControl>;
  getAtomicControlByControlId(controlId: string): Promise<AtomicControl | undefined>;
  getAllAtomicControls(): Promise<AtomicControl[]>;
  getAtomicControlsBySource(sourceKey: string): Promise<AtomicControl[]>;
  getAtomicControlsPaginated(offset: number, limit: number, sourceKey?: string, domain?: string, search?: string): Promise<{ data: AtomicControl[]; total: number }>;
  updateAtomicControl(id: number, data: Partial<InsertAtomicControl>): Promise<AtomicControl | undefined>;

  createControlPackVersion(data: InsertControlPackVersion): Promise<ControlPackVersion>;
  getControlPackVersions(sourceKey?: string): Promise<ControlPackVersion[]>;

  createControlObjectiveAtomicMap(data: InsertControlObjectiveAtomicMap): Promise<ControlObjectiveAtomicMap>;
  getAtomicMapsForControlObjective(controlObjectiveId: number): Promise<ControlObjectiveAtomicMap[]>;
  getAtomicMapsForAtomicControl(atomicControlId: number): Promise<ControlObjectiveAtomicMap[]>;
  getAllControlObjectiveAtomicMaps(): Promise<ControlObjectiveAtomicMap[]>;
  deleteControlObjectiveAtomicMap(id: number): Promise<void>;

  createAtomicAssessment(data: InsertAtomicAssessment): Promise<AtomicAssessment>;
  getAtomicAssessment(id: number): Promise<AtomicAssessment | undefined>;
  getAtomicAssessmentsByTenant(tenantId: number): Promise<AtomicAssessment[]>;
  updateAtomicAssessment(id: number, data: Partial<InsertAtomicAssessment>): Promise<AtomicAssessment | undefined>;

  createAtomicAssessmentResponse(data: InsertAtomicAssessmentResponse): Promise<AtomicAssessmentResponse>;
  getAtomicAssessmentResponses(atomicAssessmentId: number): Promise<AtomicAssessmentResponse[]>;
  upsertAtomicAssessmentResponse(data: InsertAtomicAssessmentResponse): Promise<AtomicAssessmentResponse>;

  createTaskAtomicLink(data: InsertTaskAtomicLink): Promise<TaskAtomicLink>;
  getTaskAtomicLinks(taskId: number): Promise<TaskAtomicLink[]>;
  getTasksForAtomicControl(atomicControlId: number): Promise<TaskAtomicLink[]>;

  createTenantDailyAtomicSnapshot(data: InsertTenantDailyAtomicSnapshot): Promise<TenantDailyAtomicSnapshot>;
  getAtomicSnapshotsByTenant(tenantId: number, limit?: number): Promise<TenantDailyAtomicSnapshot[]>;
}

export class DatabaseStorage implements IStorage {
  async createTenant(data: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(data).returning();
    return tenant;
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return db.select().from(tenants);
  }

  async updateTenant(id: number, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [tenant] = await db.update(tenants).set(data).where(eq(tenants.id, id)).returning();
    return tenant;
  }

  async deleteTenant(id: number): Promise<void> {
    await db.delete(tenantDailySnapshots).where(eq(tenantDailySnapshots.tenantId, id));
    await db.delete(tasks).where(eq(tasks.tenantId, id));
    await db.delete(assessmentResponses).where(
      sql`${assessmentResponses.assessmentId} IN (SELECT id FROM assessments WHERE tenant_id = ${id})`
    );
    await db.delete(assessments).where(eq(assessments.tenantId, id));
    await db.delete(evidenceAccessLogs).where(
      sql`${evidenceAccessLogs.evidenceId} IN (SELECT id FROM evidence_items WHERE tenant_id = ${id})`
    );
    await db.delete(evidenceUnlockRequests).where(eq(evidenceUnlockRequests.tenantId, id));
    await db.delete(evidenceItems).where(eq(evidenceItems.tenantId, id));
    await db.delete(incidentNotifications).where(
      sql`${incidentNotifications.incidentId} IN (SELECT id FROM incident_cases WHERE tenant_id = ${id})`
    );
    await db.delete(incidentCases).where(eq(incidentCases.tenantId, id));
    await db.delete(controls).where(eq(controls.tenantId, id));
    await db.delete(suppliers).where(eq(suppliers.tenantId, id));
    await db.delete(riskItems).where(eq(riskItems.tenantId, id));
    await db.delete(auditLogs).where(eq(auditLogs.tenantId, id));
    await db.delete(inviteTokens).where(eq(inviteTokens.tenantId, id));
    await db.delete(passwordHistory).where(
      sql`${passwordHistory.userId} IN (SELECT id FROM users WHERE tenant_id = ${id})`
    );
    await db.delete(users).where(eq(users.tenantId, id));
    await db.delete(tenants).where(eq(tenants.id, id));
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsersByTenant(tenantId: number): Promise<User[]> {
    return db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  }

  async updateUser(id: number, data: Partial<{fullName: string, role: string, isActive: boolean}>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data as any).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserPassword(id: number, newPasswordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, id));
  }

  async updateUserProfile(id: number, data: Partial<{fullName: string, email: string}>): Promise<void> {
    await db.update(users).set(data as any).where(eq(users.id, id));
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user;
  }

  async verifyUserEmail(id: number): Promise<void> {
    await db.update(users).set({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    }).where(eq(users.id, id));
  }

  async updateUserVerificationToken(id: number, token: string, expires: Date): Promise<void> {
    await db.update(users).set({
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    }).where(eq(users.id, id));
  }

  async createInviteToken(data: InsertInviteToken): Promise<InviteToken> {
    const [token] = await db.insert(inviteTokens).values(data).returning();
    return token;
  }

  async getInviteTokenByHash(tokenHash: string): Promise<InviteToken | undefined> {
    const [token] = await db.select().from(inviteTokens).where(eq(inviteTokens.tokenHash, tokenHash));
    return token;
  }

  async markInviteTokenUsed(id: number): Promise<void> {
    await db.update(inviteTokens).set({ usedAt: new Date() }).where(eq(inviteTokens.id, id));
  }

  async createRequirement(data: InsertRequirement): Promise<Requirement> {
    const [req] = await db.insert(requirements).values(data).returning();
    return req;
  }

  async getAllRequirements(): Promise<Requirement[]> {
    return db.select().from(requirements).where(eq(requirements.isActive, true));
  }

  async getRequirementsWithControls(): Promise<(Requirement & { controlObjectives: ControlObjective[] })[]> {
    const reqs = await db.select().from(requirements).where(eq(requirements.isActive, true));
    const controls = await db.select().from(controlObjectives);
    return reqs.map((r) => ({
      ...r,
      controlObjectives: controls.filter((c) => c.requirementId === r.id),
    }));
  }

  async createControlObjective(data: InsertControlObjective): Promise<ControlObjective> {
    const [co] = await db.insert(controlObjectives).values(data).returning();
    return co;
  }

  async getAllControlObjectives(): Promise<ControlObjective[]> {
    return db.select().from(controlObjectives);
  }

  async createSectorPack(data: InsertSectorPack): Promise<SectorPack> {
    const [pack] = await db.insert(sectorPacks).values(data).returning();
    return pack;
  }

  async getAllSectorPacks(): Promise<SectorPack[]> {
    return db.select().from(sectorPacks);
  }

  async getSectorPacksByApplicability(sector: string, subsector?: string): Promise<SectorPack[]> {
    const allPacks = await db.select().from(sectorPacks).where(eq(sectorPacks.isActive, true));
    return allPacks.filter((pack) => {
      const appliesTo = pack.appliesTo as { sectorGroups?: string[]; sectors?: string[]; subsectors?: string[] } | null;
      if (!appliesTo) return true;
      if (appliesTo.sectors && appliesTo.sectors.length > 0) {
        if (!appliesTo.sectors.includes(sector)) return false;
      }
      if (subsector && appliesTo.subsectors && appliesTo.subsectors.length > 0) {
        if (!appliesTo.subsectors.includes(subsector)) return false;
      }
      return true;
    });
  }

  async createApplicabilityRule(data: InsertApplicabilityRule): Promise<ApplicabilityRule> {
    const [rule] = await db.insert(applicabilityRules).values(data).returning();
    return rule;
  }

  async getApplicabilityRulesForControl(controlObjectiveId: number): Promise<ApplicabilityRule[]> {
    return db.select().from(applicabilityRules).where(eq(applicabilityRules.controlObjectiveId, controlObjectiveId));
  }

  async createAssessment(data: InsertAssessment): Promise<Assessment> {
    const [assessment] = await db.insert(assessments).values(data).returning();
    return assessment;
  }

  async getAssessmentsByTenant(tenantId: number): Promise<Assessment[]> {
    return db.select().from(assessments).where(eq(assessments.tenantId, tenantId)).orderBy(desc(assessments.createdAt));
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment;
  }

  async createAssessmentResponse(data: InsertAssessmentResponse): Promise<AssessmentResponse> {
    const [response] = await db.insert(assessmentResponses).values(data).returning();
    return response;
  }

  async getAssessmentResponses(assessmentId: number): Promise<AssessmentResponse[]> {
    return db.select().from(assessmentResponses).where(eq(assessmentResponses.assessmentId, assessmentId));
  }

  async getAssessmentResponseById(id: number): Promise<AssessmentResponse | undefined> {
    const [response] = await db.select().from(assessmentResponses).where(eq(assessmentResponses.id, id));
    return response;
  }

  async updateAssessmentResponse(id: number, data: Partial<InsertAssessmentResponse>): Promise<AssessmentResponse | undefined> {
    const [response] = await db
      .update(assessmentResponses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assessmentResponses.id, id))
      .returning();
    return response;
  }

  async createTask(data: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(data).returning();
    return task;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksByTenant(tenantId: number): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.tenantId, tenantId)).orderBy(desc(tasks.createdAt));
  }

  async getTasksByAssessment(assessmentId: number): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.assessmentId, assessmentId)).orderBy(desc(tasks.createdAt));
  }

  async getIncompleteTasksByTenant(tenantId: number): Promise<Task[]> {
    return db.select().from(tasks).where(
      and(eq(tasks.tenantId, tenantId), ne(tasks.status, "DONE"))
    ).orderBy(desc(tasks.createdAt));
  }

  async updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async getEvidenceByTenant(tenantId: number): Promise<EvidenceItem[]> {
    return db.select().from(evidenceItems).where(eq(evidenceItems.tenantId, tenantId)).orderBy(desc(evidenceItems.uploadedAt));
  }

  async createEvidenceItem(data: InsertEvidenceItem): Promise<EvidenceItem> {
    const [item] = await db.insert(evidenceItems).values(data).returning();
    return item;
  }

  async deleteEvidenceItem(id: number): Promise<void> {
    await db.delete(evidenceAccessLogs).where(eq(evidenceAccessLogs.evidenceId, id));
    await db.delete(evidenceUnlockRequests).where(eq(evidenceUnlockRequests.evidenceId, id));
    await db.delete(evidenceItems).where(eq(evidenceItems.id, id));
  }

  async lockEvidence(id: number, lockedBy: number, reason: string): Promise<EvidenceItem | undefined> {
    const [item] = await db.update(evidenceItems)
      .set({ lockedAt: new Date(), lockedBy, lockReason: reason })
      .where(eq(evidenceItems.id, id))
      .returning();
    return item;
  }

  async unlockEvidence(id: number): Promise<EvidenceItem | undefined> {
    const [item] = await db.update(evidenceItems)
      .set({ lockedAt: null, lockedBy: null, lockReason: null })
      .where(eq(evidenceItems.id, id))
      .returning();
    return item;
  }

  async createEvidenceAccessLog(data: InsertEvidenceAccessLog): Promise<EvidenceAccessLog> {
    const [log] = await db.insert(evidenceAccessLogs).values(data).returning();
    return log;
  }

  async getEvidenceAccessLogs(evidenceId: number): Promise<EvidenceAccessLog[]> {
    return db.select().from(evidenceAccessLogs)
      .where(eq(evidenceAccessLogs.evidenceId, evidenceId))
      .orderBy(desc(evidenceAccessLogs.createdAt));
  }

  async createEvidenceUnlockRequest(data: InsertEvidenceUnlockRequest): Promise<EvidenceUnlockRequest> {
    const [request] = await db.insert(evidenceUnlockRequests).values(data).returning();
    return request;
  }

  async getEvidenceUnlockRequests(tenantId: number): Promise<EvidenceUnlockRequest[]> {
    return db.select().from(evidenceUnlockRequests)
      .where(eq(evidenceUnlockRequests.tenantId, tenantId))
      .orderBy(desc(evidenceUnlockRequests.createdAt));
  }

  async updateEvidenceUnlockRequest(id: number, data: {status: string, approvedBy: number}): Promise<EvidenceUnlockRequest | undefined> {
    const [request] = await db.update(evidenceUnlockRequests)
      .set({ ...data, decidedAt: new Date() } as any)
      .where(eq(evidenceUnlockRequests.id, id))
      .returning();
    return request;
  }

  async createIncidentCase(data: InsertIncidentCase): Promise<IncidentCase> {
    const [incident] = await db.insert(incidentCases).values(data).returning();
    return incident;
  }

  async getIncidentCase(id: number): Promise<IncidentCase | undefined> {
    const [incident] = await db.select().from(incidentCases).where(eq(incidentCases.id, id));
    return incident;
  }

  async getIncidentsByTenant(tenantId: number): Promise<IncidentCase[]> {
    return db.select().from(incidentCases).where(eq(incidentCases.tenantId, tenantId)).orderBy(desc(incidentCases.detectedAt));
  }

  async updateIncidentCase(id: number, data: Partial<InsertIncidentCase>): Promise<IncidentCase | undefined> {
    const [incident] = await db
      .update(incidentCases)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(incidentCases.id, id))
      .returning();
    return incident;
  }

  async createSupplier(data: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(data).returning();
    return supplier;
  }

  async getSuppliersByTenant(tenantId: number): Promise<Supplier[]> {
    return db.select().from(suppliers).where(eq(suppliers.tenantId, tenantId));
  }

  async createRiskItem(data: InsertRiskItem): Promise<RiskItem> {
    const [risk] = await db.insert(riskItems).values(data).returning();
    return risk;
  }

  async getRisksByTenant(tenantId: number): Promise<RiskItem[]> {
    return db.select().from(riskItems).where(eq(riskItems.tenantId, tenantId));
  }

  async createAuditLog(data: { tenantId?: number | null; actorUserId?: number | null; action: string; entityType: string; entityId?: string; details?: any }): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  async getAuditLogsByTenant(tenantId: number, limit = 100): Promise<AuditLog[]> {
    return db.select().from(auditLogs).where(eq(auditLogs.tenantId, tenantId)).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  async getDashboardData(tenantId: number): Promise<any> {
    const allAssessments = await db.select().from(assessments).where(eq(assessments.tenantId, tenantId));
    const tenantTasks = await this.getTasksByTenant(tenantId);
    const tenantIncidents = await this.getIncidentsByTenant(tenantId);
    const tenantEvidence = await this.getEvidenceByTenant(tenantId);

    let allResponses: AssessmentResponse[] = [];
    for (const a of allAssessments) {
      const responses = await this.getAssessmentResponses(a.id);
      allResponses = allResponses.concat(responses);
    }

    const totalControls = allResponses.length;
    const implementedControls = allResponses.filter(
      (r) => r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED"
    ).length;
    const complianceScore = totalControls > 0 ? Math.round((implementedControls / totalControls) * 100) : 0;
    const maturityAverage = totalControls > 0
      ? allResponses.reduce((sum, r) => sum + r.maturityLevel, 0) / totalControls
      : 0;

    const activeTasks = tenantTasks.filter((t) => t.status !== "DONE").length;
    const overdueTasks = tenantTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE"
    ).length;
    const openIncidents = tenantIncidents.filter((i) => i.status !== "CLOSED").length;

    const statusCounts = { NOT_STARTED: 0, IN_PROGRESS: 0, IMPLEMENTED: 0, VERIFIED: 0 };
    for (const r of allResponses) {
      statusCounts[r.implementationStatus as keyof typeof statusCounts]++;
    }

    const categoryCounts: Record<string, { total: number; implemented: number }> = {};
    const controls = await this.getAllControlObjectives();
    const reqs = await this.getAllRequirements();
    for (const r of allResponses) {
      const control = controls.find((c) => c.id === r.controlObjectiveId);
      if (control) {
        const req = reqs.find((rq) => rq.id === control.requirementId);
        if (req) {
          if (!categoryCounts[req.category]) categoryCounts[req.category] = { total: 0, implemented: 0 };
          categoryCounts[req.category].total++;
          if (r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED") {
            categoryCounts[req.category].implemented++;
          }
        }
      }
    }

    return {
      complianceScore,
      maturityAverage,
      implementedControls,
      totalControls,
      activeTasks,
      overdueTasks,
      openIncidents,
      evidenceCount: tenantEvidence.length,
      statusDistribution: [
        { name: "Not Started", value: statusCounts.NOT_STARTED, color: "#6b7280" },
        { name: "In Progress", value: statusCounts.IN_PROGRESS, color: "#3b82f6" },
        { name: "Implemented", value: statusCounts.IMPLEMENTED, color: "#22c55e" },
        { name: "Verified", value: statusCounts.VERIFIED, color: "#8b5cf6" },
      ],
      categoryScores: Object.entries(categoryCounts).map(([category, data]) => ({
        category: category.length > 20 ? category.slice(0, 20) + "..." : category,
        score: data.total > 0 ? Math.round((data.implemented / data.total) * 100) : 0,
      })),
      recentTasks: tenantTasks.slice(0, 8).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
      })),
    };
  }

  async getAdminDashboardData(): Promise<any> {
    const allTenants = await this.getAllTenants();
    const allUsers = await db.select().from(users);
    const allTasksList = await db.select().from(tasks);
    const allIncidentsList = await db.select().from(incidentCases);
    const allEvidenceList = await db.select().from(evidenceItems);
    const allResponsesList = await db.select().from(assessmentResponses);
    const allAssessmentsList = await db.select().from(assessments);
    const allSuppliersList = await db.select().from(suppliers);
    const allRisksList = await db.select().from(riskItems);

    const statusCounts = { NOT_STARTED: 0, IN_PROGRESS: 0, IMPLEMENTED: 0, VERIFIED: 0 };
    for (const r of allResponsesList) {
      statusCounts[r.implementationStatus as keyof typeof statusCounts]++;
    }

    const totalResponses = allResponsesList.length;
    const implementedTotal = allResponsesList.filter(
      (r) => r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED"
    ).length;
    const avgComplianceScore = totalResponses > 0 ? Math.round((implementedTotal / totalResponses) * 100) : 0;

    const maturitySum = allResponsesList.reduce((sum, r) => sum + r.maturityLevel, 0);
    const avgMaturity = totalResponses > 0 ? parseFloat((maturitySum / totalResponses).toFixed(2)) : 0;

    const overdueTasksCount = allTasksList.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE"
    ).length;
    const completedTasksCount = allTasksList.filter(t => t.status === "DONE").length;
    const openIncidentsCount = allIncidentsList.filter((i) => i.status !== "CLOSED").length;
    const criticalIncidents = allIncidentsList.filter(i => i.severity === "CRITICAL" && i.status !== "CLOSED").length;

    const activeTenants = allTenants.filter(t => (t as any).status === "active" || !(t as any).status).length;
    const suspendedTenants = allTenants.filter(t => (t as any).status === "suspended").length;

    const sectorMap: Record<string, number> = {};
    for (const t of allTenants) {
      sectorMap[t.sector] = (sectorMap[t.sector] || 0) + 1;
    }

    const entityTypeMap: Record<string, number> = {};
    for (const t of allTenants) {
      const et = t.entityType || "unknown";
      entityTypeMap[et] = (entityTypeMap[et] || 0) + 1;
    }

    const roleMap: Record<string, number> = {};
    for (const u of allUsers) {
      roleMap[u.role] = (roleMap[u.role] || 0) + 1;
    }

    const taskStatusMap: Record<string, number> = {};
    for (const t of allTasksList) {
      taskStatusMap[t.status] = (taskStatusMap[t.status] || 0) + 1;
    }

    const tenantSummaries = await Promise.all(
      allTenants.map(async (t) => {
        const tenantUsers = allUsers.filter((u) => u.tenantId === t.id);
        const tenantAssessments = allAssessmentsList.filter(a => a.tenantId === t.id);
        const tenantTasks = allTasksList.filter(tk => tk.tenantId === t.id);
        const tenantIncidents = allIncidentsList.filter(i => i.tenantId === t.id);
        const tenantEvidence = allEvidenceList.filter(e => e.tenantId === t.id);
        const dashData = await this.getDashboardData(t.id);
        return {
          id: t.id,
          name: t.name,
          sector: t.sector,
          entityType: t.entityType,
          status: (t as any).status || "active",
          complianceScore: dashData.complianceScore,
          maturityAvg: dashData.maturityAverage,
          taskCount: dashData.activeTasks,
          userCount: tenantUsers.length,
          assessmentCount: tenantAssessments.length,
          incidentCount: tenantIncidents.length,
          evidenceCount: tenantEvidence.length,
          overdueTasks: tenantTasks.filter(tk => tk.dueDate && new Date(tk.dueDate) < new Date() && tk.status !== "DONE").length,
        };
      })
    );

    const complianceDistribution = [
      { range: "0-25%", count: tenantSummaries.filter(t => t.complianceScore <= 25).length },
      { range: "26-50%", count: tenantSummaries.filter(t => t.complianceScore > 25 && t.complianceScore <= 50).length },
      { range: "51-75%", count: tenantSummaries.filter(t => t.complianceScore > 50 && t.complianceScore <= 75).length },
      { range: "76-100%", count: tenantSummaries.filter(t => t.complianceScore > 75).length },
    ];

    return {
      totalTenants: allTenants.length,
      activeTenants,
      suspendedTenants,
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.isActive).length,
      avgComplianceScore,
      avgMaturity,
      overdueTasksCount,
      completedTasksCount,
      totalTasks: allTasksList.length,
      openIncidentsCount,
      criticalIncidents,
      totalIncidents: allIncidentsList.length,
      evidenceCount: allEvidenceList.length,
      totalAssessments: allAssessmentsList.length,
      totalSuppliers: allSuppliersList.length,
      totalRisks: allRisksList.length,
      statusDistribution: [
        { name: "Not Started", value: statusCounts.NOT_STARTED, color: "#6b7280" },
        { name: "In Progress", value: statusCounts.IN_PROGRESS, color: "#3b82f6" },
        { name: "Implemented", value: statusCounts.IMPLEMENTED, color: "#22c55e" },
        { name: "Verified", value: statusCounts.VERIFIED, color: "#8b5cf6" },
      ],
      complianceDistribution,
      entityTypeBreakdown: Object.entries(entityTypeMap).map(([type, count]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count,
      })),
      roleBreakdown: Object.entries(roleMap).map(([role, count]) => ({
        role: role.replace(/_/g, " "),
        count,
      })),
      taskStatusBreakdown: Object.entries(taskStatusMap).map(([status, count]) => ({
        status: status.replace(/_/g, " "),
        count,
      })),
      tenantSummaries,
      sectorBreakdown: Object.entries(sectorMap).map(([sector, count]) => ({
        sector: sector.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        count,
      })),
    };
  }
  async createControl(data: InsertControl): Promise<Control> {
    const [control] = await db.insert(controls).values(data).returning();
    return control;
  }

  async getControlsByTenant(tenantId: number): Promise<Control[]> {
    return db.select().from(controls).where(eq(controls.tenantId, tenantId));
  }

  async updateControl(id: number, data: Partial<InsertControl>): Promise<Control | undefined> {
    const [control] = await db
      .update(controls)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(controls.id, id))
      .returning();
    return control;
  }

  async createIncidentNotification(data: InsertIncidentNotification): Promise<IncidentNotification> {
    const [notification] = await db.insert(incidentNotifications).values(data).returning();
    return notification;
  }

  async getIncidentNotifications(incidentId: number): Promise<IncidentNotification[]> {
    return db.select().from(incidentNotifications).where(eq(incidentNotifications.incidentId, incidentId)).orderBy(desc(incidentNotifications.createdAt));
  }

  async updateIncidentNotification(id: number, data: Partial<InsertIncidentNotification>): Promise<IncidentNotification | undefined> {
    const [notification] = await db
      .update(incidentNotifications)
      .set(data)
      .where(eq(incidentNotifications.id, id))
      .returning();
    return notification;
  }

  async createTenantDailySnapshot(data: InsertTenantDailySnapshot): Promise<TenantDailySnapshot> {
    const [snapshot] = await db.insert(tenantDailySnapshots).values(data).returning();
    return snapshot;
  }

  async getSnapshotsByTenant(tenantId: number, limit = 30): Promise<TenantDailySnapshot[]> {
    return db.select().from(tenantDailySnapshots)
      .where(eq(tenantDailySnapshots.tenantId, tenantId))
      .orderBy(desc(tenantDailySnapshots.date))
      .limit(limit);
  }

  async recomputeTenantSnapshot(tenantId: number): Promise<TenantDailySnapshot> {
    const dashboard = await this.getDashboardData(tenantId);
    const today = new Date().toISOString().slice(0, 10);

    const existing = await db.select().from(tenantDailySnapshots)
      .where(and(eq(tenantDailySnapshots.tenantId, tenantId), eq(tenantDailySnapshots.date, today)));

    if (existing.length > 0) {
      const [updated] = await db.update(tenantDailySnapshots)
        .set({
          compliancePct: dashboard.complianceScore,
          verifiedPct: dashboard.statusDistribution.find((s: any) => s.name === "Verified")?.value ?? 0,
          maturityAvg: dashboard.maturityAverage,
          overdueTasks: dashboard.overdueTasks,
          evidenceCoverage: dashboard.evidenceCount,
          incidentsOpen: dashboard.openIncidents,
        })
        .where(eq(tenantDailySnapshots.id, existing[0].id))
        .returning();
      return updated;
    }

    return this.createTenantDailySnapshot({
      tenantId,
      date: today,
      compliancePct: dashboard.complianceScore,
      verifiedPct: dashboard.statusDistribution.find((s: any) => s.name === "Verified")?.value ?? 0,
      maturityAvg: dashboard.maturityAverage,
      overdueTasks: dashboard.overdueTasks,
      evidenceCoverage: dashboard.evidenceCount,
      incidentsOpen: dashboard.openIncidents,
    });
  }

  async recalculateTenantStorageUsed(tenantId: number): Promise<void> {
    const evidence = await this.getEvidenceByTenant(tenantId);
    const totalBytes = evidence.reduce((sum, e) => sum + (e.size || 0), 0);
    await db.update(tenants).set({ storageUsedBytes: totalBytes }).where(eq(tenants.id, tenantId));
  }

  async getTenantStorageInfo(tenantId: number): Promise<{ storageQuotaBytes: number; storageUsedBytes: number; maxUsers: number; maxFileSizeBytes: number; userCount: number; evidenceCount: number }> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) throw new Error("Tenant not found");
    const users = await this.getUsersByTenant(tenantId);
    const evidence = await this.getEvidenceByTenant(tenantId);
    return {
      storageQuotaBytes: tenant.storageQuotaBytes,
      storageUsedBytes: tenant.storageUsedBytes,
      maxUsers: tenant.maxUsers,
      maxFileSizeBytes: tenant.maxFileSizeBytes,
      userCount: users.length,
      evidenceCount: evidence.length,
    };
  }

  async updateTenantQuota(tenantId: number, data: { storageQuotaBytes?: number; maxUsers?: number; maxFileSizeBytes?: number }): Promise<Tenant | undefined> {
    const updateData: any = {};
    if (data.storageQuotaBytes !== undefined) updateData.storageQuotaBytes = data.storageQuotaBytes;
    if (data.maxUsers !== undefined) updateData.maxUsers = data.maxUsers;
    if (data.maxFileSizeBytes !== undefined) updateData.maxFileSizeBytes = data.maxFileSizeBytes;
    const [tenant] = await db.update(tenants).set(updateData).where(eq(tenants.id, tenantId)).returning();
    return tenant;
  }

  async getFeatureFlags(tenantId?: number): Promise<FeatureFlag[]> {
    if (tenantId !== undefined) {
      return db.select().from(featureFlags).where(
        or(eq(featureFlags.tenantId, tenantId), isNull(featureFlags.tenantId))
      );
    }
    return db.select().from(featureFlags);
  }

  async getFeatureFlag(tenantId: number | null, key: string): Promise<FeatureFlag | undefined> {
    const condition = tenantId === null
      ? and(isNull(featureFlags.tenantId), eq(featureFlags.key, key))
      : and(eq(featureFlags.tenantId, tenantId), eq(featureFlags.key, key));
    const [flag] = await db.select().from(featureFlags).where(condition);
    return flag;
  }

  async setFeatureFlag(tenantId: number | null, key: string, enabled: boolean): Promise<FeatureFlag> {
    const existing = await this.getFeatureFlag(tenantId, key);
    if (existing) {
      const [updated] = await db.update(featureFlags).set({ enabled }).where(eq(featureFlags.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(featureFlags).values({ tenantId, key, enabled }).returning();
    return created;
  }

  async isFeatureEnabled(tenantId: number, key: string): Promise<boolean> {
    const tenantFlag = await this.getFeatureFlag(tenantId, key);
    if (tenantFlag) return tenantFlag.enabled;
    const globalFlag = await this.getFeatureFlag(null, key);
    if (globalFlag) return globalFlag.enabled;
    return false;
  }

  async createLegalSource(data: InsertLegalSource): Promise<LegalSource> {
    const [source] = await db.insert(legalSources).values(data).returning();
    return source;
  }

  async getAllLegalSources(): Promise<LegalSource[]> {
    return db.select().from(legalSources);
  }

  async createAtomicControl(data: InsertAtomicControl): Promise<AtomicControl> {
    const [control] = await db.insert(atomicControls).values(data as any).returning();
    return control;
  }

  async getAtomicControlByControlId(controlId: string): Promise<AtomicControl | undefined> {
    const [control] = await db.select().from(atomicControls).where(eq(atomicControls.controlId, controlId));
    return control;
  }

  async getAllAtomicControls(): Promise<AtomicControl[]> {
    return db.select().from(atomicControls);
  }

  async getAtomicControlsBySource(sourceKey: string): Promise<AtomicControl[]> {
    return db.select().from(atomicControls).where(eq(atomicControls.sourceKey, sourceKey));
  }

  async getAtomicControlsPaginated(offset: number, limit: number, sourceKey?: string, domain?: string, search?: string): Promise<{ data: AtomicControl[]; total: number }> {
    const conditions: any[] = [];
    if (sourceKey) {
      conditions.push(eq(atomicControls.sourceKey, sourceKey));
    }
    if (domain) {
      conditions.push(eq(atomicControls.domain, domain));
    }
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          like(atomicControls.shortTitle, searchPattern),
          like(atomicControls.controlId, searchPattern),
          like(atomicControls.obligationText, searchPattern)
        )
      );
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(atomicControls).where(whereClause);
    const data = await db.select().from(atomicControls).where(whereClause).orderBy(asc(atomicControls.controlId)).offset(offset).limit(limit);

    return { data, total: Number(totalResult.count) };
  }

  async updateAtomicControl(id: number, data: Partial<InsertAtomicControl>): Promise<AtomicControl | undefined> {
    const [control] = await db.update(atomicControls).set({ ...data, updatedAt: new Date() } as any).where(eq(atomicControls.id, id)).returning();
    return control;
  }

  async createControlPackVersion(data: InsertControlPackVersion): Promise<ControlPackVersion> {
    const [version] = await db.insert(controlPackVersions).values(data).returning();
    return version;
  }

  async getControlPackVersions(sourceKey?: string): Promise<ControlPackVersion[]> {
    if (sourceKey) {
      return db.select().from(controlPackVersions).where(eq(controlPackVersions.sourceKey, sourceKey)).orderBy(desc(controlPackVersions.generatedAt));
    }
    return db.select().from(controlPackVersions).orderBy(desc(controlPackVersions.generatedAt));
  }

  async createControlObjectiveAtomicMap(data: InsertControlObjectiveAtomicMap): Promise<ControlObjectiveAtomicMap> {
    const [map] = await db.insert(controlObjectiveAtomicMaps).values(data).returning();
    return map;
  }

  async getAtomicMapsForControlObjective(controlObjectiveId: number): Promise<ControlObjectiveAtomicMap[]> {
    return db.select().from(controlObjectiveAtomicMaps).where(eq(controlObjectiveAtomicMaps.controlObjectiveId, controlObjectiveId));
  }

  async getAtomicMapsForAtomicControl(atomicControlId: number): Promise<ControlObjectiveAtomicMap[]> {
    return db.select().from(controlObjectiveAtomicMaps).where(eq(controlObjectiveAtomicMaps.atomicControlId, atomicControlId));
  }

  async getAllControlObjectiveAtomicMaps(): Promise<ControlObjectiveAtomicMap[]> {
    return db.select().from(controlObjectiveAtomicMaps);
  }

  async deleteControlObjectiveAtomicMap(id: number): Promise<void> {
    await db.delete(controlObjectiveAtomicMaps).where(eq(controlObjectiveAtomicMaps.id, id));
  }

  async createAtomicAssessment(data: InsertAtomicAssessment): Promise<AtomicAssessment> {
    const [assessment] = await db.insert(atomicAssessments).values(data).returning();
    return assessment;
  }

  async getAtomicAssessment(id: number): Promise<AtomicAssessment | undefined> {
    const [assessment] = await db.select().from(atomicAssessments).where(eq(atomicAssessments.id, id));
    return assessment;
  }

  async getAtomicAssessmentsByTenant(tenantId: number): Promise<AtomicAssessment[]> {
    return db.select().from(atomicAssessments).where(eq(atomicAssessments.tenantId, tenantId)).orderBy(desc(atomicAssessments.createdAt));
  }

  async updateAtomicAssessment(id: number, data: Partial<InsertAtomicAssessment>): Promise<AtomicAssessment | undefined> {
    const [assessment] = await db.update(atomicAssessments).set(data).where(eq(atomicAssessments.id, id)).returning();
    return assessment;
  }

  async createAtomicAssessmentResponse(data: InsertAtomicAssessmentResponse): Promise<AtomicAssessmentResponse> {
    const [response] = await db.insert(atomicAssessmentResponses).values(data).returning();
    return response;
  }

  async getAtomicAssessmentResponses(atomicAssessmentId: number): Promise<AtomicAssessmentResponse[]> {
    return db.select().from(atomicAssessmentResponses).where(eq(atomicAssessmentResponses.atomicAssessmentId, atomicAssessmentId));
  }

  async upsertAtomicAssessmentResponse(data: InsertAtomicAssessmentResponse): Promise<AtomicAssessmentResponse> {
    const [existing] = await db.select().from(atomicAssessmentResponses).where(
      and(
        eq(atomicAssessmentResponses.atomicAssessmentId, data.atomicAssessmentId),
        eq(atomicAssessmentResponses.atomicControlId, data.atomicControlId)
      )
    );
    if (existing) {
      const [updated] = await db.update(atomicAssessmentResponses)
        .set({ ...data, answeredAt: new Date() })
        .where(eq(atomicAssessmentResponses.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(atomicAssessmentResponses).values(data).returning();
    return created;
  }

  async createTaskAtomicLink(data: InsertTaskAtomicLink): Promise<TaskAtomicLink> {
    const [link] = await db.insert(taskAtomicLinks).values(data).returning();
    return link;
  }

  async getTaskAtomicLinks(taskId: number): Promise<TaskAtomicLink[]> {
    return db.select().from(taskAtomicLinks).where(eq(taskAtomicLinks.taskId, taskId));
  }

  async getTasksForAtomicControl(atomicControlId: number): Promise<TaskAtomicLink[]> {
    return db.select().from(taskAtomicLinks).where(eq(taskAtomicLinks.atomicControlId, atomicControlId));
  }

  async createTenantDailyAtomicSnapshot(data: InsertTenantDailyAtomicSnapshot): Promise<TenantDailyAtomicSnapshot> {
    const [snapshot] = await db.insert(tenantDailyAtomicSnapshots).values(data).returning();
    return snapshot;
  }

  async getAtomicSnapshotsByTenant(tenantId: number, limit = 30): Promise<TenantDailyAtomicSnapshot[]> {
    return db.select().from(tenantDailyAtomicSnapshots)
      .where(eq(tenantDailyAtomicSnapshots.tenantId, tenantId))
      .orderBy(desc(tenantDailyAtomicSnapshots.date))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
