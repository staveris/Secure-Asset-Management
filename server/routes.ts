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
import { NIS2_SECTORS, NIS2_APPLICABILITY_FLAGS, EU_COUNTRIES, OTHER_COUNTRIES, NIS2_DOMAINS } from "./nis2-sectors";
import { generateVerificationToken, getVerificationExpiry, sendVerificationEmail } from "./email";
import { platformSettings } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
        sectorGroup: "ANNEX_I",
        sector: "general",
        subsector: null,
        entityType: "essential",
        country: null,
        applicabilityProfile: null,
      });

      const verificationToken = generateVerificationToken();
      const verificationExpires = getVerificationExpiry();

      const user = await storage.createUser({
        tenantId: tenant.id,
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: "TENANT_ADMIN",
        isActive: true,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      });

      await storage.createAuditLog({
        tenantId: tenant.id,
        actorUserId: user.id,
        action: "REGISTER",
        entityType: "USER",
        entityId: String(user.id),
      });

      const emailSent = await sendVerificationEmail(data.email, data.fullName, verificationToken);

      req.session.userId = user.id;
      res.json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        emailVerified: false,
        emailSent,
        requiresVerification: true,
      });
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

      const tenant = user.tenantId ? await storage.getTenant(user.tenantId) : null;
      if (tenant && (tenant as any).status === "suspended" && user.role !== "PLATFORM_ADMIN") {
        return res.status(403).json({ message: "Your organization's access has been suspended. Please contact your administrator." });
      }

      await storage.updateUserLastLogin(user.id);
      req.session.userId = user.id;
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

  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Verification token is required" });
      }

      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      if (user.emailVerificationExpires && new Date(user.emailVerificationExpires) < new Date()) {
        return res.status(400).json({ message: "Verification link has expired. Please request a new one." });
      }

      await storage.verifyUserEmail(user.id);

      await storage.createAuditLog({
        tenantId: user.tenantId!,
        actorUserId: user.id,
        action: "EMAIL_VERIFIED",
        entityType: "USER",
        entityId: String(user.id),
      });

      res.json({ message: "Email verified successfully", verified: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/resend-verification", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      if (user.emailVerified) {
        return res.json({ message: "Email is already verified" });
      }

      const newToken = generateVerificationToken();
      const newExpiry = getVerificationExpiry();
      await storage.updateUserVerificationToken(user.id, newToken, newExpiry);

      const emailSent = await sendVerificationEmail(user.email, user.fullName, newToken);
      res.json({ message: "Verification email sent", emailSent });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.patch("/api/auth/password", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.id, newHash);

      res.json({ message: "Password updated successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const { fullName, email } = req.body;
      const updates: any = {};
      if (fullName !== undefined && fullName.trim()) updates.fullName = fullName.trim();
      if (email !== undefined && email.trim()) {
        const existing = await storage.getUserByEmail(email.trim());
        if (existing && existing.id !== user.id) {
          return res.status(400).json({ message: "Email is already in use" });
        }
        updates.email = email.trim();
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No changes provided" });
      }

      await storage.updateUserProfile(user.id, updates);
      res.json({ message: "Profile updated successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
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
      tenantSector: tenant?.sector || null,
      tenantSectorGroup: tenant?.sectorGroup || null,
      tenantSubsector: tenant?.subsector || null,
      tenantEntityType: tenant?.entityType || null,
      tenantCountry: tenant?.country || null,
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

    const enriched = await Promise.all(list.map(async (a) => {
      const responses = await storage.getAssessmentResponses(a.id);
      const total = responses.length;
      const implemented = responses.filter(r => r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED").length;
      const inProgress = responses.filter(r => r.implementationStatus === "IN_PROGRESS").length;
      const completionPct = total > 0 ? Math.round((implemented / total) * 100) : 0;
      const maturityAvg = total > 0 ? parseFloat((responses.reduce((sum, r) => sum + r.maturityLevel, 0) / total).toFixed(1)) : 0;
      return { ...a, totalControls: total, implementedControls: implemented, inProgressControls: inProgress, completionPct, maturityAvg };
    }));

    res.json(enriched);
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
        domain: (control as any)?.domain || "Governance",
        weight: (control as any)?.weight || 1,
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

  app.delete("/api/evidence/:id", requireAuth, requireWriteAccess, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user || !user.tenantId) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      const evidence = await storage.getEvidenceByTenant(user.tenantId);
      const item = evidence.find(e => e.id === id);
      if (!item) return res.status(404).json({ message: "Evidence not found" });
      if ((item as any).lockedAt) {
        return res.status(403).json({ message: "Cannot delete locked evidence. Request an unlock first." });
      }
      await storage.deleteEvidenceItem(id);
      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "DELETE",
        entityType: "EVIDENCE",
        entityId: String(id),
        details: { filename: item.filename },
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/evidence/linkable-entities", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
      const [assessments, tasks, incidents, controls] = await Promise.all([
        storage.getAssessmentsByTenant(user.tenantId),
        storage.getTasksByTenant(user.tenantId),
        storage.getIncidentsByTenant(user.tenantId),
        storage.getControlsByTenant(user.tenantId),
      ]);
      res.json({
        assessments: assessments.map(a => ({ id: a.id, label: a.name })),
        tasks: tasks.map(t => ({ id: t.id, label: t.title })),
        incidents: incidents.map(i => ({ id: i.id, label: i.title })),
        controls: controls.map(c => ({ id: c.id, label: c.title })),
      });
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

  const createTenantSchema = z.object({
    name: z.string().min(1, "Name is required"),
    sector: z.string().min(1, "Sector is required"),
    entityType: z.enum(["essential", "important"]).default("essential"),
    country: z.string().nullable().optional(),
    sectorGroup: z.enum(["ANNEX_I", "ANNEX_II"]).default("ANNEX_I"),
  });

  app.post("/api/admin/tenants", requirePlatformAdmin, async (req, res) => {
    try {
      const data = createTenantSchema.parse(req.body);
      const tenant = await storage.createTenant({
        name: data.name,
        sector: data.sector,
        entityType: data.entityType,
        country: data.country || null,
        sectorGroup: data.sectorGroup,
        status: "active",
      });
      res.json(tenant);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message || "Validation error" });
      }
      res.status(500).json({ message: err.message });
    }
  });

  const tenantStatusSchema = z.object({
    status: z.enum(["active", "suspended"]),
  });

  app.patch("/api/admin/tenants/:id/status", requirePlatformAdmin, async (req, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      const { status } = tenantStatusSchema.parse(req.body);
      const tenant = await storage.updateTenant(tenantId, { status } as any);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      res.json(tenant);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message || "Validation error" });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/tenants/:id", requirePlatformAdmin, async (req, res) => {
    const tenantId = parseInt(req.params.id);
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    await storage.deleteTenant(tenantId);
    res.json({ message: "Tenant deleted successfully" });
  });

  app.get("/api/admin/requirements", requirePlatformAdmin, async (req, res) => {
    const data = await storage.getRequirementsWithControls();
    res.json(data);
  });

  app.get("/api/admin/audit-logs", requirePlatformAdmin, async (req, res) => {
    const logs = await storage.getAuditLogs(200);
    res.json(logs);
  });

  app.get("/api/admin/email-settings", requirePlatformAdmin, async (req, res) => {
    try {
      const [settings] = await db.select().from(platformSettings).where(eq(platformSettings.key, "email_config"));
      if (!settings) {
        return res.json({ provider: null, fromAddress: null, configured: false });
      }
      const config = JSON.parse(settings.value);
      res.json({ ...config, configured: !!config.provider });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/admin/email-settings", requirePlatformAdmin, async (req, res) => {
    try {
      const { provider, apiKey, fromAddress } = req.body;
      const config = JSON.stringify({ provider, apiKey, fromAddress });
      const existing = await db.select().from(platformSettings).where(eq(platformSettings.key, "email_config"));
      if (existing.length > 0) {
        await db.update(platformSettings).set({ value: config }).where(eq(platformSettings.key, "email_config"));
      } else {
        await db.insert(platformSettings).values({ key: "email_config", value: config });
      }
      res.json({ message: "Email settings saved", configured: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/analytics", requirePlatformAdmin, async (req, res) => {
    try {
      const allTenants = await storage.getAllTenants();
      const sectorBreakdown: Record<string, number> = {};
      const countryBreakdown: Record<string, number> = {};
      const entityTypeBreakdown: Record<string, number> = {};
      const sectorGroupBreakdown: Record<string, number> = {};

      for (const t of allTenants) {
        const sector = t.sector || "Unclassified";
        sectorBreakdown[sector] = (sectorBreakdown[sector] || 0) + 1;

        const country = (t as any).country || "Not specified";
        countryBreakdown[country] = (countryBreakdown[country] || 0) + 1;

        const entityType = t.entityType || "Not specified";
        entityTypeBreakdown[entityType] = (entityTypeBreakdown[entityType] || 0) + 1;

        const sectorGroup = (t as any).sectorGroup || "Not specified";
        sectorGroupBreakdown[sectorGroup] = (sectorGroupBreakdown[sectorGroup] || 0) + 1;
      }

      const tenantDetails = await Promise.all(
        allTenants.map(async (t) => {
          const dashData = await storage.getDashboardData(t.id);
          const usersCount = (await storage.getUsersByTenant(t.id)).length;
          return {
            id: t.id,
            name: t.name,
            sector: t.sector,
            country: (t as any).country,
            entityType: t.entityType,
            sectorGroup: (t as any).sectorGroup,
            status: (t as any).status || "active",
            complianceScore: dashData.complianceScore,
            userCount: usersCount,
          };
        })
      );

      res.json({
        totalTenants: allTenants.length,
        sectorBreakdown,
        countryBreakdown,
        entityTypeBreakdown,
        sectorGroupBreakdown,
        tenantDetails,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/nis2/sectors", (_req, res) => {
    res.json({
      sectors: NIS2_SECTORS,
      flags: NIS2_APPLICABILITY_FLAGS,
      euCountries: [...EU_COUNTRIES],
      otherCountries: [...OTHER_COUNTRIES],
      countries: [...EU_COUNTRIES, ...OTHER_COUNTRIES],
      domains: NIS2_DOMAINS,
    });
  });

  app.patch("/api/tenant/profile", requireAuth, requireWriteAccess, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
      if (user.role !== "TENANT_ADMIN" && user.role !== "PLATFORM_ADMIN") {
        return res.status(403).json({ message: "Only tenant admins can update profile" });
      }

      const { sectorGroup, sector, subsector, entityType, country, applicabilityProfile } = req.body;
      const updates: any = {};
      if (sectorGroup !== undefined) updates.sectorGroup = sectorGroup;
      if (sector !== undefined) updates.sector = sector;
      if (subsector !== undefined) updates.subsector = subsector;
      if (entityType !== undefined) updates.entityType = entityType;
      if (country !== undefined) updates.country = country;
      if (applicabilityProfile !== undefined) updates.applicabilityProfile = applicabilityProfile;

      const updated = await storage.updateTenant(user.tenantId, updates);
      if (!updated) return res.status(404).json({ message: "Tenant not found" });

      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "UPDATE_PROFILE",
        entityType: "TENANT",
        entityId: String(user.tenantId),
        details: updates,
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/tenant/users", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const tenantUsers = await storage.getUsersByTenant(user.tenantId);
    res.json(tenantUsers.map(u => ({
      id: u.id, email: u.email, fullName: u.fullName, role: u.role, isActive: u.isActive, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
    })));
  });

  app.patch("/api/tenant/users/:id", requireAuth, requireWriteAccess, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
      if (user.role !== "TENANT_ADMIN" && user.role !== "PLATFORM_ADMIN") {
        return res.status(403).json({ message: "Only tenant admins can manage users" });
      }

      const targetId = parseInt(req.params.id);
      const targetUser = await storage.getUser(targetId);
      if (!targetUser || targetUser.tenantId !== user.tenantId) {
        return res.status(404).json({ message: "User not found" });
      }

      const { role, isActive, fullName } = req.body;
      const updates: any = {};
      if (role !== undefined) updates.role = role;
      if (isActive !== undefined) updates.isActive = isActive;
      if (fullName !== undefined) updates.fullName = fullName;

      const updated = await storage.updateUser(targetId, updates);

      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "UPDATE_USER",
        entityType: "USER",
        entityId: String(targetId),
        details: updates,
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/tenant/invite", requireAuth, requireWriteAccess, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
      if (user.role !== "TENANT_ADMIN" && user.role !== "PLATFORM_ADMIN") {
        return res.status(403).json({ message: "Only tenant admins can invite users" });
      }

      const { email, role } = req.body;
      if (!email) return res.status(400).json({ message: "Email required" });

      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ message: "User already exists" });

      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const invite = await storage.createInviteToken({
        tenantId: user.tenantId,
        email,
        role: role || "TENANT_USER",
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: user.id,
      });

      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "INVITE_USER",
        entityType: "INVITE",
        entityId: String(invite.id),
        details: { email, role },
      });

      res.json({ invite, inviteLink: `/invite/${token}` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/evidence/:id/lock", requireAuth, requireWriteAccess, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });

      const id = parseInt(req.params.id);
      const evidence = await storage.getEvidenceByTenant(user.tenantId);
      const item = evidence.find(e => e.id === id);
      if (!item) return res.status(404).json({ message: "Evidence not found" });
      if (item.lockedAt) return res.status(400).json({ message: "Already locked" });

      const reason = req.body.reason || "Locked for verification";
      const locked = await storage.lockEvidence(id, user.id, reason);

      await storage.createEvidenceAccessLog({
        evidenceId: id,
        actorUserId: user.id,
        action: "LOCK",
        ip: req.ip || null,
      });

      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "LOCK",
        entityType: "EVIDENCE",
        entityId: String(id),
        details: { reason },
      });

      res.json(locked);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/evidence/:id/unlock-request", requireAuth, requireWriteAccess, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });

      const id = parseInt(req.params.id);
      const { reason } = req.body;
      if (!reason) return res.status(400).json({ message: "Reason required" });

      const request = await storage.createEvidenceUnlockRequest({
        evidenceId: id,
        tenantId: user.tenantId,
        requestedBy: user.id,
        reason,
        status: "PENDING",
      });

      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "UNLOCK_REQUEST",
        entityType: "EVIDENCE",
        entityId: String(id),
        details: { reason },
      });

      res.json(request);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/evidence/unlock-requests/:id/approve", requireAuth, requireWriteAccess, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
      if (user.role !== "TENANT_ADMIN" && user.role !== "PLATFORM_ADMIN") {
        return res.status(403).json({ message: "Only admins can approve unlock requests" });
      }

      const requestId = parseInt(req.params.id);
      const updated = await storage.updateEvidenceUnlockRequest(requestId, {
        status: "APPROVED",
        approvedBy: user.id,
      });

      if (updated) {
        await storage.unlockEvidence(updated.evidenceId);
        await storage.createEvidenceAccessLog({
          evidenceId: updated.evidenceId,
          actorUserId: user.id,
          action: "UNLOCK",
          ip: req.ip || null,
        });
      }

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/evidence/unlock-requests", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const requests = await storage.getEvidenceUnlockRequests(user.tenantId);
    res.json(requests);
  });

  app.get("/api/sector-packs", requireAuth, async (req, res) => {
    const packs = await storage.getAllSectorPacks();
    res.json(packs);
  });

  app.get("/api/assessment-history", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });

    const allAssessments = await storage.getAssessmentsByTenant(user.tenantId);
    const sorted = allAssessments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const controls = await storage.getAllControlObjectives();
    const reqs = await storage.getAllRequirements();
    const controlDomainMap = new Map<number, string>();
    for (const c of controls) {
      const req = reqs.find(rq => rq.id === c.requirementId);
      const domain = (c as any)?.domain || req?.category || "Other";
      controlDomainMap.set(c.id, domain);
    }

    const history = await Promise.all(sorted.map(async (a) => {
      const responses = await storage.getAssessmentResponses(a.id);
      const total = responses.length;
      const implemented = responses.filter(r => r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED").length;
      const verified = responses.filter(r => r.implementationStatus === "VERIFIED").length;
      const completionPct = total > 0 ? Math.round((implemented / total) * 100) : 0;
      const maturityAvg = total > 0 ? parseFloat((responses.reduce((sum, r) => sum + r.maturityLevel, 0) / total).toFixed(2)) : 0;
      const maturityByDomain: Record<string, { sum: number; count: number }> = {};
      for (const r of responses) {
        const domain = controlDomainMap.get(r.controlObjectiveId) || "Other";
        if (!maturityByDomain[domain]) maturityByDomain[domain] = { sum: 0, count: 0 };
        maturityByDomain[domain].sum += r.maturityLevel;
        maturityByDomain[domain].count++;
      }
      const domainScores = Object.entries(maturityByDomain).map(([domain, d]) => ({
        domain,
        maturityAvg: parseFloat((d.sum / d.count).toFixed(2)),
      }));
      return {
        id: a.id,
        name: a.name,
        date: a.createdAt,
        status: a.status,
        completionPct,
        maturityAvg,
        verifiedPct: total > 0 ? Math.round((verified / total) * 100) : 0,
        totalControls: total,
        implementedControls: implemented,
        domainScores,
      };
    }));

    res.json(history);
  });

  app.get("/api/snapshots", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const snapshots = await storage.getSnapshotsByTenant(user.tenantId, 90);
    res.json(snapshots);
  });

  app.post("/api/snapshots/recompute", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const snapshot = await storage.recomputeTenantSnapshot(user.tenantId);
    res.json(snapshot);
  });

  return httpServer;
}
