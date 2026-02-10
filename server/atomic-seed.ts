import { storage } from "./storage";

interface AtomicControlSeed {
  controlId: string;
  sourceKey: string;
  legalRef: string;
  clausePath: string;
  shortTitle: string;
  obligationText: string;
  obligationVerb?: string;
  applicability: Record<string, any>;
  evidenceTypes: string[];
  testProcedure: Record<string, any>;
  domain: string;
  weight: number;
}

const NIS2_CONTROLS: AtomicControlSeed[] = [
  {
    controlId: "NIS2-21-3",
    sourceKey: "NIS2_2022_2555",
    legalRef: "Article 21(3)",
    clausePath: "Art.21.3",
    shortTitle: "All-hazards approach to risk management",
    obligationText: "Entities shall take into account vulnerabilities specific to each direct supplier and overall supply chain quality, and assess their significance for network and information system security.",
    obligationVerb: "shall take into account",
    applicability: { entities: ["ALL_NIS2_ENTITIES"] },
    evidenceTypes: ["All-hazards risk assessment", "Supply chain risk analysis", "Threat landscape assessment"],
    testProcedure: { method: "Verify risk assessment covers all hazard types including supply chain-specific vulnerabilities" },
    domain: "Risk Management",
    weight: 2,
  },
  {
    controlId: "NIS2-21-4",
    sourceKey: "NIS2_2022_2555",
    legalRef: "Article 21(4)",
    clausePath: "Art.21.4",
    shortTitle: "Compliance with standards and specifications",
    obligationText: "Entities shall, where appropriate, use European and international standards and technical specifications relevant to the security of network and information systems.",
    obligationVerb: "shall use",
    applicability: { entities: ["ALL_NIS2_ENTITIES"] },
    evidenceTypes: ["Standards compliance matrix", "ISO/IEC certifications", "Technical specifications"],
    testProcedure: { method: "Review alignment with relevant European/international standards (e.g. ISO 27001, ENISA guidelines)" },
    domain: "Governance",
    weight: 1,
  },
  {
    controlId: "NIS2-24-1",
    sourceKey: "NIS2_2022_2555",
    legalRef: "Article 24(1)",
    clausePath: "Art.24.1",
    shortTitle: "Voluntary notification of non-significant incidents",
    obligationText: "Entities may notify on a voluntary basis incidents, cyber threats and near misses that are not classified as significant.",
    obligationVerb: "may notify",
    applicability: { entities: ["ALL_NIS2_ENTITIES"] },
    evidenceTypes: ["Voluntary notification procedure", "Incident classification criteria"],
    testProcedure: { method: "Verify procedure exists for voluntary notification of non-significant incidents and near misses" },
    domain: "Incident Management",
    weight: 1,
  },
  {
    controlId: "NIS2-26-1",
    sourceKey: "NIS2_2022_2555",
    legalRef: "Article 26(1)",
    clausePath: "Art.26.1",
    shortTitle: "Supervision and enforcement for essential entities",
    obligationText: "Essential entities shall be subject to supervisory measures including on-site inspections, regular audits, targeted security audits, and ad hoc audits.",
    obligationVerb: "shall be subject",
    applicability: { entities: ["ESSENTIAL"] },
    evidenceTypes: ["Audit readiness documentation", "Previous audit reports", "Remediation tracking"],
    testProcedure: { method: "Verify audit readiness, review previous audit findings and remediation status" },
    domain: "Governance",
    weight: 2,
  },
];

const CIR_CONTROLS: AtomicControlSeed[] = [
  {
    controlId: "CIR-2024-2690-3-1",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 3(1) CIR 2024/2690",
    clausePath: "CIR.Art.3.1",
    shortTitle: "Information system security policy",
    obligationText: "Relevant entities shall establish a policy on the security of network and information systems defining the approach and objectives for the security of their network and information systems.",
    obligationVerb: "shall establish",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["Information security policy", "Policy approval records", "Policy review schedule"],
    testProcedure: { method: "Review IS policy for completeness, approval by management, and regular review schedule" },
    domain: "Governance",
    weight: 3,
  },
  {
    controlId: "CIR-2024-2690-3-2",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 3(2) CIR 2024/2690",
    clausePath: "CIR.Art.3.2",
    shortTitle: "Roles and responsibilities for network and IS security",
    obligationText: "Relevant entities shall define and assign roles and responsibilities for the security of network and information systems and establish reporting lines.",
    obligationVerb: "shall define",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["RACI matrix", "Role descriptions", "Organisational chart"],
    testProcedure: { method: "Verify documented roles/responsibilities for IS security and clear reporting lines" },
    domain: "Governance",
    weight: 2,
  },
  {
    controlId: "CIR-2024-2690-4-1",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 4(1) CIR 2024/2690",
    clausePath: "CIR.Art.4.1",
    shortTitle: "Risk management framework",
    obligationText: "Relevant entities shall establish and maintain a risk management framework to identify and address risks to the security of network and information systems.",
    obligationVerb: "shall establish",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["Risk management framework", "Risk register", "Risk assessment methodology"],
    testProcedure: { method: "Review risk management framework, methodology, and current risk register" },
    domain: "Risk Management",
    weight: 3,
  },
  {
    controlId: "CIR-2024-2690-4-2",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 4(2) CIR 2024/2690",
    clausePath: "CIR.Art.4.2",
    shortTitle: "Risk assessment methodology and criteria",
    obligationText: "The risk management framework shall define criteria for the acceptance of risks and for carrying out risk assessments, including risk identification, analysis and evaluation.",
    obligationVerb: "shall define",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["Risk acceptance criteria", "Risk assessment procedure", "Risk scoring methodology"],
    testProcedure: { method: "Verify documented risk acceptance criteria, assessment methodology including identification, analysis, evaluation" },
    domain: "Risk Management",
    weight: 2,
  },
  {
    controlId: "CIR-2024-2690-5-1",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 5(1) CIR 2024/2690",
    clausePath: "CIR.Art.5.1",
    shortTitle: "Incident handling policy and procedures",
    obligationText: "Relevant entities shall establish and implement an incident handling policy defining roles, responsibilities and procedures for detecting, analysing, containing, recovering and notifying incidents.",
    obligationVerb: "shall establish",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["Incident handling policy", "Incident response procedures", "RACI for incidents"],
    testProcedure: { method: "Review incident handling policy for defined roles, detection, analysis, containment, recovery, and notification procedures" },
    domain: "Incident Management",
    weight: 3,
  },
  {
    controlId: "CIR-2024-2690-5-2",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 5(2) CIR 2024/2690",
    clausePath: "CIR.Art.5.2",
    shortTitle: "Incident monitoring and logging",
    obligationText: "Relevant entities shall monitor and log events in their network and information systems to detect, analyse and respond to incidents in a timely manner.",
    obligationVerb: "shall monitor",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["SIEM configuration", "Log management policy", "Monitoring dashboards"],
    testProcedure: { method: "Verify event monitoring and logging capabilities, review SIEM/log management configuration" },
    domain: "Security Operations",
    weight: 2,
  },
  {
    controlId: "CIR-2024-2690-6-1",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 6(1) CIR 2024/2690",
    clausePath: "CIR.Art.6.1",
    shortTitle: "Business continuity and disaster recovery plans",
    obligationText: "Relevant entities shall establish and maintain business continuity plans and disaster recovery plans based on the results of business impact analyses.",
    obligationVerb: "shall establish",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["BCP", "DR plan", "Business impact analysis", "Recovery objectives"],
    testProcedure: { method: "Review BCP/DRP, verify they are based on BIA and include defined RTOs/RPOs" },
    domain: "Business Continuity",
    weight: 3,
  },
  {
    controlId: "CIR-2024-2690-6-2",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 6(2) CIR 2024/2690",
    clausePath: "CIR.Art.6.2",
    shortTitle: "Backup management and data restoration",
    obligationText: "Relevant entities shall ensure that backups are created, maintained and regularly tested to allow restoration of network and information systems after an incident.",
    obligationVerb: "shall ensure",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["Backup policy", "Backup schedules", "Restoration test results"],
    testProcedure: { method: "Review backup policy, verify regular backup testing and restoration capability" },
    domain: "Business Continuity",
    weight: 2,
  },
  {
    controlId: "CIR-2024-2690-7-1",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 7(1) CIR 2024/2690",
    clausePath: "CIR.Art.7.1",
    shortTitle: "Supply chain security policy",
    obligationText: "Relevant entities shall establish a supply chain security policy governing their relationships with direct suppliers and service providers.",
    obligationVerb: "shall establish",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["Supply chain security policy", "Supplier register", "Vendor assessment criteria"],
    testProcedure: { method: "Review supply chain security policy, supplier categorisation, and assessment criteria" },
    domain: "Supply Chain",
    weight: 3,
  },
  {
    controlId: "CIR-2024-2690-7-2",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 7(2) CIR 2024/2690",
    clausePath: "CIR.Art.7.2",
    shortTitle: "Supplier security requirements in contracts",
    obligationText: "Relevant entities shall include in their agreements with suppliers and service providers appropriate security requirements and obligations.",
    obligationVerb: "shall include",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["Contract templates", "Security clauses", "SLA agreements"],
    testProcedure: { method: "Review standard contract clauses for security requirements and verify inclusion in key supplier agreements" },
    domain: "Supply Chain",
    weight: 2,
  },
  {
    controlId: "CIR-2024-2690-8-1",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 8(1) CIR 2024/2690",
    clausePath: "CIR.Art.8.1",
    shortTitle: "Vulnerability handling and disclosure",
    obligationText: "Relevant entities shall establish and apply procedures for identifying, evaluating, treating and managing vulnerabilities in the network and information systems they use.",
    obligationVerb: "shall establish",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["Vulnerability management policy", "Scanning reports", "Patch management records"],
    testProcedure: { method: "Review vulnerability management procedures, scanning frequency, and patch management metrics" },
    domain: "Security Operations",
    weight: 2,
  },
  {
    controlId: "CIR-2024-2690-9-1",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 9(1) CIR 2024/2690",
    clausePath: "CIR.Art.9.1",
    shortTitle: "Cybersecurity awareness and training programmes",
    obligationText: "Relevant entities shall ensure that all staff including management receive appropriate cybersecurity awareness training and are informed of relevant cyber threats.",
    obligationVerb: "shall ensure",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["Training programme", "Awareness materials", "Completion records", "Phishing test results"],
    testProcedure: { method: "Review cybersecurity awareness programme, verify staff training completion rates and phishing simulation results" },
    domain: "Governance",
    weight: 2,
  },
  {
    controlId: "CIR-2024-2690-10-1",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 10(1) CIR 2024/2690",
    clausePath: "CIR.Art.10.1",
    shortTitle: "Use of cryptography and encryption",
    obligationText: "Relevant entities shall establish and implement a policy on the use of cryptography, including encryption where appropriate, for the protection of data in transit and at rest.",
    obligationVerb: "shall establish",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["Cryptography policy", "Encryption implementation records", "Key management procedure"],
    testProcedure: { method: "Review cryptography policy, verify encryption for data at rest and in transit, review key management" },
    domain: "Security Operations",
    weight: 2,
  },
  {
    controlId: "CIR-2024-2690-11-1",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 11(1) CIR 2024/2690",
    clausePath: "CIR.Art.11.1",
    shortTitle: "Access control policies and procedures",
    obligationText: "Relevant entities shall establish and implement access control policies based on business and security requirements, including least privilege, separation of duties and role-based access.",
    obligationVerb: "shall establish",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["Access control policy", "Access review records", "Privileged access management"],
    testProcedure: { method: "Review access control policy, verify least privilege implementation, review periodic access reviews" },
    domain: "Access Control",
    weight: 2,
  },
  {
    controlId: "CIR-2024-2690-11-2",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 11(2) CIR 2024/2690",
    clausePath: "CIR.Art.11.2",
    shortTitle: "Multi-factor authentication",
    obligationText: "Relevant entities shall implement multi-factor authentication for access to their network and information systems, in particular for remote access and access to critical systems.",
    obligationVerb: "shall implement",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["MFA deployment records", "Authentication policy", "Remote access procedures"],
    testProcedure: { method: "Verify MFA is deployed for remote access and critical systems, review authentication mechanisms" },
    domain: "Access Control",
    weight: 3,
  },
  {
    controlId: "CIR-2024-2690-12-1",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 12(1) CIR 2024/2690",
    clausePath: "CIR.Art.12.1",
    shortTitle: "Asset management and inventory",
    obligationText: "Relevant entities shall maintain an inventory of assets, including hardware, software, data and network components, relevant to the security of their network and information systems.",
    obligationVerb: "shall maintain",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["Asset register", "CMDB", "Network diagrams", "Data classification"],
    testProcedure: { method: "Review asset inventory completeness, verify regular updates and data classification" },
    domain: "Security Operations",
    weight: 2,
  },
  {
    controlId: "CIR-2024-2690-13-1",
    sourceKey: "CIR_2024_2690",
    legalRef: "Article 13(1) CIR 2024/2690",
    clausePath: "CIR.Art.13.1",
    shortTitle: "Security effectiveness assessment and testing",
    obligationText: "Relevant entities shall regularly assess the effectiveness of their cybersecurity risk-management measures including through vulnerability assessments and penetration testing.",
    obligationVerb: "shall assess",
    applicability: { entities: ["DNS", "TLD", "CLOUD", "DC", "CDN", "MSP", "MSSP", "ONLINE_PLATFORM", "TRUST"] },
    evidenceTypes: ["Penetration test reports", "Vulnerability assessment results", "Security audit findings"],
    testProcedure: { method: "Review latest pen test and vulnerability assessment results, verify regular testing schedule" },
    domain: "Risk Management",
    weight: 2,
  },
];

async function autoImportFromJsonFile(): Promise<void> {
  const fs = await import("fs");
  const path = await import("path");
  const controlsPath = path.join(process.cwd(), "data", "atomic_controls_nis2_optionB.json");
  if (!fs.existsSync(controlsPath)) {
    console.log("No JSON import file found at data/atomic_controls_nis2_optionB.json, skipping auto-import.");
    return;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(controlsPath, "utf-8"));
    const controls: any[] = raw.controls || raw;
    if (!Array.isArray(controls) || controls.length === 0) {
      console.log("Import file is empty or invalid, skipping auto-import.");
      return;
    }

    const { validateControls, computeDiff } = await import("./import-service");
    const validation = validateControls(controls);
    if (!validation.valid) {
      console.log(`Import file validation failed (${validation.errors.length} errors), skipping auto-import.`);
      return;
    }

    const diff = await computeDiff(controls);
    if (diff.added.length === 0) {
      console.log(`Auto-import: no new controls to add (${diff.unchanged.length} unchanged, ${diff.updated.length} updated).`);
      return;
    }

    const { runImport } = await import("./import-service");
    const legalSourcesPath = path.join(process.cwd(), "data", "legal_sources.json");
    let legalSourcesData: any[] = [];
    if (fs.existsSync(legalSourcesPath)) {
      legalSourcesData = JSON.parse(fs.readFileSync(legalSourcesPath, "utf-8"));
    }

    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const [adminUser] = await db.select({ id: users.id }).from(users).where(eq(users.role, "PLATFORM_ADMIN")).limit(1);
    if (!adminUser) {
      console.log("Auto-import: no admin user found, skipping.");
      return;
    }

    const result = await runImport(controls, legalSourcesData, "IMPORT", adminUser.id);
    if (result.success) {
      console.log(`Auto-import completed: +${result.addedCount} added, ~${result.updatedCount} updated, =${result.unchangedCount} unchanged`);
    } else {
      console.log(`Auto-import failed: ${result.errors?.join(", ")}`);
    }
  } catch (error: any) {
    console.log(`Auto-import error: ${error.message}`);
  }
}

export async function seedAtomicControls(): Promise<void> {
  const existingControls = await storage.getAllAtomicControls();
  if (existingControls.length > 0) {
    console.log(`Atomic controls already seeded (${existingControls.length} controls found).`);
    await autoImportFromJsonFile();
    return;
  }

  console.log("Seeding atomic controls library...");

  const nis2Source = await storage.createLegalSource({
    key: "NIS2_2022_2555",
    title: "Directive (EU) 2022/2555 (NIS2 Directive)",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32022L2555",
    version: "2022-12-14",
  });

  const cirSource = await storage.createLegalSource({
    key: "CIR_2024_2690",
    title: "Commission Implementing Regulation (EU) 2024/2690",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=OJ:L_202402690",
    version: "2024-10-17",
  });

  let createdCount = 0;
  const allControls = [...NIS2_CONTROLS, ...CIR_CONTROLS];

  for (const ctrl of allControls) {
    await storage.createAtomicControl({
      controlId: ctrl.controlId,
      sourceKey: ctrl.sourceKey,
      legalRef: ctrl.legalRef,
      clausePath: ctrl.clausePath,
      shortTitle: ctrl.shortTitle,
      obligationText: ctrl.obligationText,
      obligationVerb: ctrl.obligationVerb || null,
      applicability: ctrl.applicability,
      evidenceTypes: ctrl.evidenceTypes,
      testProcedure: ctrl.testProcedure,
      domain: ctrl.domain,
      weight: ctrl.weight,
    });
    createdCount++;
  }

  const crypto = await import("crypto");
  const hash = crypto.createHash("sha256").update(JSON.stringify(allControls)).digest("hex").slice(0, 16);

  await storage.createControlPackVersion({
    sourceKey: "NIS2_2022_2555",
    generator: "atomic-seed.ts v1.0",
    hash: hash,
    controlCount: NIS2_CONTROLS.length,
    notes: "Initial NIS2 atomic controls from Articles 20-29",
  });

  await storage.createControlPackVersion({
    sourceKey: "CIR_2024_2690",
    generator: "atomic-seed.ts v1.0",
    hash: hash,
    controlCount: CIR_CONTROLS.length,
    notes: "Initial CIR 2024/2690 atomic controls from Articles 3-13",
  });

  console.log(`Seeded ${createdCount} atomic controls (${NIS2_CONTROLS.length} NIS2 + ${CIR_CONTROLS.length} CIR)`);

  await autoImportFromJsonFile();
}
