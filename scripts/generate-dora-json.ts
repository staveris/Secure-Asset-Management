/**
 * Convert the DORA Control Set xlsx into data/atomic_controls_dora.json.
 *
 * Usage:
 *   tsx scripts/generate-dora-json.ts \
 *     attached_assets/CyberResilience360_DORA_Control_Set_*.xlsx
 *
 * Output: data/atomic_controls_dora.json
 */
import fs from "fs";
import path from "path";
import XLSX from "xlsx";

const DEFAULT_INPUT = "attached_assets/CyberResilience360_DORA_Control_Set_1779221139796.xlsx";
const OUTPUT = "data/atomic_controls_dora.json";

function main() {
  const input = process.argv[2] || DEFAULT_INPUT;
  if (!fs.existsSync(input)) {
    console.error(`Input file not found: ${input}`);
    process.exit(1);
  }
  const wb = XLSX.readFile(input);
  const libSheet = wb.Sheets["DORA Control Library"];
  const tagSheet = wb.Sheets["Control Tags"];
  if (!libSheet) throw new Error("Missing 'DORA Control Library' sheet");

  const libRows = XLSX.utils.sheet_to_json<Record<string, any>>(libSheet, { defval: "" });
  const tagRows = tagSheet
    ? XLSX.utils.sheet_to_json<Record<string, any>>(tagSheet, { defval: "" })
    : [];

  const extraTags = new Map<string, Set<string>>();
  for (const r of tagRows) {
    const id = String(r.Control_ID || "").trim();
    const tag = String(r.Tag || "").trim();
    if (!id || !tag) continue;
    if (!extraTags.has(id)) extraTags.set(id, new Set());
    extraTags.get(id)!.add(tag);
  }

  const seen = new Set<string>();
  const errors: string[] = [];
  const controls = libRows.map((r, i) => {
    const id = String(r.Control_ID || "").trim();
    if (!id) errors.push(`Row ${i}: empty Control_ID`);
    if (id && seen.has(id)) errors.push(`Row ${i}: duplicate ${id}`);
    seen.add(id);
    if (!String(r.Domain || "").trim()) errors.push(`Row ${i} (${id}): empty Domain`);
    if (!String(r.Control_Title || "").trim()) errors.push(`Row ${i} (${id}): empty Control_Title`);

    const inlineTags = String(r.Applicability_Tags || "")
      .split(/[;,]/).map((s) => s.trim()).filter(Boolean);
    const tagSet = new Set<string>([...inlineTags, ...(extraTags.get(id) || [])]);
    const evidence = String(r.Evidence_Artifacts || "")
      .split(/;|\n/).map((s) => s.trim()).filter(Boolean);

    return {
      controlId: id,
      domain: String(r.Domain || "").trim(),
      title: String(r.Control_Title || "").trim(),
      objective: String(r.Control_Objective || "").trim(),
      platformRequirement: String(r.Platform_Requirement || "").trim(),
      tags: [...tagSet].sort(),
      doraReference: String(r.DORA_Reference || "").trim(),
      level2Reference: String(r.Level_2_Reference || "").trim(),
      evidenceArtifacts: evidence,
      suggestedFrequency: String(r.Suggested_Frequency || "").trim(),
      typicalOwner: String(r.Typical_Owner || "").trim(),
      defaultStatus: String(r.Default_Status || "Not Assessed").trim(),
      priority: String(r.Priority || "Medium").trim(),
      sourceUrl: String(r.Source_URL || "https://eur-lex.europa.eu/eli/reg/2022/2554/oj/eng").trim(),
      implementationNotes: String(r.Implementation_Notes || "").trim(),
    };
  });

  if (errors.length) {
    console.error("Validation errors:");
    errors.slice(0, 20).forEach((e) => console.error(" - " + e));
    process.exit(2);
  }

  const out = {
    sourceKey: "DORA_2022_2554",
    legalSource: {
      key: "DORA_2022_2554",
      title: "Regulation (EU) 2022/2554 — DORA",
      url: "https://eur-lex.europa.eu/eli/reg/2022/2554/oj/eng",
      version: "2022/2554",
    },
    controls,
  };
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2));
  console.log(`Wrote ${OUTPUT} with ${controls.length} DORA controls.`);
}

main();
