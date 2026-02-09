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
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import sanitizeHtml from "sanitize-html";
import { NIS2_SECTORS, NIS2_APPLICABILITY_FLAGS, EU_COUNTRIES, OTHER_COUNTRIES, NIS2_DOMAINS } from "./nis2-sectors";
import { getAppBaseUrl } from "./email";
import { generateVerificationToken, getVerificationExpiry, sendVerificationEmail, sendPasswordResetEmail, sendGenericEmail } from "./email";
import { platformSettings, users, passwordHistory } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

const PgSession = connectPgSimple(session);

const CIR_APPLICABLE_SECTORS = [
  "Digital infrastructure",
  "ICT service management (B2B)",
  "Digital providers",
];

const CIR_SUBSECTOR_MAP: Record<string, string> = {
  "DNS service providers": "DNS",
  "TLD name registries": "TLD",
  "Cloud computing service providers": "CLOUD",
  "Data centre service providers": "DC",
  "Content delivery network providers": "CDN",
  "Trust service providers": "TRUST",
  "Internet Exchange Point providers": "IXP",
  "Providers of public electronic communications networks": "TELCO",
  "Providers of publicly available electronic communications services": "TELCO",
  "Managed service providers": "MSP",
  "Managed security service providers": "MSSP",
  "Online marketplaces": "ONLINE_PLATFORM",
  "Online search engines": "ONLINE_PLATFORM",
  "Social networking services platforms": "ONLINE_PLATFORM",
};

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
const MAX_FILE_SIZE = 100 * 1024 * 1024;

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

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;

declare module "express-session" {
  interface SessionData {
    userId: number;
    csrfToken: string;
    pendingTotpUserId: number;
  }
}

async function destroyUserSessions(userId: number): Promise<void> {
  try {
    await pool.query(
      `DELETE FROM "session" WHERE sess::jsonb->>'userId' = $1`,
      [String(userId)]
    );
  } catch (err) {
    console.error("[Security] Failed to destroy user sessions:", err);
  }
}

function logSecurityEvent(event: string, details: Record<string, any>) {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY] ${timestamp} | ${event} | ${JSON.stringify(details)}`);
}

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "recursiveEscape",
};

function sanitizeString(value: string): string {
  return sanitizeHtml(value, sanitizeOptions).trim();
}

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      if (key === "password" || key === "currentPassword" || key === "newPassword" || key === "confirmPassword" || key === "passwordHash" || key === "code" || key === "token" || key === "secret") {
        cleaned[key] = obj[key];
      } else {
        cleaned[key] = sanitizeObject(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}

const SENSITIVE_FIELDS = new Set([
  "passwordHash", "password_hash",
  "totpSecret", "totp_secret",
  "passwordResetToken", "password_reset_token",
  "passwordResetExpires", "password_reset_expires",
  "emailVerificationToken", "email_verification_token",
  "emailVerificationExpires", "email_verification_expires",
  "csrfToken", "csrf_token",
  "failedLoginAttempts", "failed_login_attempts",
  "lockedUntil", "locked_until",
]);

function stripSensitiveFields(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stripSensitiveFields);
  if (obj instanceof Date || obj instanceof Buffer) return obj;
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    if (SENSITIVE_FIELDS.has(key)) continue;
    cleaned[key] = typeof obj[key] === "object" ? stripSensitiveFields(obj[key]) : obj[key];
  }
  return cleaned;
}

const FILE_MAGIC_BYTES: Record<string, Buffer[]> = {
  "application/pdf": [Buffer.from([0x25, 0x50, 0x44, 0x46])],
  "image/png": [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
  "image/jpeg": [Buffer.from([0xFF, 0xD8, 0xFF])],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [Buffer.from([0x50, 0x4B, 0x03, 0x04])],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [Buffer.from([0x50, 0x4B, 0x03, 0x04])],
};

function validateFileMagicBytes(filePath: string, declaredMimeType: string): boolean {
  const signatures = FILE_MAGIC_BYTES[declaredMimeType];
  if (!signatures) return true;
  try {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(8);
    fs.readSync(fd, buf, 0, 8, 0);
    fs.closeSync(fd);
    return signatures.some(sig => buf.subarray(0, sig.length).equals(sig));
  } catch {
    return false;
  }
}

const PASSWORD_HISTORY_COUNT = 5;

async function checkPasswordHistory(userId: number, newPassword: string): Promise<boolean> {
  const history = await db.select()
    .from(passwordHistory)
    .where(eq(passwordHistory.userId, userId))
    .orderBy(desc(passwordHistory.createdAt))
    .limit(PASSWORD_HISTORY_COUNT);
  for (const entry of history) {
    if (await bcrypt.compare(newPassword, entry.passwordHash)) {
      return false;
    }
  }
  return true;
}

async function addPasswordToHistory(userId: number, hash: string): Promise<void> {
  await db.insert(passwordHistory).values({ userId, passwordHash: hash });
  const all = await db.select({ id: passwordHistory.id })
    .from(passwordHistory)
    .where(eq(passwordHistory.userId, userId))
    .orderBy(desc(passwordHistory.createdAt));
  if (all.length > PASSWORD_HISTORY_COUNT) {
    const toDelete = all.slice(PASSWORD_HISTORY_COUNT);
    for (const entry of toDelete) {
      await db.delete(passwordHistory).where(eq(passwordHistory.id, entry.id));
    }
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

async function requireFullAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
  const user = await storage.getUser(req.session.userId);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (user.role === "PLATFORM_ADMIN") return next();
  if (!user.fullAccessEnabled) {
    return res.status(403).json({ message: "Full access not enabled. Contact your administrator to unlock all features." });
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
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 15 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );

  app.get("/api/auth/csrf-token", (req, res) => {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }
    res.json({ csrfToken: req.session.csrfToken });
  });

  function verifyCsrf(req: Request, res: Response, next: NextFunction) {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      return next();
    }
    if (req.path.startsWith("/auth/login") || req.path.startsWith("/auth/register") || req.path.startsWith("/auth/forgot-password") || req.path.startsWith("/auth/reset-password") || req.path.startsWith("/auth/verify-email") || req.path.startsWith("/auth/resend-verification") || req.path.startsWith("/auth/logout") || req.path.startsWith("/auth/totp-verify")) {
      return next();
    }
    const token = req.headers["x-csrf-token"] as string;
    if (!req.session.csrfToken || !token || token !== req.session.csrfToken) {
      logSecurityEvent("CSRF_VALIDATION_FAILED", { path: req.path, ip: req.ip, userId: req.session.userId || null });
      return res.status(403).json({ message: "Invalid CSRF token" });
    }
    next();
  }

  app.use("/api", verifyCsrf);

  app.use("/api", (req: Request, _res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === "object" && req.method !== "GET" && req.method !== "HEAD") {
      req.body = sanitizeObject(req.body);
    }
    next();
  });

  app.use("/api", (_req: Request, res: Response, next: NextFunction) => {
    const origJson = res.json.bind(res);
    res.json = function(body: any) {
      if (body && typeof body === "object") {
        body = stripSensitiveFields(body);
      }
      return origJson(body);
    };
    next();
  });

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

      await addPasswordToHistory(user.id, passwordHash);

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
      const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";
      const user = await storage.getUserByEmail(data.email);

      if (!user || !user.isActive) {
        logSecurityEvent("LOGIN_FAILED", { email: data.email, reason: "invalid_credentials", ip: clientIp });
        await storage.createAuditLog({
          tenantId: null,
          actorUserId: null,
          action: "LOGIN_FAILED",
          entityType: "AUTH",
          entityId: data.email,
          details: { reason: "invalid_credentials", ip: clientIp },
        });
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const minutesLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
        logSecurityEvent("LOGIN_BLOCKED_LOCKOUT", { email: data.email, ip: clientIp, minutesLeft });
        await storage.createAuditLog({
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: "LOGIN_BLOCKED_LOCKOUT",
          entityType: "AUTH",
          entityId: String(user.id),
          details: { ip: clientIp, minutesLeft },
        });
        return res.status(423).json({ message: `Account temporarily locked due to too many failed login attempts. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.` });
      }

      const valid = await bcrypt.compare(data.password, user.passwordHash);
      if (!valid) {
        const newAttempts = (user.failedLoginAttempts || 0) + 1;
        const updateData: any = { failedLoginAttempts: newAttempts };
        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
          logSecurityEvent("ACCOUNT_LOCKED", { email: data.email, ip: clientIp, attempts: newAttempts });
          await storage.createAuditLog({
            tenantId: user.tenantId,
            actorUserId: user.id,
            action: "ACCOUNT_LOCKED",
            entityType: "AUTH",
            entityId: String(user.id),
            details: { ip: clientIp, attempts: newAttempts, lockedUntilMinutes: 30 },
          });
        }
        await db.update(users).set(updateData).where(eq(users.id, user.id));
        logSecurityEvent("LOGIN_FAILED", { email: data.email, reason: "wrong_password", ip: clientIp, attempts: newAttempts });
        await storage.createAuditLog({
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: "LOGIN_FAILED",
          entityType: "AUTH",
          entityId: String(user.id),
          details: { reason: "wrong_password", ip: clientIp, attempts: newAttempts },
        });
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const tenant = user.tenantId ? await storage.getTenant(user.tenantId) : null;
      if (tenant && (tenant as any).status === "suspended" && user.role !== "PLATFORM_ADMIN") {
        logSecurityEvent("LOGIN_BLOCKED_SUSPENDED", { email: data.email, ip: clientIp, tenantId: user.tenantId });
        await storage.createAuditLog({
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: "LOGIN_BLOCKED_SUSPENDED",
          entityType: "AUTH",
          entityId: String(user.id),
          details: { ip: clientIp },
        });
        return res.status(403).json({ message: "Your organization's access has been suspended. Please contact your administrator." });
      }

      if (user.failedLoginAttempts > 0 || user.lockedUntil) {
        await db.update(users).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
      }

      if (user.totpEnabled && user.totpSecret) {
        req.session.pendingTotpUserId = user.id;
        return res.json({ requireTotp: true });
      }

      await storage.updateUserLastLogin(user.id);
      req.session.csrfToken = crypto.randomBytes(32).toString("hex");
      req.session.userId = user.id;

      logSecurityEvent("LOGIN_SUCCESS", { email: data.email, ip: clientIp, userId: user.id });
      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "LOGIN_SUCCESS",
        entityType: "AUTH",
        entityId: String(user.id),
        details: { ip: clientIp },
      });

      res.json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: tenant?.name || null,
        emailVerified: user.emailVerified,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message || "Validation error" });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/totp-verify", authLimiter, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ message: "Verification code is required" });
      }
      const pendingUserId = req.session.pendingTotpUserId;
      if (!pendingUserId) {
        return res.status(400).json({ message: "No pending 2FA verification. Please log in again." });
      }
      const user = await storage.getUser(pendingUserId);
      if (!user || !user.totpSecret || !user.totpEnabled) {
        return res.status(400).json({ message: "2FA not configured for this account" });
      }
      const totp = new OTPAuth.TOTP({
        issuer: "NIS2 Platform",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret),
      });
      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";
        logSecurityEvent("TOTP_FAILED", { email: user.email, ip: clientIp });
        return res.status(401).json({ message: "Invalid verification code" });
      }
      delete req.session.pendingTotpUserId;
      const tenant = user.tenantId ? await storage.getTenant(user.tenantId) : null;
      await storage.updateUserLastLogin(user.id);
      req.session.csrfToken = crypto.randomBytes(32).toString("hex");
      req.session.userId = user.id;
      const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";
      logSecurityEvent("LOGIN_SUCCESS", { email: user.email, ip: clientIp, userId: user.id, totp: true });
      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "LOGIN_SUCCESS",
        entityType: "AUTH",
        entityId: String(user.id),
        details: { ip: clientIp, totp: true },
      });
      res.json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: tenant?.name || null,
        emailVerified: user.emailVerified,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/totp-setup", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });
      if (user.totpEnabled) return res.status(400).json({ message: "2FA is already enabled" });
      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({
        issuer: "NIS2 Platform",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret,
      });
      const otpauthUrl = totp.toString();
      await db.update(users).set({ totpSecret: secret.base32 }).where(eq(users.id, user.id));
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      res.json({ secret: secret.base32, otpauthUrl, qrCode: qrCodeDataUrl });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/totp-enable", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });
      if (!user.totpSecret) return res.status(400).json({ message: "Please set up 2FA first" });
      const { code } = req.body;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ message: "Verification code is required" });
      }
      const totp = new OTPAuth.TOTP({
        issuer: "NIS2 Platform",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret),
      });
      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        return res.status(400).json({ message: "Invalid verification code. Please try again." });
      }
      await db.update(users).set({ totpEnabled: true }).where(eq(users.id, user.id));
      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "TOTP_ENABLED",
        entityType: "USER",
        entityId: String(user.id),
        details: {},
      });
      res.json({ message: "Two-factor authentication has been enabled" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/totp-disable", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });
      if (!user.totpEnabled) return res.status(400).json({ message: "2FA is not enabled" });
      const { password } = req.body;
      if (!password) return res.status(400).json({ message: "Password is required to disable 2FA" });
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid password" });
      await db.update(users).set({ totpEnabled: false, totpSecret: null }).where(eq(users.id, user.id));
      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "TOTP_DISABLED",
        entityType: "USER",
        entityId: String(user.id),
        details: {},
      });
      res.json({ message: "Two-factor authentication has been disabled" });
    } catch (err: any) {
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

  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      const rawToken = generateVerificationToken();
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      await db.update(users)
        .set({ passwordResetToken: tokenHash, passwordResetExpires: expires })
        .where(eq(users.id, user.id));

      await sendPasswordResetEmail(user.email, user.fullName, rawToken);

      logSecurityEvent("PASSWORD_RESET_REQUESTED", { email: user.email, userId: user.id, ip: req.ip });
      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        entityType: "AUTH",
        entityId: String(user.id),
        details: { ip: req.ip },
      });

      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (err: any) {
      console.error("[Auth] Forgot password error:", err);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        return res.status(400).json({ message: "Password must include uppercase, lowercase, number, and special character" });
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const [user] = await db.select().from(users)
        .where(eq(users.passwordResetToken, tokenHash));

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
      }

      if (user.passwordResetExpires && new Date() > new Date(user.passwordResetExpires)) {
        await db.update(users)
          .set({ passwordResetToken: null, passwordResetExpires: null })
          .where(eq(users.id, user.id));
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }

      const canUse = await checkPasswordHistory(user.id, password);
      if (!canUse) {
        return res.status(400).json({ message: "You cannot reuse any of your last 5 passwords. Please choose a different password." });
      }

      const newHash = await bcrypt.hash(password, 10);
      await db.update(users)
        .set({ passwordHash: newHash, passwordResetToken: null, passwordResetExpires: null, failedLoginAttempts: 0, lockedUntil: null })
        .where(eq(users.id, user.id));
      await addPasswordToHistory(user.id, newHash);

      await destroyUserSessions(user.id);

      logSecurityEvent("PASSWORD_RESET", { userId: user.id, email: user.email, ip: req.ip });
      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "PASSWORD_RESET",
        entityType: "AUTH",
        entityId: String(user.id),
        details: { method: "reset_link", ip: req.ip },
      });

      res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (err: any) {
      console.error("[Auth] Reset password error:", err);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.patch("/api/auth/password", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
        return res.status(400).json({ message: "Password must include uppercase, lowercase, number, and special character" });
      }

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const canUse = await checkPasswordHistory(user.id, newPassword);
      if (!canUse) {
        return res.status(400).json({ message: "You cannot reuse any of your last 5 passwords. Please choose a different password." });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.id, newHash);
      await addPasswordToHistory(user.id, newHash);

      const currentSessionId = req.sessionID;
      await destroyUserSessions(user.id);

      logSecurityEvent("PASSWORD_CHANGED", { userId: user.id, email: user.email, ip: req.ip });
      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "PASSWORD_CHANGED",
        entityType: "AUTH",
        entityId: String(user.id),
        details: { method: "user_initiated", ip: req.ip },
      });

      req.session.regenerate((err) => {
        if (err) {
          console.error("[Security] Session regenerate error:", err);
          return res.json({ message: "Password updated successfully. Please log in again." });
        }
        req.session.userId = user.id;
        req.session.csrfToken = crypto.randomBytes(32).toString("hex");
        req.session.save((saveErr) => {
          if (saveErr) console.error("[Security] Session save error:", saveErr);
          res.json({ message: "Password updated successfully. All other sessions have been signed out." });
        });
      });
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
      fullAccessEnabled: user.fullAccessEnabled,
      emailVerified: user.emailVerified,
      totpEnabled: user.totpEnabled,
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

      const linkedCir = await storage.getAtomicAssessmentByParent(a.id);
      let cirInfo = null;
      if (linkedCir) {
        const cirResponses = await storage.getAtomicAssessmentResponses(linkedCir.id);
        const cirTotal = cirResponses.length;
        const cirAnswered = cirResponses.filter(r => r.implementationStatus !== "NOT_STARTED").length;
        const cirImplemented = cirResponses.filter(r => r.implementationStatus === "IMPLEMENTED" || r.implementationStatus === "VERIFIED").length;
        cirInfo = {
          id: linkedCir.id,
          totalControls: cirTotal,
          answeredControls: cirAnswered,
          implementedControls: cirImplemented,
          completionPct: cirTotal > 0 ? Math.round((cirImplemented / cirTotal) * 100) : 0,
          maturityAvg: cirTotal > 0 ? parseFloat((cirResponses.reduce((sum, r) => sum + r.maturityLevel, 0) / cirTotal).toFixed(1)) : 0,
        };
      }

      return { ...a, totalControls: total, implementedControls: implemented, inProgressControls: inProgress, completionPct, maturityAvg, cirInfo };
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

      const tenant = await storage.getTenant(user.tenantId);
      let cirAssessmentId: number | null = null;
      let cirControlCount = 0;
      const tenantSubsector = tenant?.subsector || null;
      const tenantCirCode = tenantSubsector ? CIR_SUBSECTOR_MAP[tenantSubsector] || null : null;
      if (tenant && tenant.sector && CIR_APPLICABLE_SECTORS.some(s => s.toLowerCase() === tenant.sector!.toLowerCase()) && tenantCirCode) {
        const cirControls = await storage.getAtomicControlsBySource("CIR_2024_2690");
        const activeControls = cirControls.filter((c: any) => {
          if (c.isActive === false) return false;
          try {
            const applicability = typeof c.applicability === 'string' ? JSON.parse(c.applicability) : c.applicability;
            const entities: string[] = applicability?.entities || applicability?.tags || [];
            return entities.includes(tenantCirCode!) || entities.includes("ALL");
          } catch {
            return true;
          }
        });
        if (activeControls.length > 0) {
          const cirAssessment = await storage.createAtomicAssessment({
            tenantId: user.tenantId,
            name: `${name}`,
            scope: scope || null,
            createdBy: user.id,
            status: "DRAFT",
            parentAssessmentId: assessment.id,
          });
          cirAssessmentId = cirAssessment.id;
          cirControlCount = activeControls.length;
          for (const control of activeControls) {
            await storage.createAtomicAssessmentResponse({
              atomicAssessmentId: cirAssessment.id,
              atomicControlId: control.id,
              implementationStatus: "NOT_STARTED",
              maturityLevel: 0,
              confidence: "NONE",
              notes: null,
              answeredBy: user.id,
            });
          }
          await storage.createAuditLog({
            tenantId: user.tenantId,
            actorUserId: user.id,
            action: "CREATE",
            entityType: "ATOMIC_ASSESSMENT",
            entityId: String(cirAssessment.id),
            details: { name, parentAssessmentId: assessment.id, cirControls: activeControls.length },
          });
        }
      }

      const incompleteTasks = await storage.getIncompleteTasksByTenant(user.tenantId);
      let carriedOver = 0;
      for (const task of incompleteTasks) {
        if (task.assessmentId && task.assessmentId !== assessment.id) {
          await storage.updateTask(task.id, { assessmentId: assessment.id });
          carriedOver++;
        }
      }

      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "CREATE",
        entityType: "ASSESSMENT",
        entityId: String(assessment.id),
        details: { carriedOverTasks: carriedOver, cirAssessmentId, cirControlCount },
      });

      res.json({ ...assessment, carriedOverTasks: carriedOver, cirAssessmentId, cirControlCount });
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
        source: "NIS2" as const,
      };
    });

    const assessmentTasks = await storage.getTasksByAssessment(id);

    let cirInfo: any = null;
    const linkedAtomic = await storage.getAtomicAssessmentByParent(id);
    if (linkedAtomic) {
      const atomicResponses = await storage.getAtomicAssessmentResponses(linkedAtomic.id);
      const allAtomicControls = await storage.getAllAtomicControls();
      const atomicControlMap = new Map(allAtomicControls.map(c => [c.id, c]));

      const cirResponses = atomicResponses.map((r) => {
        const ctrl = atomicControlMap.get(r.atomicControlId);
        return {
          id: r.id,
          atomicControlId: r.atomicControlId,
          atomicAssessmentId: linkedAtomic.id,
          controlTitle: ctrl?.shortTitle || "",
          controlDescription: ctrl?.obligationText || "",
          requirementCode: ctrl?.controlId || "",
          requirementTitle: ctrl?.domain || "",
          category: ctrl?.domain || "CIR 2024/2690",
          domain: ctrl?.domain || "CIR 2024/2690",
          weight: ctrl?.weight || 1,
          implementationStatus: r.implementationStatus,
          maturityLevel: r.maturityLevel,
          evidenceConfidence: r.confidence,
          notes: r.notes,
          guidance: null,
          source: "CIR" as const,
        };
      });

      cirInfo = {
        atomicAssessmentId: linkedAtomic.id,
        responses: cirResponses,
      };
    }

    res.json({
      id: assessment!.id,
      name: assessment!.name,
      scope: assessment!.scope,
      status: assessment!.status,
      createdAt: assessment!.createdAt,
      responses: enrichedResponses,
      tasks: assessmentTasks,
      cirInfo,
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

  app.delete("/api/assessments/:id", requireAuth, requireWriteAccess, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
      const id = parseInt(req.params.id);
      const assessment = await storage.getAssessment(id);
      if (!assessment) return res.status(404).json({ message: "Not found" });
      if (assessment.tenantId !== user.tenantId && user.role !== "PLATFORM_ADMIN") {
        return res.status(403).json({ message: "Access denied" });
      }
      const linkedCir = await storage.getAtomicAssessmentByParent(id);
      if (linkedCir) {
        await storage.deleteAtomicAssessment(linkedCir.id);
        await storage.createAuditLog({
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: "DELETE",
          entityType: "ATOMIC_ASSESSMENT",
          entityId: String(linkedCir.id),
          details: { name: linkedCir.name, parentAssessmentId: id },
        });
      }
      await storage.deleteAssessment(id);
      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "DELETE",
        entityType: "ASSESSMENT",
        entityId: String(id),
        details: { name: assessment.name },
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/control-objectives", requireAuth, async (req, res) => {
    try {
      const controls = await storage.getAllControlObjectives();
      const reqs = await storage.getAllRequirements();
      const enriched = controls.map((c) => {
        const req = reqs.find((r) => r.id === c.requirementId);
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          requirementId: c.requirementId,
          requirementCode: req?.code || "",
          requirementTitle: req?.title || "",
          category: req?.category || "Uncategorized",
        };
      });
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/tasks", requireAuth, requireFullAccess, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const list = await storage.getTasksByTenant(user.tenantId);
    const controls = await storage.getAllControlObjectives();
    const reqs = await storage.getAllRequirements();
    const assessments = await storage.getAssessmentsByTenant(user.tenantId);
    const enriched = list.map((t) => {
      const control = t.controlObjectiveId ? controls.find((c) => c.id === t.controlObjectiveId) : null;
      const req = control ? reqs.find((r) => r.id === control.requirementId) : null;
      const assessment = t.assessmentId ? assessments.find((a) => a.id === t.assessmentId) : null;
      return {
        ...t,
        controlTitle: control?.title || null,
        requirementCode: req?.code || null,
        category: req?.category || null,
        assessmentName: assessment?.name || null,
      };
    });
    res.json(enriched);
  });

  app.post("/api/tasks", requireAuth, requireWriteAccess, requireFullAccess, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });

    const { title, description, priority, dueDate, controlObjectiveId, assessmentId } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });
    if (!controlObjectiveId) return res.status(400).json({ message: "Control objective is required" });
    if (!assessmentId) return res.status(400).json({ message: "Assessment is required" });

    const assessment = await storage.getAssessment(assessmentId);
    if (!assessment || assessment.tenantId !== user.tenantId) {
      return res.status(400).json({ message: "Invalid assessment" });
    }

    const task = await storage.createTask({
      tenantId: user.tenantId,
      title,
      description: description || null,
      priority: priority || "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "TODO",
      ownerUserId: user.id,
      controlObjectiveId,
      assessmentId,
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

  app.patch("/api/tasks/:id", requireAuth, requireWriteAccess, requireFullAccess, async (req, res) => {
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

  app.get("/api/evidence", requireAuth, requireFullAccess, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const list = await storage.getEvidenceByTenant(user.tenantId);
    res.json(list);
  });

  app.post("/api/evidence/upload", requireAuth, requireWriteAccess, requireFullAccess, upload.single("file"), async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });

      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file provided" });

      if (!validateFileMagicBytes(file.path, file.mimetype)) {
        fs.unlinkSync(file.path);
        logSecurityEvent("FILE_UPLOAD_MAGIC_MISMATCH", { userId: user.id, declaredType: file.mimetype, filename: file.originalname, ip: req.ip });
        return res.status(400).json({ message: "File content does not match its declared type. Upload rejected for security." });
      }

      const tenant = await storage.getTenant(user.tenantId);
      if (!tenant) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ message: "Tenant not found" });
      }

      if (file.size > tenant.maxFileSizeBytes) {
        fs.unlinkSync(file.path);
        const maxMB = (tenant.maxFileSizeBytes / (1024 * 1024)).toFixed(0);
        return res.status(413).json({ message: `File exceeds maximum size of ${maxMB} MB per file` });
      }

      if (tenant.storageUsedBytes + file.size > tenant.storageQuotaBytes) {
        fs.unlinkSync(file.path);
        const quotaGB = (tenant.storageQuotaBytes / (1024 * 1024 * 1024)).toFixed(1);
        return res.status(413).json({ message: `Upload would exceed your storage quota of ${quotaGB} GB. Free up space or contact your administrator.` });
      }

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

      await storage.recalculateTenantStorageUsed(user.tenantId);

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

  app.delete("/api/evidence/:id", requireAuth, requireWriteAccess, requireFullAccess, async (req, res) => {
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
      await storage.recalculateTenantStorageUsed(user.tenantId);
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

  app.get("/api/incidents", requireAuth, requireFullAccess, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const list = await storage.getIncidentsByTenant(user.tenantId);
    res.json(list);
  });

  app.post("/api/incidents", requireAuth, requireWriteAccess, requireFullAccess, async (req, res) => {
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

  app.patch("/api/incidents/:id", requireAuth, requireWriteAccess, requireFullAccess, async (req, res) => {
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

  app.get("/api/suppliers", requireAuth, requireFullAccess, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const list = await storage.getSuppliersByTenant(user.tenantId);
    res.json(list);
  });

  app.post("/api/suppliers", requireAuth, requireWriteAccess, requireFullAccess, async (req, res) => {
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

  app.get("/api/risks", requireAuth, requireFullAccess, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const list = await storage.getRisksByTenant(user.tenantId);
    res.json(list);
  });

  app.post("/api/risks", requireAuth, requireWriteAccess, requireFullAccess, async (req, res) => {
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

  app.get("/api/incidents/:id/notifications", requireAuth, requireFullAccess, async (req, res) => {
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

  app.post("/api/incidents/:id/notifications", requireAuth, requireWriteAccess, requireFullAccess, async (req, res) => {
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
          storageQuotaBytes: t.storageQuotaBytes,
          storageUsedBytes: t.storageUsedBytes,
          maxUsers: t.maxUsers,
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

  app.get("/api/storage-info", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
      const info = await storage.getTenantStorageInfo(user.tenantId);
      res.json(info);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const quotaUpdateSchema = z.object({
    storageQuotaGB: z.number().min(0.1).max(1000).optional(),
    maxUsers: z.number().int().min(1).max(10000).optional(),
    maxFileSizeMB: z.number().min(1).max(5120).optional(),
  }).refine(d => d.storageQuotaGB !== undefined || d.maxUsers !== undefined || d.maxFileSizeMB !== undefined, {
    message: "At least one quota field must be provided",
  });

  app.patch("/api/admin/tenants/:id/quota", requirePlatformAdmin, async (req, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      if (isNaN(tenantId)) return res.status(400).json({ message: "Invalid tenant ID" });
      const parsed = quotaUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid quota values" });
      const { storageQuotaGB, maxUsers, maxFileSizeMB } = parsed.data;
      const updateData: any = {};
      if (storageQuotaGB !== undefined) updateData.storageQuotaBytes = Math.round(storageQuotaGB * 1024 * 1024 * 1024);
      if (maxUsers !== undefined) updateData.maxUsers = maxUsers;
      if (maxFileSizeMB !== undefined) updateData.maxFileSizeBytes = Math.round(maxFileSizeMB * 1024 * 1024);
      const tenant = await storage.updateTenantQuota(tenantId, updateData);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      await storage.createAuditLog({
        tenantId: null,
        actorUserId: (req as any).session?.userId || null,
        action: "UPDATE_QUOTA",
        entityType: "TENANT",
        entityId: String(tenantId),
        details: { storageQuotaGB, maxUsers, maxFileSizeMB },
      });
      res.json(tenant);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/storage-overview", requirePlatformAdmin, async (req, res) => {
    try {
      const allTenants = await storage.getAllTenants();
      const overview = await Promise.all(
        allTenants.map(async (t) => {
          const users = await storage.getUsersByTenant(t.id);
          const evidence = await storage.getEvidenceByTenant(t.id);
          return {
            id: t.id,
            name: t.name,
            status: t.status,
            storageQuotaBytes: t.storageQuotaBytes,
            storageUsedBytes: t.storageUsedBytes,
            maxUsers: t.maxUsers,
            maxFileSizeBytes: t.maxFileSizeBytes,
            userCount: users.length,
            evidenceCount: evidence.length,
          };
        })
      );
      const totalQuota = allTenants.reduce((s, t) => s + t.storageQuotaBytes, 0);
      const totalUsed = allTenants.reduce((s, t) => s + t.storageUsedBytes, 0);
      const totalUsers = overview.reduce((s, t) => s + t.userCount, 0);
      const totalEvidence = overview.reduce((s, t) => s + t.evidenceCount, 0);
      res.json({
        tenants: overview,
        totals: { totalQuota, totalUsed, totalUsers, totalEvidence, tenantCount: allTenants.length },
      });
    } catch (err: any) {
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

  app.get("/api/admin/tenants/:id/users", requirePlatformAdmin, async (req, res) => {
    const tenantId = parseInt(req.params.id);
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    const users = await storage.getUsersByTenant(tenantId);
    res.json(users.map(u => ({
      id: u.id, email: u.email, fullName: u.fullName, role: u.role,
      isActive: u.isActive, fullAccessEnabled: u.fullAccessEnabled,
      createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
    })));
  });

  app.patch("/api/admin/tenants/:tenantId/users/:userId", requirePlatformAdmin, async (req, res) => {
    const tenantId = parseInt(req.params.tenantId);
    const userId = parseInt(req.params.userId);
    const targetUser = await storage.getUser(userId);
    if (!targetUser || targetUser.tenantId !== tenantId) {
      return res.status(404).json({ message: "User not found in this tenant" });
    }
    const { fullAccessEnabled } = req.body;
    const updates: any = {};
    if (fullAccessEnabled !== undefined) updates.fullAccessEnabled = fullAccessEnabled;
    const updated = await storage.updateUser(userId, updates);
    const adminUser = await getAuthUser(req);
    await storage.createAuditLog({
      tenantId,
      actorUserId: adminUser!.id,
      action: "UPDATE_USER_ACCESS",
      entityType: "USER",
      entityId: String(userId),
      details: JSON.stringify({ fullAccessEnabled }),
    });
    res.json(updated);
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
      const isGmailOrSmtp = config.provider === "gmail" || config.provider === "smtp";
      res.json({
        provider: config.provider || null,
        fromAddress: config.fromAddress || null,
        hasApiKey: !!config.apiKey,
        hasSmtpPass: !!config.smtpPass,
        smtpUser: config.smtpUser || null,
        smtpHost: config.smtpHost || null,
        smtpPort: config.smtpPort || null,
        configured: isGmailOrSmtp
          ? !!(config.provider && config.smtpUser && config.smtpPass)
          : !!(config.provider && config.apiKey && config.fromAddress),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/admin/email-settings", requirePlatformAdmin, async (req, res) => {
    try {
      const { provider, apiKey, fromAddress, smtpUser, smtpPass, smtpHost, smtpPort } = req.body;
      const existing = await db.select().from(platformSettings).where(eq(platformSettings.key, "email_config"));
      let prev: any = {};
      if (existing.length > 0) {
        try { prev = JSON.parse(existing[0].value); } catch {}
      }
      const finalApiKey = apiKey || prev.apiKey || "";
      const finalSmtpPass = smtpPass || prev.smtpPass || "";
      const config = JSON.stringify({
        provider,
        apiKey: finalApiKey,
        fromAddress,
        smtpUser,
        smtpPass: finalSmtpPass,
        smtpHost,
        smtpPort: smtpPort ? Number(smtpPort) : undefined,
      });
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
      if (country !== undefined && (!country || typeof country !== "string" || country.trim().length === 0)) {
        return res.status(400).json({ message: "Country is required" });
      }
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
      id: u.id, email: u.email, fullName: u.fullName, role: u.role, isActive: u.isActive, fullAccessEnabled: u.fullAccessEnabled, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
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

      const { role, isActive, fullName, fullAccessEnabled } = req.body;
      const updates: any = {};
      if (role !== undefined) updates.role = role;
      if (isActive !== undefined) updates.isActive = isActive;
      if (fullName !== undefined) updates.fullName = fullName;
      if (fullAccessEnabled !== undefined) updates.fullAccessEnabled = fullAccessEnabled;

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

      const tenant = await storage.getTenant(user.tenantId);
      if (tenant) {
        const tenantUsers = await storage.getUsersByTenant(user.tenantId);
        if (tenantUsers.length >= tenant.maxUsers) {
          return res.status(403).json({ message: `User limit reached (${tenant.maxUsers} users). Contact your administrator to increase the limit.` });
        }
      }

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

      const baseUrl = getAppBaseUrl();
      const inviteLink = `${baseUrl}/invite/${token}`;

      const inviteTenant = await storage.getTenant(user.tenantId);
      const tenantName = inviteTenant?.name || "your organization";
      const inviterName = user.fullName || user.email;

      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a;">You've been invited to join ${tenantName}</h2>
          <p>Hello,</p>
          <p>${inviterName} has invited you to join <strong>${tenantName}</strong> on the NIS2 Readiness Platform as a <strong>${(role || "TENANT_USER").replace("_", " ")}</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
          <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this URL into your browser:<br/>${inviteLink}</p>
        </div>
      `;

      const emailSent = await sendGenericEmail(email, `You're invited to join ${tenantName} - NIS2 Platform`, htmlBody);

      res.json({ invite, inviteLink: `/invite/${token}`, emailSent });
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

  // ==================== FEATURE FLAGS ====================

  app.get("/api/admin/feature-flags", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "PLATFORM_ADMIN") return res.status(403).json({ message: "Admin only" });
    const flags = await storage.getFeatureFlags();
    res.json(flags);
  });

  app.get("/api/admin/feature-flags/:tenantId", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "PLATFORM_ADMIN") return res.status(403).json({ message: "Admin only" });
    const tenantId = parseInt(req.params.tenantId);
    const flags = await storage.getFeatureFlags(tenantId);
    res.json(flags);
  });

  app.post("/api/admin/feature-flags", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "PLATFORM_ADMIN") return res.status(403).json({ message: "Admin only" });
    const { tenantId, key, enabled } = req.body;
    const flag = await storage.setFeatureFlag(tenantId ?? null, key, enabled);
    await storage.createAuditLog({
      tenantId: tenantId || null,
      actorUserId: user.id,
      action: enabled ? "FEATURE_FLAG_ENABLED" : "FEATURE_FLAG_DISABLED",
      entityType: "FeatureFlag",
      entityId: key,
      details: { tenantId, key, enabled },
    });
    res.json(flag);
  });

  app.get("/api/feature-flags/check/:key", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    const tenantId = user.tenantId;
    if (!tenantId && user.role !== "PLATFORM_ADMIN") return res.json({ enabled: false });
    if (user.role === "PLATFORM_ADMIN") return res.json({ enabled: true });
    const enabled = await storage.isFeatureEnabled(tenantId!, req.params.key);
    res.json({ enabled });
  });

  // ==================== ATOMIC CONTROLS LIBRARY (ADMIN) ====================

  app.get("/api/admin/atomic-controls", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "PLATFORM_ADMIN") return res.status(403).json({ message: "Admin only" });
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const sourceKey = req.query.sourceKey as string | undefined;
    const domain = req.query.domain as string | undefined;
    const search = req.query.search as string | undefined;
    const result = await storage.getAtomicControlsPaginated(offset, limit, sourceKey, domain, search);
    res.json({ ...result, page, limit });
  });

  app.get("/api/admin/atomic-controls/:id", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "PLATFORM_ADMIN") return res.status(403).json({ message: "Admin only" });
    const controls = await storage.getAllAtomicControls();
    const control = controls.find(c => c.id === parseInt(req.params.id));
    if (!control) return res.status(404).json({ message: "Not found" });
    res.json(control);
  });

  app.patch("/api/admin/atomic-controls/:id", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "PLATFORM_ADMIN") return res.status(403).json({ message: "Admin only" });
    const id = parseInt(req.params.id);
    const updated = await storage.updateAtomicControl(id, req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    await storage.createAuditLog({
      actorUserId: user.id,
      action: "ATOMIC_CONTROL_UPDATED",
      entityType: "AtomicControl",
      entityId: String(id),
      details: req.body,
    });
    res.json(updated);
  });

  app.get("/api/admin/legal-sources", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "PLATFORM_ADMIN") return res.status(403).json({ message: "Admin only" });
    const sources = await storage.getAllLegalSources();
    res.json(sources);
  });

  app.get("/api/admin/control-pack-versions", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "PLATFORM_ADMIN") return res.status(403).json({ message: "Admin only" });
    const sourceKey = req.query.sourceKey as string | undefined;
    const versions = await storage.getControlPackVersions(sourceKey);
    res.json(versions);
  });

  // ==================== ATOMIC CONTROL MAPPINGS ====================

  app.get("/api/admin/atomic-maps", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || (user.role !== "PLATFORM_ADMIN" && user.role !== "TENANT_ADMIN")) {
      return res.status(403).json({ message: "Admin only" });
    }
    const maps = await storage.getAllControlObjectiveAtomicMaps();
    res.json(maps);
  });

  app.post("/api/admin/atomic-maps", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "PLATFORM_ADMIN") return res.status(403).json({ message: "Admin only" });
    const { controlObjectiveId, atomicControlId, confidence } = req.body;
    const map = await storage.createControlObjectiveAtomicMap({
      controlObjectiveId,
      atomicControlId,
      confidence: confidence || 50,
    });
    await storage.createAuditLog({
      actorUserId: user.id,
      action: "ATOMIC_MAP_CREATED",
      entityType: "ControlObjectiveAtomicMap",
      entityId: String(map.id),
      details: { controlObjectiveId, atomicControlId, confidence },
    });
    res.json(map);
  });

  app.delete("/api/admin/atomic-maps/:id", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "PLATFORM_ADMIN") return res.status(403).json({ message: "Admin only" });
    await storage.deleteControlObjectiveAtomicMap(parseInt(req.params.id));
    res.json({ success: true });
  });

  // ==================== ATOMIC ASSESSMENTS (TENANT) ====================

  async function requireAtomicFlag(req: Request, res: Response): Promise<boolean> {
    const user = await getAuthUser(req);
    if (!user) { res.status(401).json({ message: "Not authenticated" }); return false; }
    if (user.role === "PLATFORM_ADMIN") return true;
    if (!user.tenantId) { res.status(400).json({ message: "No tenant" }); return false; }
    const enabled = await storage.isFeatureEnabled(user.tenantId, "ATOMIC_ASSESSMENTS");
    if (!enabled) { res.status(403).json({ message: "Atomic assessments not enabled for this tenant" }); return false; }
    return true;
  }

  app.get("/api/atomic-controls", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    if (user.role !== "PLATFORM_ADMIN" && user.tenantId) {
      const enabled = await storage.isFeatureEnabled(user.tenantId, "ATOMIC_ASSESSMENTS");
      if (!enabled) return res.status(403).json({ message: "Not enabled" });
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const offset = (page - 1) * limit;
    const sourceKey = req.query.sourceKey as string | undefined;
    const domain = req.query.domain as string | undefined;
    const search = req.query.search as string | undefined;

    let tenantSubsector: string | null | undefined = undefined;
    if (user.role !== "PLATFORM_ADMIN" && user.tenantId) {
      const tenant = await storage.getTenant(user.tenantId);
      tenantSubsector = tenant?.subsector || null;
    }

    const result = await storage.getAtomicControlsPaginated(offset, limit, sourceKey, domain, search, tenantSubsector);
    res.json({ ...result, page, limit });
  });

  app.get("/api/atomic-assessments", requireAuth, async (req, res) => {
    if (!(await requireAtomicFlag(req, res))) return;
    const user = await getAuthUser(req);
    if (!user) return;
    if (user.role === "PLATFORM_ADMIN") {
      const allAssessments: any[] = [];
      const tenantsList = await storage.getAllTenants();
      for (const t of tenantsList) {
        const ta = await storage.getAtomicAssessmentsByTenant(t.id);
        allAssessments.push(...ta.map(a => ({ ...a, tenantName: t.name })));
      }
      return res.json(allAssessments);
    }
    const assessments = await storage.getAtomicAssessmentsByTenant(user.tenantId!);
    res.json(assessments);
  });

  app.post("/api/atomic-assessments", requireAuth, async (req, res) => {
    if (!(await requireAtomicFlag(req, res))) return;
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    if (user.role === "READONLY_AUDITOR") return res.status(403).json({ message: "Auditors cannot create assessments" });
    const { name, scope } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });
    const assessment = await storage.createAtomicAssessment({
      tenantId: user.tenantId,
      name,
      scope: scope || null,
      createdBy: user.id,
      status: "DRAFT",
    });
    await storage.createAuditLog({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "ATOMIC_ASSESSMENT_CREATED",
      entityType: "AtomicAssessment",
      entityId: String(assessment.id),
      details: { name, scope },
    });
    res.json(assessment);
  });

  app.get("/api/atomic-assessments/:id", requireAuth, async (req, res) => {
    if (!(await requireAtomicFlag(req, res))) return;
    const user = await getAuthUser(req);
    if (!user) return;
    const assessment = await storage.getAtomicAssessment(parseInt(req.params.id));
    if (!assessment) return res.status(404).json({ message: "Not found" });
    if (user.role !== "PLATFORM_ADMIN" && assessment.tenantId !== user.tenantId) {
      return res.status(403).json({ message: "Access denied" });
    }
    const responses = await storage.getAtomicAssessmentResponses(assessment.id);
    res.json({ ...assessment, responses });
  });

  app.patch("/api/atomic-assessments/:id", requireAuth, async (req, res) => {
    if (!(await requireAtomicFlag(req, res))) return;
    const user = await getAuthUser(req);
    if (!user) return;
    const assessment = await storage.getAtomicAssessment(parseInt(req.params.id));
    if (!assessment) return res.status(404).json({ message: "Not found" });
    if (user.role !== "PLATFORM_ADMIN" && assessment.tenantId !== user.tenantId) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (user.role === "READONLY_AUDITOR") return res.status(403).json({ message: "Auditors cannot modify assessments" });
    const updated = await storage.updateAtomicAssessment(assessment.id, req.body);
    res.json(updated);
  });

  app.post("/api/atomic-assessments/:id/responses", requireAuth, async (req, res) => {
    if (!(await requireAtomicFlag(req, res))) return;
    const user = await getAuthUser(req);
    if (!user) return;
    const assessmentId = parseInt(req.params.id);
    const assessment = await storage.getAtomicAssessment(assessmentId);
    if (!assessment) return res.status(404).json({ message: "Not found" });
    if (user.role !== "PLATFORM_ADMIN" && assessment.tenantId !== user.tenantId) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (user.role === "READONLY_AUDITOR") return res.status(403).json({ message: "Auditors cannot answer" });
    const { atomicControlId, implementationStatus, maturityLevel, confidence, notes } = req.body;
    const response = await storage.upsertAtomicAssessmentResponse({
      atomicAssessmentId: assessmentId,
      atomicControlId,
      implementationStatus: implementationStatus || "NOT_STARTED",
      maturityLevel: maturityLevel || 0,
      confidence: confidence || "NONE",
      notes: notes || null,
      answeredBy: user.id,
    });
    res.json(response);
  });

  app.post("/api/atomic-assessments/:id/generate-tasks", requireAuth, async (req, res) => {
    if (!(await requireAtomicFlag(req, res))) return;
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    if (user.role === "READONLY_AUDITOR") return res.status(403).json({ message: "Auditors cannot create tasks" });
    const assessmentId = parseInt(req.params.id);
    const assessment = await storage.getAtomicAssessment(assessmentId);
    if (!assessment) return res.status(404).json({ message: "Not found" });
    if (assessment.tenantId !== user.tenantId && user.role !== "PLATFORM_ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }
    const responses = await storage.getAtomicAssessmentResponses(assessmentId);
    const gaps = responses.filter(r => r.implementationStatus === "NOT_STARTED" || r.implementationStatus === "IN_PROGRESS");
    const allControls = await storage.getAllAtomicControls();
    const controlMap = new Map(allControls.map(c => [c.id, c]));
    let created = 0;
    for (const gap of gaps) {
      const ctrl = controlMap.get(gap.atomicControlId);
      if (!ctrl) continue;
      const task = await storage.createTask({
        tenantId: user.tenantId,
        title: `[Atomic] ${ctrl.shortTitle}`,
        description: `Address gap: ${ctrl.obligationText}\n\nControl: ${ctrl.controlId}\nCurrent status: ${gap.implementationStatus}`,
        priority: ctrl.weight >= 3 ? "HIGH" : ctrl.weight >= 2 ? "MEDIUM" : "LOW",
        status: "TODO",
      });
      await storage.createTaskAtomicLink({
        taskId: task.id,
        atomicControlId: ctrl.id,
      });
      created++;
    }
    await storage.createAuditLog({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "ATOMIC_TASKS_GENERATED",
      entityType: "AtomicAssessment",
      entityId: String(assessmentId),
      details: { tasksCreated: created, gapsFound: gaps.length },
    });
    res.json({ created, gaps: gaps.length });
  });

  app.delete("/api/atomic-assessments/:id", requireAuth, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
      if (user.role === "READONLY_AUDITOR") return res.status(403).json({ message: "Auditors cannot delete assessments" });
      const id = parseInt(req.params.id);
      const assessment = await storage.getAtomicAssessment(id);
      if (!assessment) return res.status(404).json({ message: "Not found" });
      if (assessment.tenantId !== user.tenantId && user.role !== "PLATFORM_ADMIN") {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteAtomicAssessment(id);
      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "DELETE",
        entityType: "ATOMIC_ASSESSMENT",
        entityId: String(id),
        details: { name: assessment.name },
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/tenant/details", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
    const tenant = await storage.getTenant(user.tenantId);
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    const tenantUsers = await storage.getUsersByTenant(user.tenantId);
    const adminUser = tenantUsers.find(u => u.role === "TENANT_ADMIN") || tenantUsers[0];
    res.json({
      id: tenant.id,
      name: tenant.name,
      sectorGroup: tenant.sectorGroup,
      sector: tenant.sector,
      subsector: tenant.subsector,
      entityType: tenant.entityType,
      country: tenant.country,
      status: tenant.status,
      createdAt: tenant.createdAt,
      contactEmail: adminUser?.email || null,
    });
  });

  app.patch("/api/tenant/details", requireAuth, requireWriteAccess, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user || !user.tenantId) return res.status(400).json({ message: "No tenant" });
      if (user.role !== "TENANT_ADMIN" && user.role !== "PLATFORM_ADMIN") {
        return res.status(403).json({ message: "Only admins can update company details" });
      }
      const { name, sectorGroup, sector, subsector, entityType, country } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (sectorGroup !== undefined) updates.sectorGroup = sectorGroup;
      if (sector !== undefined) updates.sector = sector;
      if (subsector !== undefined) updates.subsector = subsector;
      if (entityType !== undefined) updates.entityType = entityType;
      if (country !== undefined) updates.country = country;
      const updated = await storage.updateTenant(user.tenantId, updates);
      await storage.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "UPDATE",
        entityType: "TENANT",
        entityId: String(user.tenantId),
        details: updates,
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const importLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { message: "Import rate limited. Please wait." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/api/admin/atomic-import/validate", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "PLATFORM_ADMIN") return res.status(403).json({ message: "Admin only" });
    try {
      const { validateControls, validateLegalSources } = await import("./import-service");
      const controlsData = req.body.controls;
      const legalSourcesData = req.body.legalSources;
      if (!Array.isArray(controlsData)) return res.status(400).json({ message: "controls must be an array" });
      const controlsResult = validateControls(controlsData);
      let legalSourcesResult = null;
      if (legalSourcesData && Array.isArray(legalSourcesData)) {
        legalSourcesResult = validateLegalSources(legalSourcesData);
      }
      res.json({ controls: controlsResult, legalSources: legalSourcesResult });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/atomic-import/preview", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "PLATFORM_ADMIN") return res.status(403).json({ message: "Admin only" });
    try {
      const { validateControls, computeDiff } = await import("./import-service");
      const controlsData = req.body.controls;
      if (!Array.isArray(controlsData)) return res.status(400).json({ message: "controls must be an array" });
      const validation = validateControls(controlsData);
      if (!validation.valid) return res.status(400).json({ message: "Validation failed", validation });
      const diff = await computeDiff(controlsData);
      res.json({
        added: diff.added.length,
        updated: diff.updated.length,
        unchanged: diff.unchanged.length,
        toDeactivate: diff.toDeactivate.length,
        packHash: diff.packHash,
        sourceKey: diff.sourceKey,
        addedSample: diff.added.slice(0, 5).map(c => ({ id: c.id, title: c.title })),
        updatedSample: diff.updated.slice(0, 5).map(u => ({ id: u.control.id, title: u.control.title, changes: u.changes })),
        deactivateSample: diff.toDeactivate.slice(0, 5),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/atomic-import/run", requireAuth, importLimiter, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "PLATFORM_ADMIN") return res.status(403).json({ message: "Admin only" });
    try {
      const { runImport } = await import("./import-service");
      const controlsData = req.body.controls;
      const legalSourcesData = req.body.legalSources || [];
      const mode = req.body.mode === "SYNC" ? "SYNC" : "IMPORT";
      if (!Array.isArray(controlsData)) return res.status(400).json({ message: "controls must be an array" });
      const result = await runImport(controlsData, legalSourcesData, mode, user.id);
      await storage.createAuditLog({
        tenantId: null,
        actorUserId: user.id,
        action: `ATOMIC_IMPORT_${mode}`,
        entityType: "AtomicControl",
        entityId: result.packHash || "unknown",
        details: {
          mode,
          addedCount: result.addedCount,
          updatedCount: result.updatedCount,
          unchangedCount: result.unchangedCount,
          deactivatedCount: result.deactivatedCount,
          totalCount: result.totalCount,
          success: result.success,
        },
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/atomic-import/history", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "PLATFORM_ADMIN") return res.status(403).json({ message: "Admin only" });
    try {
      const sourceKey = req.query.sourceKey as string | undefined;
      const runs = await storage.getImportRuns(sourceKey);
      res.json(runs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/atomic-import/repo-file", requireAuth, async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "PLATFORM_ADMIN") return res.status(403).json({ message: "Admin only" });
    try {
      const controlsPath = path.join(process.cwd(), "data", "atomic_controls_nis2_optionB.json");
      const sourcesPath = path.join(process.cwd(), "data", "legal_sources.json");
      if (!fs.existsSync(controlsPath)) return res.status(404).json({ message: "Repo file not found" });
      const controls = JSON.parse(fs.readFileSync(controlsPath, "utf-8"));
      const legalSources = fs.existsSync(sourcesPath) ? JSON.parse(fs.readFileSync(sourcesPath, "utf-8")) : [];
      res.json({ controls, legalSources, filename: "atomic_controls_nis2_optionB.json" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
