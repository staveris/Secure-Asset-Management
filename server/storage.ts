import { eq, and, desc, sql, count, avg, ne } from "drizzle-orm";
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
} from "@shared/schema";

export interface IStorage {
  createTenant(data: InsertTenant): Promise<Tenant>;
  getTenant(id: number): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  updateTenant(id: number, data: Partial<InsertTenant>): Promise<Tenant | undefined>;

  createUser(data: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByTenant(tenantId: number): Promise<User[]>;
  updateUserLastLogin(id: number): Promise<void>;
  updateUser(id: number, data: Partial<{fullName: string, role: string, isActive: boolean}>): Promise<User | undefined>;
  updateUserPassword(id: number, newPasswordHash: string): Promise<void>;
  updateUserProfile(id: number, data: Partial<{fullName: string, email: string}>): Promise<void>;
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
  updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined>;

  getEvidenceByTenant(tenantId: number): Promise<EvidenceItem[]>;
  createEvidenceItem(data: InsertEvidenceItem): Promise<EvidenceItem>;
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

    const statusCounts = { NOT_STARTED: 0, IN_PROGRESS: 0, IMPLEMENTED: 0, VERIFIED: 0 };
    for (const r of allResponsesList) {
      statusCounts[r.implementationStatus as keyof typeof statusCounts]++;
    }

    const totalResponses = allResponsesList.length;
    const implementedTotal = allResponsesList.filter(
      (r) => r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED"
    ).length;
    const avgComplianceScore = totalResponses > 0 ? Math.round((implementedTotal / totalResponses) * 100) : 0;

    const overdueTasksCount = allTasksList.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE"
    ).length;
    const openIncidentsCount = allIncidentsList.filter((i) => i.status !== "CLOSED").length;

    const sectorMap: Record<string, number> = {};
    for (const t of allTenants) {
      sectorMap[t.sector] = (sectorMap[t.sector] || 0) + 1;
    }

    const tenantSummaries = await Promise.all(
      allTenants.map(async (t) => {
        const tenantUsers = allUsers.filter((u) => u.tenantId === t.id);
        const dashData = await this.getDashboardData(t.id);
        return {
          id: t.id,
          name: t.name,
          sector: t.sector,
          complianceScore: dashData.complianceScore,
          taskCount: dashData.activeTasks,
          userCount: tenantUsers.length,
        };
      })
    );

    return {
      totalTenants: allTenants.length,
      totalUsers: allUsers.length,
      avgComplianceScore,
      overdueTasksCount,
      openIncidentsCount,
      evidenceCount: allEvidenceList.length,
      statusDistribution: [
        { name: "Not Started", value: statusCounts.NOT_STARTED, color: "#6b7280" },
        { name: "In Progress", value: statusCounts.IN_PROGRESS, color: "#3b82f6" },
        { name: "Implemented", value: statusCounts.IMPLEMENTED, color: "#22c55e" },
        { name: "Verified", value: statusCounts.VERIFIED, color: "#8b5cf6" },
      ],
      tenantSummaries,
      sectorBreakdown: Object.entries(sectorMap).map(([sector, count]) => ({
        sector: sector.charAt(0).toUpperCase() + sector.slice(1),
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
}

export const storage = new DatabaseStorage();
