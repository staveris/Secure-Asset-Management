/**
 * Scope-report token hardening tests (Vitest, DB-gated).
 *
 * Tokens are stored as SHA-256 hex (invite-token pattern) so a database leak
 * does not expose usable report links. These tests pin:
 *  - lookup by the RAW token finds a lead stored with the HASH
 *  - the raw token never appears in the stored row
 *  - migrateLegacyScopeTokens converts raw-token rows in place (idempotent)
 *
 * Skips cleanly without DATABASE_URL.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "crypto";
import { eq, inArray } from "drizzle-orm";
import { scopeCheckLeads } from "@shared/schema";

const hasDb = !!process.env.DATABASE_URL;
const RUN_ID = crypto.randomBytes(6).toString("hex");

let db: typeof import("./db").db;
let storage: typeof import("./storage").storage;
const createdIds: number[] = [];

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

async function insertLead(reportToken: string): Promise<number> {
  const [row] = await db
    .insert(scopeCheckLeads)
    .values({
      email: `scope-token-${RUN_ID}@example.test`,
      reportToken,
      answers: { sectorGroup: "ANNEX_I", sector: "Energy" },
      verdict: { inScope: true, entityClass: "IMPORTANT", reason: "test" },
      consentText: "test consent",
      consentMarketing: false,
    } as any)
    .returning();
  createdIds.push(row.id);
  return row.id;
}

describe.skipIf(!hasDb)("scope-report token hardening", () => {
  beforeAll(async () => {
    ({ db } = await import("./db"));
    ({ storage } = await import("./storage"));
  });

  afterAll(async () => {
    if (!hasDb || createdIds.length === 0) return;
    await db.delete(scopeCheckLeads).where(inArray(scopeCheckLeads.id, createdIds));
  });

  it("finds a hash-stored lead by its raw token, and never stores the raw value", async () => {
    const raw = crypto.randomBytes(32).toString("base64url");
    const id = await insertLead(sha256(raw)); // as the route stores it

    const found = await storage.getScopeCheckLeadByToken(raw);
    expect(found?.id).toBe(id);
    expect(found?.reportToken).toBe(sha256(raw));
    expect(found?.reportToken).not.toBe(raw);
  });

  it("does not find a lead by the stored hash itself (hash is not a usable link)", async () => {
    const raw = crypto.randomBytes(32).toString("base64url");
    await insertLead(sha256(raw));
    // Presenting the HASH as if it were the token must fail — it gets hashed again.
    const found = await storage.getScopeCheckLeadByToken(sha256(raw));
    expect(found).toBeUndefined();
  });

  it("migrates legacy raw-token rows in place, idempotently", async () => {
    const raw = crypto.randomBytes(32).toString("base64url"); // 43-char legacy format
    const id = await insertLead(raw); // legacy row: raw stored directly

    // Before migration, raw lookup fails (lookup hashes the input).
    expect(await storage.getScopeCheckLeadByToken(raw)).toBeUndefined();

    const migrated = await storage.migrateLegacyScopeTokens();
    expect(migrated).toBeGreaterThanOrEqual(1);

    // After migration, the emailed raw link works again and the row holds the hash.
    const found = await storage.getScopeCheckLeadByToken(raw);
    expect(found?.id).toBe(id);
    const [row] = await db.select().from(scopeCheckLeads).where(eq(scopeCheckLeads.id, id));
    expect(row.reportToken).toBe(sha256(raw));

    // Idempotent: a second run migrates nothing for this row.
    const again = await storage.migrateLegacyScopeTokens();
    const [rowAfter] = await db.select().from(scopeCheckLeads).where(eq(scopeCheckLeads.id, id));
    expect(rowAfter.reportToken).toBe(sha256(raw));
    expect(again).toBe(0);
  });
});
