export interface ScopeSector {
  sectorGroup: "ANNEX_I" | "ANNEX_II";
  sector: string;
  subsectors: string[];
}

export const NIS2_SECTORS: ScopeSector[] = [
  {
    sectorGroup: "ANNEX_I",
    sector: "Energy",
    subsectors: ["Electricity", "District heating and cooling", "Oil", "Gas", "Hydrogen"],
  },
  {
    sectorGroup: "ANNEX_I",
    sector: "Transport",
    subsectors: ["Air", "Rail", "Water", "Road"],
  },
  { sectorGroup: "ANNEX_I", sector: "Banking", subsectors: [] },
  { sectorGroup: "ANNEX_I", sector: "Financial market infrastructures", subsectors: [] },
  { sectorGroup: "ANNEX_I", sector: "Health", subsectors: [] },
  { sectorGroup: "ANNEX_I", sector: "Drinking water", subsectors: [] },
  { sectorGroup: "ANNEX_I", sector: "Waste water", subsectors: [] },
  {
    sectorGroup: "ANNEX_I",
    sector: "Digital infrastructure",
    subsectors: [
      "Internet Exchange Point providers",
      "DNS service providers",
      "TLD name registries",
      "Cloud computing service providers",
      "Data centre service providers",
      "Content delivery network providers",
      "Trust service providers",
      "Providers of public electronic communications networks",
      "Providers of publicly available electronic communications services",
    ],
  },
  {
    sectorGroup: "ANNEX_I",
    sector: "ICT service management (B2B)",
    subsectors: ["Managed service providers", "Managed security service providers"],
  },
  {
    sectorGroup: "ANNEX_I",
    sector: "Public administration",
    subsectors: ["Central government entities", "Regional level entities"],
  },
  {
    sectorGroup: "ANNEX_I",
    sector: "Space",
    subsectors: ["Operators of ground-based infrastructure"],
  },
  { sectorGroup: "ANNEX_II", sector: "Postal and courier services", subsectors: [] },
  { sectorGroup: "ANNEX_II", sector: "Waste management", subsectors: [] },
  { sectorGroup: "ANNEX_II", sector: "Manufacture/production/distribution of chemicals", subsectors: [] },
  { sectorGroup: "ANNEX_II", sector: "Production/processing/distribution of food", subsectors: [] },
  {
    sectorGroup: "ANNEX_II",
    sector: "Manufacturing",
    subsectors: [
      "Medical devices",
      "Computer/electronic/optical products",
      "Electrical equipment",
      "Machinery and equipment",
      "Motor vehicles/trailers/semi-trailers",
      "Other transport equipment",
    ],
  },
  {
    sectorGroup: "ANNEX_II",
    sector: "Digital providers",
    subsectors: ["Online marketplaces", "Online search engines", "Social networking services platforms"],
  },
  {
    sectorGroup: "ANNEX_II",
    sector: "Research",
    subsectors: ["Research organisations"],
  },
];

export const EU_COUNTRIES: string[] = [
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
];

export const SCOPE_CHECK_DISCLAIMER =
  "Indicative assessment based on your inputs — not legal advice.";

export const SCOPE_CHECK_CONSENT_TEXT =
  "I consent to CyberResilience360 storing my email address and my scope-check answers to generate and send my NIS2 scope report. Data is retained for 12 months unless I delete it earlier via the link in the report. This consent does not opt me in to marketing.";

export type SizeIndependentReason =
  | "DNS_PROVIDER"
  | "TLD_REGISTRY"
  | "TRUST_SERVICE"
  | "PUBLIC_COMMS"
  | "SOLE_PROVIDER"
  | "OTHER";

export interface ScopeCheckAnswers {
  sectorGroup: "ANNEX_I" | "ANNEX_II" | "NONE";
  sector?: string;
  subsector?: string;
  country: string;
  employeeCount?: number;
  annualTurnoverMeur?: number;
  balanceSheetMeur?: number;
  sizeIndependentEntity?: boolean;
  sizeIndependentReason?: SizeIndependentReason;
  publicAdministrationEntity?: boolean;
  soleProviderInMemberState?: boolean;
  memberStateDesignatedInScope?: boolean;
  explicitlyExcludedByMemberState?: boolean;
}

export type ScopeCheckStatus = "IN_SCOPE" | "OUT_OF_SCOPE" | "UNDETERMINED";

export interface ScopeVerdict {
  status: ScopeCheckStatus;
  inScope: boolean;
  entityClass: "ESSENTIAL" | "IMPORTANT" | null;
  sizeClass: string | null;
  reason: string;
}

export interface ScopeControlStats {
  applicable: number;
  excluded: number;
  total: number;
  excludedByReasonGroup: Record<string, number>;
}

export interface ScopeCheckResponse {
  verdict: ScopeVerdict;
  stats: ScopeControlStats;
  disclaimer: string;
}

export interface ScopeReportResponse {
  answers: ScopeCheckAnswers;
  verdict: ScopeVerdict;
  controlStats: ScopeControlStats;
  createdAt: string;
  disclaimer: string;
}

export const EXCLUSION_REASON_LABELS: Record<string, string> = {
  ESSENTIAL_ONLY: "Applies to Essential entities only",
  IMPORTANT_ONLY: "Applies to Important entities only",
  DNS_TLD_SPECIFIC: "DNS / TLD specific",
  SECTOR_SPECIFIC: "Sector specific",
  SIZE_INDEPENDENT_ONLY: "Size-independent entities only",
  OUT_OF_SCOPE: "Out of scope for your profile",
};
