/**
 * DORA control import CLI.
 *
 * Usage:
 *   tsx scripts/import-dora-controls.ts
 *
 * Idempotent: safe to re-run.
 * - Reads data/atomic_controls_dora.json (pre-converted from the xlsx).
 * - Upserts the DORA legal source and atomic controls by (controlId, sourceKey).
 * - Never touches existing NIS2 / CIR / other framework rows.
 *
 * To regenerate data/atomic_controls_dora.json from the xlsx, see
 * scripts/generate-dora-json.ts.
 */
import { seedDoraControls } from "../server/dora-seed";

async function main() {
  console.log("Starting DORA controls import...");
  const report = await seedDoraControls();
  console.log("DORA import report:");
  console.log(JSON.stringify(report, null, 2));
  if (report.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("DORA import failed:", err);
  process.exit(1);
});
