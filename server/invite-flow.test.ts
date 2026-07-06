/**
 * Integration tests for the invitation acceptance flow (Vitest + supertest).
 *
 * Covers:
 *  - GET  /api/auth/invite/:token   (validate: valid, used, expired, invalid)
 *  - POST /api/auth/accept-invite   (valid accept, reuse 410, expired 410,
 *                                    already-registered email 400, tenant
 *                                    user-limit 403)
 *  - GET  /api/tenant/invites       (accepted vs revoked vs pending vs expired
 *                                    classification)
 *
 * Runs against the real Express routes and the dev database. All rows created
 * here use a dedicated throwaway tenant and unique email suffixes, and are
 * removed in afterAll.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer, type Server } from "http";
import request from "supertest";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { db, pool } from "./db";
import { auditLogs, inviteTokens, passwordHistory, users, tenants } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

const RUN_ID = crypto.randomBytes(6).toString("hex");
const emailFor = (name: string) => `invite-test-${name}-${RUN_ID}@example.test`;
const ADMIN_PASSWORD = "InviteTest!234";
const NEW_USER_PASSWORD = "Accepted!234";

function makeToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

const inDays = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

let app: express.Express;
let server: Server;
let agent: request.Agent;
let tenantId: number;
let adminId: number;
let acceptedUserId: number | null = null;
const createdUserIds: number[] = [];
const createdInviteIds: number[] = [];

async function createInvite(opts: {
  email: string;
  role?: "TENANT_USER" | "TENANT_MANAGER" | "TENANT_ADMIN" | "READONLY_AUDITOR";
  expiresAt?: Date;
}) {
  const { token, tokenHash } = makeToken();
  const invite = await storage.createInviteToken({
    tenantId,
    email: opts.email,
    role: opts.role ?? "TENANT_USER",
    tokenHash,
    expiresAt: opts.expiresAt ?? inDays(7),
    createdBy: adminId,
  });
  createdInviteIds.push(invite.id);
  return { invite, token };
}

beforeAll(async () => {
  app = express();
  app.use(express.json());
  server = createServer(app);
  await registerRoutes(server, app);

  const tenant = await storage.createTenant({
    name: `Invite Flow Test Tenant ${RUN_ID}`,
    sectorGroup: "ANNEX_I",
    sector: "general",
    subsector: null,
    entityType: "essential",
    country: null,
    maxUsers: 10,
  });
  tenantId = tenant.id;

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await storage.createUser({
    tenantId,
    email: emailFor("admin"),
    passwordHash,
    fullName: "Invite Test Admin",
    role: "TENANT_ADMIN",
    isActive: true,
    emailVerified: true,
    fullAccessEnabled: true,
  });
  adminId = admin.id;
  createdUserIds.push(admin.id);

  agent = request.agent(app);
  const loginRes = await agent
    .post("/api/auth/login")
    .send({ email: admin.email, password: ADMIN_PASSWORD });
  expect(loginRes.status).toBe(200);
}, 60_000);

afterAll(async () => {
  try {
    if (tenantId) {
      await db.delete(auditLogs).where(eq(auditLogs.tenantId, tenantId));
      if (createdInviteIds.length > 0) {
        await db.delete(inviteTokens).where(inArray(inviteTokens.id, createdInviteIds));
      }
      const tenantUsers = await storage.getUsersByTenant(tenantId);
      const allUserIds = Array.from(new Set([...createdUserIds, ...tenantUsers.map((u) => u.id)]));
      if (allUserIds.length > 0) {
        await db.delete(passwordHistory).where(inArray(passwordHistory.userId, allUserIds));
        await db.delete(users).where(inArray(users.id, allUserIds));
      }
      await db.delete(tenants).where(eq(tenants.id, tenantId));
    }
  } finally {
    await pool.end();
  }
}, 60_000);

describe("GET /api/auth/invite/:token (validation)", () => {
  it("rejects a malformed/too-short token with 400", async () => {
    const res = await request(app).get("/api/auth/invite/short");
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown token", async () => {
    const { token } = makeToken();
    const res = await request(app).get(`/api/auth/invite/${token}`);
    expect(res.status).toBe(404);
  });

  it("returns invite details for a valid pending invitation", async () => {
    const email = emailFor("validate");
    const { token } = await createInvite({ email, role: "TENANT_MANAGER" });
    const res = await request(app).get(`/api/auth/invite/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
    expect(res.body.role).toBe("TENANT_MANAGER");
    expect(res.body.tenantName).toContain("Invite Flow Test Tenant");
    expect(res.body.expiresAt).toBeTruthy();
  });

  it("returns 410 for an expired invitation", async () => {
    const { token } = await createInvite({
      email: emailFor("expired-get"),
      expiresAt: inDays(-1),
    });
    const res = await request(app).get(`/api/auth/invite/${token}`);
    expect(res.status).toBe(410);
    expect(res.body.message).toMatch(/expired/i);
  });
});

describe("POST /api/auth/accept-invite", () => {
  let acceptToken: string;
  let acceptInviteId: number;
  const acceptEmail = emailFor("accept");

  it("creates the account, stamps the invite, audit-logs, and logs the session in", async () => {
    const { invite, token } = await createInvite({ email: acceptEmail, role: "TENANT_USER" });
    acceptToken = token;
    acceptInviteId = invite.id;

    const acceptAgent = request.agent(app);
    const res = await acceptAgent.post("/api/auth/accept-invite").send({
      token,
      password: NEW_USER_PASSWORD,
      fullName: "Accepted Invitee",
    });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(acceptEmail);
    expect(res.body.role).toBe("TENANT_USER");
    expect(res.body.emailVerified).toBe(true);

    acceptedUserId = res.body.id;
    createdUserIds.push(res.body.id);

    // User exists in the inviting tenant with the invited role, pre-verified.
    const created = await storage.getUserByEmail(acceptEmail);
    expect(created).toBeTruthy();
    expect(created!.tenantId).toBe(tenantId);
    expect(created!.role).toBe("TENANT_USER");
    expect(created!.emailVerified).toBe(true);

    // Invite row is stamped with usedAt + acceptedByUserId.
    const stamped = await storage.getInviteToken(invite.id);
    expect(stamped!.usedAt).toBeTruthy();
    expect(stamped!.acceptedByUserId).toBe(created!.id);

    // INVITE_ACCEPT audit log written with actor + entity.
    const logs = await storage.getAuditLogsByTenant(tenantId, 1000);
    const acceptLog = logs.find(
      (l) => l.action === "INVITE_ACCEPT" && l.entityId === String(invite.id),
    );
    expect(acceptLog).toBeTruthy();
    expect(acceptLog!.actorUserId).toBe(created!.id);
    expect((acceptLog!.details as any)?.userId).toBe(created!.id);

    // Session is logged in: /api/auth/me answers for the new user.
    const meRes = await acceptAgent.get("/api/auth/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(acceptEmail);
  });

  it("rejects reusing the same token with 410 (POST and GET)", async () => {
    const postRes = await request(app).post("/api/auth/accept-invite").send({
      token: acceptToken,
      password: NEW_USER_PASSWORD,
      fullName: "Second Attempt",
    });
    expect(postRes.status).toBe(410);
    expect(postRes.body.message).toMatch(/already been used or revoked/i);

    const getRes = await request(app).get(`/api/auth/invite/${acceptToken}`);
    expect(getRes.status).toBe(410);

    // No duplicate account was created.
    const tenantUsers = await storage.getUsersByTenant(tenantId);
    expect(tenantUsers.filter((u) => u.email === acceptEmail)).toHaveLength(1);

    // acceptedByUserId still points at the original user.
    const stamped = await storage.getInviteToken(acceptInviteId);
    expect(stamped!.acceptedByUserId).toBe(acceptedUserId);
  });

  it("rejects an expired invitation with 410", async () => {
    const { token } = await createInvite({
      email: emailFor("expired-post"),
      expiresAt: inDays(-1),
    });
    const res = await request(app).post("/api/auth/accept-invite").send({
      token,
      password: NEW_USER_PASSWORD,
      fullName: "Expired Invitee",
    });
    expect(res.status).toBe(410);
    expect(res.body.message).toMatch(/expired/i);
  });

  it("rejects an invite whose email already has an account with 400", async () => {
    const { token } = await createInvite({ email: emailFor("admin") });
    const res = await request(app).post("/api/auth/accept-invite").send({
      token,
      password: NEW_USER_PASSWORD,
      fullName: "Duplicate Email",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("rejects acceptance when the tenant user limit is reached with 403", async () => {
    const tenantUsers = await storage.getUsersByTenant(tenantId);
    await db.update(tenants).set({ maxUsers: tenantUsers.length }).where(eq(tenants.id, tenantId));
    try {
      const { token } = await createInvite({ email: emailFor("over-limit") });
      const res = await request(app).post("/api/auth/accept-invite").send({
        token,
        password: NEW_USER_PASSWORD,
        fullName: "Over Limit",
      });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/user limit/i);
      expect(await storage.getUserByEmail(emailFor("over-limit"))).toBeUndefined();
    } finally {
      await db.update(tenants).set({ maxUsers: 10 }).where(eq(tenants.id, tenantId));
    }
  });
});

describe("GET /api/tenant/invites classification", () => {
  let revokedInviteId: number;
  let pendingInviteId: number;
  let expiredInviteId: number;

  beforeAll(async () => {
    // Revoked invite: usedAt stamped without acceptedByUserId + INVITE_REVOKE audit log
    // (mirrors DELETE /api/tenant/invites/:inviteId behavior).
    const revoked = await createInvite({ email: emailFor("revoked") });
    revokedInviteId = revoked.invite.id;
    await storage.markInviteTokenUsed(revokedInviteId);
    await storage.createAuditLog({
      tenantId,
      actorUserId: adminId,
      action: "INVITE_REVOKE",
      entityType: "INVITE",
      entityId: String(revokedInviteId),
      details: { email: emailFor("revoked") },
    });

    const pending = await createInvite({ email: emailFor("pending") });
    pendingInviteId = pending.invite.id;

    const expired = await createInvite({
      email: emailFor("expired-list"),
      expiresAt: inDays(-2),
    });
    expiredInviteId = expired.invite.id;
  });

  it("classifies accepted, revoked, pending, and expired invites correctly", async () => {
    const res = await agent.get("/api/tenant/invites?status=all");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const byId = new Map<number, any>(res.body.map((i: any) => [i.id, i]));

    const accepted = res.body.find((i: any) => i.status === "accepted");
    expect(accepted).toBeTruthy();
    expect(accepted.acceptedByUser?.id).toBe(acceptedUserId);
    expect(accepted.acceptedAt).toBeTruthy();

    const revoked = byId.get(revokedInviteId);
    expect(revoked?.status).toBe("revoked");
    expect(revoked?.acceptedByUser).toBeNull();

    expect(byId.get(pendingInviteId)?.status).toBe("pending");
    expect(byId.get(expiredInviteId)?.status).toBe("expired");
    expect(byId.get(expiredInviteId)?.expired).toBe(true);
  });

  it("filters by status and never shows a revoked invite as accepted", async () => {
    const acceptedRes = await agent.get("/api/tenant/invites?status=accepted");
    expect(acceptedRes.status).toBe(200);
    const acceptedIds = acceptedRes.body.map((i: any) => i.id);
    expect(acceptedIds).not.toContain(revokedInviteId);
    for (const invite of acceptedRes.body) {
      expect(invite.status).toBe("accepted");
    }

    const revokedRes = await agent.get("/api/tenant/invites?status=revoked");
    expect(revokedRes.status).toBe(200);
    expect(revokedRes.body.map((i: any) => i.id)).toContain(revokedInviteId);

    const pendingRes = await agent.get("/api/tenant/invites?status=pending");
    expect(pendingRes.status).toBe(200);
    const pendingIds = pendingRes.body.map((i: any) => i.id);
    expect(pendingIds).toContain(pendingInviteId);
    expect(pendingIds).not.toContain(revokedInviteId);
    expect(pendingIds).not.toContain(expiredInviteId);
  });

  it("classifies a revoked legacy invite correctly even with >1000 newer audit-log entries", async () => {
    const email = emailFor("revoked-busy");
    const { invite } = await createInvite({ email });
    await storage.markInviteTokenUsed(invite.id);
    await storage.createAuditLog({
      tenantId,
      actorUserId: adminId,
      action: "INVITE_REVOKE",
      entityType: "INVITE",
      entityId: String(invite.id),
      details: { email },
    });

    // Simulate a very active tenant: flood the audit log with 1200 newer
    // entries so the revocation falls outside any recent-N window.
    const noise = Array.from({ length: 1200 }, (_, idx) => ({
      tenantId,
      actorUserId: adminId,
      action: "UPDATE_TASK",
      entityType: "TASK",
      entityId: String(idx),
      details: { noise: true },
    }));
    for (let i = 0; i < noise.length; i += 200) {
      await db.insert(auditLogs).values(noise.slice(i, i + 200));
    }

    const res = await agent.get("/api/tenant/invites?status=all");
    expect(res.status).toBe(200);
    const row = res.body.find((i: any) => i.id === invite.id);
    expect(row?.status).toBe("revoked");
    expect(row?.acceptedByUser).toBeNull();

    const acceptedRes = await agent.get("/api/tenant/invites?status=accepted");
    expect(acceptedRes.body.map((i: any) => i.id)).not.toContain(invite.id);

    const revokedRes = await agent.get("/api/tenant/invites?status=revoked");
    expect(revokedRes.body.map((i: any) => i.id)).toContain(invite.id);
  });

  it("requires tenant-admin rights to list invitations", async () => {
    const unauthRes = await request(app).get("/api/tenant/invites");
    expect(unauthRes.status).toBe(401);
  });
});
