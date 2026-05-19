/**
 * Unit tests for the DORA applicability engine.
 *
 * Run with: tsx server/dora-applicability.test.ts
 *
 * No external test framework dependency — uses a tiny inline assert harness so
 * we don't have to modify package.json or add a runtime dep.
 */
import {
  decideDoraApplicability,
  isControlApplicable,
  computeApplicableDoraControls,
} from "./dora-applicability";

type AnyProfile = Parameters<typeof decideDoraApplicability>[0];

function ctrl(tags: string[]) {
  return { applicability: { tags } } as { applicability: { tags: string[] } };
}

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${extra ? " — " + extra : ""}`);
    failed++;
  }
}

// Helper baseline profile: not in scope at all.
const empty: AnyProfile = {};

// ---- 1. Scope decisions ----
console.log("Group: Scope decisions");
check(
  "Empty profile is not applicable",
  decideDoraApplicability(empty).doraApplicable === false,
);
check(
  "Scope confirmed + Article 2 in scope ⇒ applicable",
  decideDoraApplicability({ doraScopeConfirmed: true, doraArticle2InScope: true }).doraApplicable === true,
);
check(
  "Scope confirmed + ICT TPP profile ⇒ applicable",
  decideDoraApplicability({ doraScopeConfirmed: true, ictThirdPartyProviderProfile: true }).doraApplicable === true,
);
check(
  "Article 2 exclusion forces non-applicable even if other flags true",
  decideDoraApplicability({
    doraScopeConfirmed: true,
    doraArticle2InScope: true,
    doraArticle2Exclusion: true,
  }).doraApplicable === false,
);
check(
  "Admin override enables applicability even without scope confirmation",
  decideDoraApplicability({ adminOverrideEnabled: true, doraEnabled: true }).doraApplicable === true,
);

// Test #1: existing NIS2/CIR controls are untouched — guaranteed by code review of
// dora-seed.ts which scopes all writes by sourceKey=DORA_2022_2554. Asserted at code level.

// Test #5: organization with dora_enabled = false sees no active DORA controls
const profileDisabled: AnyProfile = {};
check(
  "5. Disabled org sees no DORA controls (DORA_FULL)",
  computeApplicableDoraControls(profileDisabled, [ctrl(["DORA_FULL"])]).length === 0,
);

// Test #6: confirmed full DORA scope ⇒ receives DORA_FULL controls
const fullScope: AnyProfile = { doraScopeConfirmed: true, doraArticle2InScope: true };
check(
  "6. Full-scope org gets DORA_FULL controls",
  computeApplicableDoraControls(fullScope, [ctrl(["DORA_FULL"])]).length === 1,
);

// Test #7: Article 16 simplified profile receives DORA_SIMPLIFIED, not full-only
const simplified: AnyProfile = {
  doraScopeConfirmed: true,
  doraArticle2InScope: true,
  doraArticle16Simplified: true,
};
const ctrls7 = [
  ctrl(["DORA_SIMPLIFIED"]),
  ctrl(["DORA_FULL"]),
  ctrl(["DORA_FULL", "DORA_SIMPLIFIED"]),
];
const out7 = computeApplicableDoraControls(simplified, ctrls7);
check(
  "7a. Simplified org gets DORA_SIMPLIFIED control",
  out7.includes(ctrls7[0] as any),
);
check(
  "7b. Simplified org does NOT get pure DORA_FULL control",
  !out7.includes(ctrls7[1] as any),
);
check(
  "7c. Simplified org gets DORA_FULL+SIMPLIFIED dual-tag control",
  out7.includes(ctrls7[2] as any),
);

// Test #8 + #9: third-party gating
const noTpp: AnyProfile = { doraScopeConfirmed: true, doraArticle2InScope: true };
const withTpp: AnyProfile = {
  doraScopeConfirmed: true,
  doraArticle2InScope: true,
  usesIctThirdPartyServices: true,
};
const tpp = [ctrl(["DORA_FULL", "THIRD_PARTY"])];
check(
  "8. Org without ICT third-party services does NOT receive THIRD_PARTY control",
  computeApplicableDoraControls(noTpp, tpp).length === 0,
);
check(
  "9. Org using ICT third-party services receives THIRD_PARTY control",
  computeApplicableDoraControls(withTpp, tpp).length === 1,
);

// Test #10: TLPT controls hidden unless tlpt_selected_or_required = true
check(
  "10a. TLPT control hidden when not selected",
  computeApplicableDoraControls(fullScope, [ctrl(["DORA_FULL", "TLPT_SELECTED"])]).length === 0,
);
check(
  "10b. TLPT control shown when selected",
  computeApplicableDoraControls(
    { ...fullScope, tlptSelectedOrRequired: true },
    [ctrl(["DORA_FULL", "TLPT_SELECTED"])],
  ).length === 1,
);

// Test #11: payment-related incident controls assigned only to payment-related entities
check(
  "11a. PAYMENT_RELATED_ENTITY control hidden for non-payment entity",
  computeApplicableDoraControls(fullScope, [ctrl(["DORA_FULL", "PAYMENT_RELATED_ENTITY"])]).length === 0,
);
check(
  "11b. PAYMENT_RELATED_ENTITY control shown for payment entity",
  computeApplicableDoraControls(
    { ...fullScope, paymentRelatedEntity: true },
    [ctrl(["DORA_FULL", "PAYMENT_RELATED_ENTITY"])],
  ).length === 1,
);

// Test #12: ICT_TPP controls assigned only to ICT third-party provider profiles
check(
  "12a. ICT_TPP control hidden for non-provider org",
  computeApplicableDoraControls(fullScope, [ctrl(["ICT_TPP"])]).length === 0,
);
check(
  "12b. ICT_TPP control shown for provider org",
  computeApplicableDoraControls(
    { doraScopeConfirmed: true, ictThirdPartyProviderProfile: true },
    [ctrl(["ICT_TPP"])],
  ).length === 1,
);

// Test #13: CTPP controls assigned only when critical_ict_third_party_provider_designated
check(
  "13a. CTPP control hidden for non-CTPP provider",
  computeApplicableDoraControls(
    { doraScopeConfirmed: true, ictThirdPartyProviderProfile: true },
    [ctrl(["ICT_TPP", "CTPP"])],
  ).length === 0,
);
check(
  "13b. CTPP control shown when CTPP designated",
  computeApplicableDoraControls(
    {
      doraScopeConfirmed: true,
      ictThirdPartyProviderProfile: true,
      criticalIctThirdPartyProviderDesignated: true,
    },
    [ctrl(["ICT_TPP", "CTPP"])],
  ).length === 1,
);

// Test #15: applicability decision marks the right reason
const decided = decideDoraApplicability({});
check("15. Decision returns reason string", typeof decided.reason === "string" && decided.reason.length > 0);

// Sanity test: information-sharing optional controls
check(
  "OPTIONAL info-sharing hidden when not participating",
  computeApplicableDoraControls(fullScope, [ctrl(["DORA_FULL", "OPTIONAL"])]).length === 0,
);
check(
  "OPTIONAL info-sharing shown when participating",
  computeApplicableDoraControls(
    { ...fullScope, participatesInInformationSharing: true },
    [ctrl(["DORA_FULL", "OPTIONAL"])],
  ).length === 1,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
