export interface FeatureFlagDefinition {
  key: string;
  label: string;
  description: string;
  icon?: "atom" | "shield";
}

export const FEATURE_FLAG_REGISTRY: FeatureFlagDefinition[] = [
  {
    key: "ATOMIC_ASSESSMENTS",
    label: "Atomic Assessments Add-on",
    description: "Granular NIS2/CIR control-level compliance",
    icon: "atom",
  },
  {
    key: "DORA_MODULE",
    label: "DORA Module",
    description: "Enables the DORA dashboard, wizard, and controls for this tenant.",
    icon: "shield",
  },
  {
    key: "NIS2_ART21_RISK_REGISTER",
    label: "NIS2 Art.21 Cyber Risk Register",
    description: "Adds the NIS2 Article 21 cybersecurity risk register tab on the Risks page for this tenant.",
    icon: "shield",
  },
  {
    key: "NIS2_SCOPING",
    label: "NIS2 Applicability & Scoping",
    description: "Enables the NIS2 scoping wizard and applicability-filtered NIS2 control set for this tenant.",
    icon: "shield",
  },
];

export function getFeatureFlagDefinition(key: string): FeatureFlagDefinition | undefined {
  return FEATURE_FLAG_REGISTRY.find((f) => f.key === key);
}
