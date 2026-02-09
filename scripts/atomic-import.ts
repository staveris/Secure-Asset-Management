import fs from "fs";
import path from "path";
import { validateControls, validateLegalSources, runImport } from "../server/import-service";

const MODE = process.argv.includes("--sync") ? "SYNC" : "IMPORT";
const ADMIN_USER_ID = 1;

async function main() {
  const controlsPath = path.join(process.cwd(), "data", "atomic_controls_nis2_optionB.json");
  const sourcesPath = path.join(process.cwd(), "data", "legal_sources.json");

  if (!fs.existsSync(controlsPath)) {
    console.error("Controls file not found:", controlsPath);
    process.exit(1);
  }

  console.log(`Loading controls from ${controlsPath}...`);
  const controls = JSON.parse(fs.readFileSync(controlsPath, "utf-8"));
  const legalSources = fs.existsSync(sourcesPath) ? JSON.parse(fs.readFileSync(sourcesPath, "utf-8")) : [];

  console.log(`Loaded ${controls.length} controls, ${legalSources.length} legal sources`);

  console.log("Validating...");
  const validation = validateControls(controls);
  if (!validation.valid) {
    console.error("Validation failed:");
    for (const err of validation.errors.slice(0, 10)) {
      console.error(`  #${err.index} (${err.id || "?"}): ${err.errors.join("; ")}`);
    }
    process.exit(1);
  }
  console.log(`Validation passed: ${validation.validRecords}/${validation.totalRecords} valid`);

  console.log(`Running ${MODE}...`);
  const result = await runImport(controls, legalSources, MODE, ADMIN_USER_ID);

  if (result.success) {
    console.log(`${MODE} completed successfully:`);
    console.log(`  Added:       ${result.addedCount}`);
    console.log(`  Updated:     ${result.updatedCount}`);
    console.log(`  Unchanged:   ${result.unchangedCount}`);
    console.log(`  Deactivated: ${result.deactivatedCount}`);
    console.log(`  Total:       ${result.totalCount}`);
    console.log(`  Pack Hash:   ${result.packHash}`);
  } else {
    console.error(`${MODE} failed:`, result.errors?.join("; "));
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
