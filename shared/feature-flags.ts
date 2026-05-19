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
];

export function getFeatureFlagDefinition(key: string): FeatureFlagDefinition | undefined {
  return FEATURE_FLAG_REGISTRY.find((f) => f.key === key);
}
