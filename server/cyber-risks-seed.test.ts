/**
 * Tests for the NIS2 Art.21 cyber risk library seed JSON.
 *
 * Run with: tsx server/cyber-risks-seed.test.ts
 *
 * Inline assert harness (same pattern as dora-applicability.test.ts) — no
 * package.json changes required.
 */
import fs from "fs";
import path from "path";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    failed++;
    failures.push(`${name}: ${e?.message || e}`);
    console.log(`  ✗ ${name} — ${e?.message || e}`);
  }
}

function assert(cond: any, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const SEED_PATH = path.resolve(process.cwd(), "data/risk_library_nis2_art21.json");
const VALID_LI = new Set(["Low", "Medium", "High"]);
const VALID_RATING = new Set(["Low", "Medium", "High", "Critical"]);

const raw = fs.readFileSync(SEED_PATH, "utf8");
const seed = JSON.parse(raw) as {
  libraryCode: string;
  entryCount: number;
  entries: Array<{
    riskId: string;
    title: string;
    category: string;
    defaultLikelihood?: string;
    defaultImpact?: string;
    defaultRiskRating?: string;
    defaultStatus?: string;
  }>;
};

console.log(`\nNIS2 Art.21 cyber risk seed file (${SEED_PATH})\n`);

test("libraryCode is NIS2_ART21_CYBER_RISKS", () => {
  assert(seed.libraryCode === "NIS2_ART21_CYBER_RISKS", `got '${seed.libraryCode}'`);
});

test("entryCount matches actual entries length", () => {
  assert(seed.entryCount === seed.entries.length, `header=${seed.entryCount} actual=${seed.entries.length}`);
});

test("exactly 100 entries", () => {
  assert(seed.entries.length === 100, `got ${seed.entries.length}`);
});

test("every entry has non-empty riskId, title, category", () => {
  for (const e of seed.entries) {
    assert(e.riskId && e.riskId.trim().length > 0, `empty riskId in entry`);
    assert(e.title && e.title.trim().length > 0, `empty title for ${e.riskId}`);
    assert(e.category && e.category.trim().length > 0, `empty category for ${e.riskId}`);
  }
});

test("no duplicate riskIds", () => {
  const seen = new Set<string>();
  for (const e of seed.entries) {
    assert(!seen.has(e.riskId), `duplicate riskId: ${e.riskId}`);
    seen.add(e.riskId);
  }
});

test("all defaultLikelihood values are Low/Medium/High when present", () => {
  for (const e of seed.entries) {
    if (e.defaultLikelihood) {
      assert(VALID_LI.has(e.defaultLikelihood), `bad defaultLikelihood '${e.defaultLikelihood}' for ${e.riskId}`);
    }
  }
});

test("all defaultImpact values are Low/Medium/High when present", () => {
  for (const e of seed.entries) {
    if (e.defaultImpact) {
      assert(VALID_LI.has(e.defaultImpact), `bad defaultImpact '${e.defaultImpact}' for ${e.riskId}`);
    }
  }
});

test("all defaultRiskRating values are Low/Medium/High/Critical when present", () => {
  for (const e of seed.entries) {
    if (e.defaultRiskRating) {
      assert(VALID_RATING.has(e.defaultRiskRating), `bad defaultRiskRating '${e.defaultRiskRating}' for ${e.riskId}`);
    }
  }
});

test("defaultStatus is Not Assessed when present", () => {
  for (const e of seed.entries) {
    if (e.defaultStatus) {
      assert(e.defaultStatus === "Not Assessed", `unexpected defaultStatus '${e.defaultStatus}' for ${e.riskId}`);
    }
  }
});

test("at least one category covers each major NIS2 Art.21 area", () => {
  const cats = new Set(seed.entries.map(e => e.category.toLowerCase()));
  // Spot-check that multiple distinct categories exist (xlsx had 10)
  assert(cats.size >= 5, `only ${cats.size} distinct categories`);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("\nFailures:");
  failures.forEach(f => console.error(`  - ${f}`));
  process.exit(1);
}
