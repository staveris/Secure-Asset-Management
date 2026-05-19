/**
 * NIS2 Art.21 Cybersecurity Risk Library import CLI.
 *
 * Usage:
 *   tsx scripts/import-cyber-risks-nis2-art21.ts
 *
 * Idempotent: safe to re-run.
 * - Reads data/risk_library_nis2_art21.json (pre-converted from the xlsx).
 * - Upserts library entries by (libraryCode, riskId).
 * - NEVER touches existing controls (atomic_controls, requirements,
 *   control_objectives), existing risk_items, or any other framework.
 * - NEVER creates organization-specific risk records.
 */
import { seedNis2Art21Risks } from "../server/cyber-risks-seed";

async function main() {
  console.log("Starting NIS2 Art.21 cyber risk library import...");
  const report = await seedNis2Art21Risks();
  console.log("Import report:");
  console.log(JSON.stringify(report, null, 2));
  if (report.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Cyber risk import failed:", err);
  process.exit(1);
});
