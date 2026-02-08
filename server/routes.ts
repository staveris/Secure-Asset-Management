import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { loginSchema, registerSchema } from "@shared/schema";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const PgSession = connectPgSimple(session);

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString("hex");
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
    }
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

async function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "PLATFORM_ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

async function requireWriteAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
  const user = await storage.getUser(req.session.userId);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (user.role === "READONLY_AUDITOR") {
    return res.status(403).json({ message: "Read-only access. Auditors cannot modify data." });
  }
  next();
}

async function getAuthUser(req: Request) {
  if (!req.session.userId) return null;
  return storage.getUser(req.session.userId);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "nis2-platform-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );

  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) return res.status(400).json({ message: "Email already registered" });

      const passwordHash = await bcrypt.hash(data.password, 12);
      const tenant = await storage.createTenant({
        name: data.companyName,
        sector: data.sector,
        entityType: data.entityType,
      });

      const user = await storage.createUser({
        tenantId: tenant.id,
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: "TENANT_ADMIN",
        isActive: true,
      });

      await storage.createAuditLog({
        tenantId: tenant.id,
        actorUserId: user.id,
        action: "REGISTER",
        entityType: "USER",
        entityId: String(user.id),
      });

      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, fullName: user.fullName, role: user.role });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message || "Validation error" });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user || !user.isActive) return res.status(401).json({ message: "Invalid credentials" });

      const valid = await bcrypt.compare(data.password, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });

      await storage.updateUserLastLogin(user.id);
      req.session.userId = user.id;

      const tenant = user.tenantId ? await storage.getTenant(user.tenantId) : null;
      res.json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: tenant?.name || null,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message || "Validation error" });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    const tenant = user.tenantId ? await storage.getTenant(user.tenantId) : null;
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: tenant?.name || null,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  });

  app.get("/api/dashboard", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const data = await storage.getDashboardData(user.tenantId);
    res.json(data);
  });

  app.get("/api/assessments", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const list = await storage.getAssessmentsByTenant(user.tenantId);
    res.json(list);
  });

  app.post("/api/assessments", requireAuth, requireWriteAccess, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });

      const { name, scope } = req.body;
      if (!name) return res.status(400).json({ message: "Name is required" });

      const assessment = await storage.createAssessment({
        tenantId: user.tenantId,
        name,
        scope: scope || null,
        createdBy: user.id,
        status: "IN_PROGRESS",
      });

      const allControls = await storage.getAllControlObjectives();
      for (const control of allControls) {
        await storage.createAssessmentResponse({
          assessmentId: assessment.id,
          controlObjectiveId: control.id,
          implementationStatus: "NOT_STARTED",
          maturityLevel: 0,
          evidenceConfidence: "NONE",
          notes: null,
          updatedBy: user.id,
        });
      }

      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "CREATE",
        entityType: "ASSESSMENT",
        entityId: String(assessment.id),
      });

      res.json(assessment);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/assessments/:id", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });

    const id = parseInt(req.params.id);
    const assessment = await storage.getAssessment(id);
    if (!assessment || assessment.tenantId !== user.tenantId) {
      if (user.role !== "PLATFORM_ADMIN") {
        return res.status(404).json({ message: "Not found" });
      }
    }

    const responses = await storage.getAssessmentResponses(id);
    const controls = await storage.getAllControlObjectives();
    const reqs = await storage.getAllRequirements();

    const enrichedResponses = responses.map((r) => {
      const control = controls.find((c) => c.id === r.controlObjectiveId);
      const req = control ? reqs.find((rq) => rq.id === control.requirementId) : null;
      return {
        id: r.id,
        controlObjectiveId: r.controlObjectiveId,
        controlTitle: control?.title || "",
        controlDescription: control?.description || "",
        requirementCode: req?.code || "",
        requirementTitle: req?.title || "",
        category: req?.category || "Uncategorized",
        implementationStatus: r.implementationStatus,
        maturityLevel: r.maturityLevel,
        evidenceConfidence: r.evidenceConfidence,
        notes: r.notes,
        guidance: control?.guidance || null,
      };
    });

    res.json({
      id: assessment.id,
      name: assessment.name,
      scope: assessment.scope,
      status: assessment.status,
      createdAt: assessment.createdAt,
      responses: enrichedResponses,
    });
  });

  app.patch("/api/assessment-responses/:id", requireAuth, requireWriteAccess, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(401).json({ message: "Unauthorized" });

    const id = parseInt(req.params.id);
    const response = await storage.getAssessmentResponseById(id);
    if (!response) return res.status(404).json({ message: "Not found" });

    const assessment = await storage.getAssessment(response.assessmentId);
    if (!assessment || (assessment.tenantId !== user.tenantId && user.role !== "PLATFORM_ADMIN")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { implementationStatus, maturityLevel, evidenceConfidence, notes } = req.body;
    const updates: any = {};
    if (implementationStatus) updates.implementationStatus = implementationStatus;
    if (maturityLevel !== undefined) updates.maturityLevel = maturityLevel;
    if (evidenceConfidence) updates.evidenceConfidence = evidenceConfidence;
    if (notes !== undefined) updates.notes = notes;
    updates.updatedBy = user.id;

    const updated = await storage.updateAssessmentResponse(id, updates);
    if (!updated) return res.status(404).json({ message: "Not found" });

    await storage.createAuditLog({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "UPDATE",
      entityType: "ASSESSMENT_RESPONSE",
      entityId: String(id),
      details: updates,
    });

    res.json(updated);
  });

  app.get("/api/tasks", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const list = await storage.getTasksByTenant(user.tenantId);
    res.json(list);
  });

  app.post("/api/tasks", requireAuth, requireWriteAccess, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });

    const { title, description, priority, dueDate, controlObjectiveId } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const task = await storage.createTask({
      tenantId: user.tenantId,
      title,
      description: description || null,
      priority: priority || "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "TODO",
      ownerUserId: user.id,
      controlObjectiveId: controlObjectiveId || null,
    });

    await storage.createAuditLog({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "CREATE",
      entityType: "TASK",
      entityId: String(task.id),
    });

    res.json(task);
  });

  app.patch("/api/tasks/:id", requireAuth, requireWriteAccess, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(401).json({ message: "Unauthorized" });

    const id = parseInt(req.params.id);
    const existingTask = await storage.getTask(id);
    if (!existingTask || (existingTask.tenantId !== user.tenantId && user.role !== "PLATFORM_ADMIN")) {
      return res.status(404).json({ message: "Not found" });
    }

    const updated = await storage.updateTask(id, req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });

    await storage.createAuditLog({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "UPDATE",
      entityType: "TASK",
      entityId: String(id),
    });

    res.json(updated);
  });

  app.get("/api/evidence", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const list = await storage.getEvidenceByTenant(user.tenantId);
    res.json(list);
  });

  app.post("/api/evidence/upload", requireAuth, requireWriteAccess, upload.single("file"), async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });

      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file provided" });

      const { relatedType, relatedId } = req.body;
      if (!relatedType || !relatedId) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ message: "relatedType and relatedId are required" });
      }

      const fileBuffer = fs.readFileSync(file.path);
      const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");

      const evidenceItem = await storage.createEvidenceItem({
        tenantId: user.tenantId,
        relatedType,
        relatedId: parseInt(relatedId),
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: user.id,
      });

      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "UPLOAD",
        entityType: "EVIDENCE",
        entityId: String(evidenceItem.id),
        details: { filename: file.originalname, sha256, size: file.size },
      });

      res.json(evidenceItem);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/evidence/:id/download", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(401).json({ message: "Unauthorized" });

    res.status(501).json({ message: "File download requires object storage configuration" });
  });

  app.get("/api/incidents", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const list = await storage.getIncidentsByTenant(user.tenantId);
    res.json(list);
  });

  app.post("/api/incidents", requireAuth, requireWriteAccess, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });

    const { title, description, severity, isSignificant } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const detectedAt = new Date();
    const incidentData: any = {
      tenantId: user.tenantId,
      title,
      description: description || null,
      severity: severity || "MEDIUM",
      isSignificant: isSignificant || false,
      detectedAt,
      status: "DETECTED",
      createdBy: user.id,
    };

    if (isSignificant) {
      incidentData.earlyWarningDueAt = new Date(detectedAt.getTime() + 24 * 60 * 60 * 1000);
      incidentData.notificationDueAt = new Date(detectedAt.getTime() + 72 * 60 * 60 * 1000);
      incidentData.finalReportDueAt = new Date(detectedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const incident = await storage.createIncidentCase(incidentData);

    await storage.createAuditLog({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "CREATE",
      entityType: "INCIDENT",
      entityId: String(incident.id),
    });

    res.json(incident);
  });

  app.patch("/api/incidents/:id", requireAuth, requireWriteAccess, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(401).json({ message: "Unauthorized" });

    const id = parseInt(req.params.id);
    const existing = await storage.getIncidentCase(id);
    if (!existing || (existing.tenantId !== user.tenantId && user.role !== "PLATFORM_ADMIN")) {
      return res.status(404).json({ message: "Not found" });
    }

    const updated = await storage.updateIncidentCase(id, req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });

    await storage.createAuditLog({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "UPDATE",
      entityType: "INCIDENT",
      entityId: String(id),
    });

    res.json(updated);
  });

  app.get("/api/suppliers", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const list = await storage.getSuppliersByTenant(user.tenantId);
    res.json(list);
  });

  app.post("/api/suppliers", requireAuth, requireWriteAccess, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });

    const { name, criticality, services, notes } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const supplier = await storage.createSupplier({
      tenantId: user.tenantId,
      name,
      criticality: criticality || "medium",
      services: services || null,
      notes: notes || null,
    });

    await storage.createAuditLog({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "CREATE",
      entityType: "SUPPLIER",
      entityId: String(supplier.id),
    });

    res.json(supplier);
  });

  app.get("/api/risks", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const list = await storage.getRisksByTenant(user.tenantId);
    res.json(list);
  });

  app.post("/api/risks", requireAuth, requireWriteAccess, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });

    const { title, likelihood, impact, treatment } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const risk = await storage.createRiskItem({
      tenantId: user.tenantId,
      title,
      likelihood: likelihood || 3,
      impact: impact || 3,
      treatment: treatment || "MITIGATE",
      ownerUserId: user.id,
      status: "IDENTIFIED",
    });

    await storage.createAuditLog({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "CREATE",
      entityType: "RISK",
      entityId: String(risk.id),
    });

    res.json(risk);
  });

  app.get("/api/incidents/:id/notifications", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(401).json({ message: "Unauthorized" });

    const incidentId = parseInt(req.params.id);
    const incident = await storage.getIncidentCase(incidentId);
    if (!incident || (incident.tenantId !== user.tenantId && user.role !== "PLATFORM_ADMIN")) {
      return res.status(404).json({ message: "Not found" });
    }

    const notifications = await storage.getIncidentNotifications(incidentId);
    res.json(notifications);
  });

  app.post("/api/incidents/:id/notifications", requireAuth, requireWriteAccess, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(401).json({ message: "Unauthorized" });

    const incidentId = parseInt(req.params.id);
    const incident = await storage.getIncidentCase(incidentId);
    if (!incident || (incident.tenantId !== user.tenantId && user.role !== "PLATFORM_ADMIN")) {
      return res.status(404).json({ message: "Not found" });
    }

    const { type, channel, content } = req.body;
    const notification = await storage.createIncidentNotification({
      incidentId,
      type,
      channel: channel || null,
      content: content || null,
      preparedAt: new Date(),
    });

    await storage.createAuditLog({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "CREATE",
      entityType: "INCIDENT_NOTIFICATION",
      entityId: String(notification.id),
    });

    res.json(notification);
  });

  app.get("/api/admin/csv-export", requirePlatformAdmin, async (req, res) => {
    const data = await storage.getAdminDashboardData();
    const rows = [
      ["Tenant", "Sector", "Compliance Score %", "Tasks", "Users"],
      ...data.tenantSummaries.map((t: any) => [t.name, t.sector, t.complianceScore, t.taskCount, t.userCount]),
    ];
    const csv = rows.map((r: any[]) => r.join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=nis2-platform-export.csv");
    res.send(csv);
  });

  app.get("/api/admin/dashboard", requirePlatformAdmin, async (req, res) => {
    const data = await storage.getAdminDashboardData();
    res.json(data);
  });

  app.get("/api/admin/tenants", requirePlatformAdmin, async (req, res) => {
    const allTenants = await storage.getAllTenants();
    const result = await Promise.all(
      allTenants.map(async (t) => {
        const users = await storage.getUsersByTenant(t.id);
        const dashData = await storage.getDashboardData(t.id);
        return {
          ...t,
          userCount: users.length,
          complianceScore: dashData.complianceScore,
        };
      })
    );
    res.json(result);
  });

  app.get("/api/admin/requirements", requirePlatformAdmin, async (req, res) => {
    const data = await storage.getRequirementsWithControls();
    res.json(data);
  });

  app.get("/api/admin/audit-logs", requirePlatformAdmin, async (req, res) => {
    const logs = await storage.getAuditLogs(200);
    res.json(logs);
  });

  return httpServer;
}
