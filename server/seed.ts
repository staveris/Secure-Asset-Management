import { storage } from "./storage";
import { db } from "./db";
import { requirements, controlObjectives, users, tenants } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const nis2Requirements = [
  {
    code: "NIS2-GOV-01",
    title: "Management Body Accountability",
    description: "Management bodies of essential and important entities must approve cybersecurity risk-management measures and oversee their implementation.",
    nis2Article: "20",
    nis2Paragraph: "1",
    greekRef: "Law 5160/2024 Art. 14",
    category: "Governance & Accountability",
    controls: [
      { title: "Board-Level Cybersecurity Oversight", description: "Ensure the management body formally approves and oversees cybersecurity risk management measures.", guidance: "Document board resolutions, assign CISO reporting line." },
      { title: "Management Cybersecurity Training", description: "Members of management bodies must undergo cybersecurity training to assess risks and impact on services.", guidance: "Regular training sessions, documented attendance." },
    ],
  },
  {
    code: "NIS2-GOV-02",
    title: "Cybersecurity Training for Staff",
    description: "Entities shall offer similar training to employees on a regular basis to enable them to identify risks and assess cybersecurity impact.",
    nis2Article: "20",
    nis2Paragraph: "2",
    greekRef: "Law 5160/2024 Art. 14",
    category: "Governance & Accountability",
    controls: [
      { title: "Staff Awareness Training Program", description: "Implement regular cybersecurity awareness training for all staff members.", guidance: "Annual training, phishing simulations, completion tracking." },
    ],
  },
  {
    code: "NIS2-RM-01",
    title: "Risk Management Framework",
    description: "Implement appropriate and proportionate technical, operational and organisational measures to manage risks to security of network and information systems.",
    nis2Article: "21",
    nis2Paragraph: "1",
    greekRef: "Law 5160/2024 Art. 15",
    category: "Risk Management",
    controls: [
      { title: "Risk Assessment Methodology", description: "Establish a documented risk assessment methodology covering identification, analysis, and evaluation of cybersecurity risks.", guidance: "Use ISO 27005 or similar framework." },
      { title: "Risk Treatment Plan", description: "Maintain a risk treatment plan with clear ownership and timelines for mitigation actions.", guidance: "Map risks to controls, track remediation." },
    ],
  },
  {
    code: "NIS2-RM-02",
    title: "Policies on Risk Analysis & Information System Security",
    description: "Implement policies covering risk analysis and information system security as minimum measures.",
    nis2Article: "21",
    nis2Paragraph: "2(a)",
    greekRef: "Law 5160/2024 Art. 15",
    category: "Risk Management",
    controls: [
      { title: "Information Security Policy", description: "Maintain and enforce an information security policy approved by management.", guidance: "Annual review, signed acknowledgment by staff." },
      { title: "Acceptable Use Policy", description: "Define acceptable use of information systems and assets.", guidance: "Cover email, internet, BYOD, social media." },
    ],
  },
  {
    code: "NIS2-IR-01",
    title: "Incident Handling Procedures",
    description: "Implement incident handling procedures including detection, response, and recovery from security incidents.",
    nis2Article: "21",
    nis2Paragraph: "2(b)",
    greekRef: "Law 5160/2024 Art. 15",
    category: "Incident Handling",
    controls: [
      { title: "Incident Response Plan", description: "Maintain a documented incident response plan with defined roles and escalation procedures.", guidance: "Include RACI matrix, communication plan, playbooks." },
      { title: "Incident Detection Capabilities", description: "Deploy monitoring and detection mechanisms for security events.", guidance: "SIEM, IDS/IPS, log aggregation, 24/7 monitoring." },
      { title: "Incident Classification & Triage", description: "Define incident severity levels and triage procedures.", guidance: "Classify by impact, urgency, scope." },
    ],
  },
  {
    code: "NIS2-IR-02",
    title: "Incident Reporting (Art. 23)",
    description: "Significant incidents must be reported: early warning within 24h, notification within 72h, final report within 1 month.",
    nis2Article: "23",
    nis2Paragraph: "1-4",
    greekRef: "Law 5160/2024 Art. 17",
    category: "Incident Reporting",
    controls: [
      { title: "24-Hour Early Warning Process", description: "Establish process to submit early warning to CSIRT/authority within 24 hours of becoming aware of a significant incident.", guidance: "Define 'significant incident' criteria, pre-populate templates." },
      { title: "72-Hour Notification Process", description: "Process to submit incident notification within 72 hours with initial assessment of severity and impact.", guidance: "Template with severity, cross-border impact, affected users." },
      { title: "Final Report Process", description: "Process to submit final report within one month of notification including root cause, mitigation, cross-border impact.", guidance: "Post-incident review, lessons learned, corrective actions." },
    ],
  },
  {
    code: "NIS2-BC-01",
    title: "Business Continuity & Crisis Management",
    description: "Implement business continuity measures including backup management, disaster recovery, and crisis management.",
    nis2Article: "21",
    nis2Paragraph: "2(c)",
    greekRef: "Law 5160/2024 Art. 15",
    category: "Business Continuity",
    controls: [
      { title: "Business Continuity Plan", description: "Maintain a business continuity plan covering critical services.", guidance: "BIA, RTO/RPO definitions, testing schedule." },
      { title: "Backup Management", description: "Implement systematic backup procedures with regular testing.", guidance: "3-2-1 rule, encrypted backups, restoration tests." },
      { title: "Disaster Recovery Plan", description: "Maintain disaster recovery procedures for critical systems.", guidance: "Failover procedures, alternate site, regular DR drills." },
    ],
  },
  {
    code: "NIS2-SC-01",
    title: "Supply Chain Security",
    description: "Implement supply chain security measures including security-related aspects of supplier relationships.",
    nis2Article: "21",
    nis2Paragraph: "2(d)",
    greekRef: "Law 5160/2024 Art. 15",
    category: "Supply Chain Security",
    controls: [
      { title: "Supplier Risk Assessment", description: "Assess cybersecurity risks in supplier and service provider relationships.", guidance: "Due diligence questionnaires, risk scoring, periodic review." },
      { title: "Supplier Security Requirements", description: "Define and enforce cybersecurity requirements in supplier contracts.", guidance: "SLAs, right to audit, incident notification clauses." },
      { title: "Critical Supplier Monitoring", description: "Monitor critical suppliers for security posture changes and vulnerabilities.", guidance: "Continuous monitoring, threat intelligence, vendor scorecards." },
    ],
  },
  {
    code: "NIS2-SC-02",
    title: "Union-Level Supply Chain Assessments",
    description: "Participate in coordinated security risk assessments of critical supply chains where required.",
    nis2Article: "22",
    nis2Paragraph: "1",
    greekRef: null,
    category: "Supply Chain Security",
    controls: [
      { title: "Supply Chain Risk Assessment Participation", description: "Participate in and respond to coordinated EU-level supply chain risk assessments when notified.", guidance: "Track ENISA/EU coordination group requests." },
    ],
  },
  {
    code: "NIS2-SEC-01",
    title: "Network & Information Systems Acquisition Security",
    description: "Security in network and information systems acquisition, development and maintenance, including vulnerability handling and disclosure.",
    nis2Article: "21",
    nis2Paragraph: "2(e)",
    greekRef: "Law 5160/2024 Art. 15",
    category: "Systems Security",
    controls: [
      { title: "Secure Development Lifecycle", description: "Implement security measures in the acquisition, development, and maintenance of systems.", guidance: "SSDLC, code reviews, security testing." },
      { title: "Vulnerability Management", description: "Implement vulnerability handling and disclosure processes.", guidance: "Vulnerability scanning, patching SLAs, CVD policy." },
    ],
  },
  {
    code: "NIS2-SEC-02",
    title: "Effectiveness Assessment",
    description: "Implement policies and procedures to assess the effectiveness of cybersecurity risk-management measures.",
    nis2Article: "21",
    nis2Paragraph: "2(f)",
    greekRef: "Law 5160/2024 Art. 15",
    category: "Systems Security",
    controls: [
      { title: "Security Testing Program", description: "Regular assessment of cybersecurity measure effectiveness through testing.", guidance: "Penetration testing, red team exercises, tabletop exercises." },
      { title: "Security Metrics & KPIs", description: "Define and track security performance indicators.", guidance: "MTTR, patch compliance, training completion rates." },
    ],
  },
  {
    code: "NIS2-HYG-01",
    title: "Cyber Hygiene & Training",
    description: "Implement basic cyber hygiene practices and cybersecurity training.",
    nis2Article: "21",
    nis2Paragraph: "2(g)",
    greekRef: "Law 5160/2024 Art. 15",
    category: "Cyber Hygiene",
    controls: [
      { title: "Cyber Hygiene Baseline", description: "Implement and enforce basic cyber hygiene practices across the organization.", guidance: "Password policies, MFA, endpoint protection, software updates." },
      { title: "Role-Based Security Training", description: "Provide role-specific cybersecurity training based on job function.", guidance: "Developers, admins, executives get tailored content." },
    ],
  },
  {
    code: "NIS2-CRYPTO-01",
    title: "Cryptography & Encryption",
    description: "Implement policies and procedures regarding the use of cryptography and, where appropriate, encryption.",
    nis2Article: "21",
    nis2Paragraph: "2(h)",
    greekRef: "Law 5160/2024 Art. 15",
    category: "Cryptography",
    controls: [
      { title: "Encryption Policy", description: "Define policies for encryption at rest and in transit.", guidance: "TLS 1.2+, AES-256 for data at rest, key management." },
      { title: "Key Management", description: "Implement secure key management procedures.", guidance: "HSM usage, key rotation, access controls." },
    ],
  },
  {
    code: "NIS2-HR-01",
    title: "Human Resources Security",
    description: "Implement human resources security measures, access control policies, and asset management.",
    nis2Article: "21",
    nis2Paragraph: "2(i)",
    greekRef: "Law 5160/2024 Art. 15",
    category: "HR & Access Control",
    controls: [
      { title: "HR Security Controls", description: "Background checks, onboarding/offboarding security procedures.", guidance: "Vetting, NDA, security briefing, account deprovisioning." },
      { title: "Access Control Policy", description: "Implement role-based access control with least privilege.", guidance: "RBAC, periodic access reviews, privileged access management." },
      { title: "Asset Management", description: "Maintain inventory of information assets and their classification.", guidance: "Asset register, classification scheme, labeling." },
    ],
  },
  {
    code: "NIS2-MFA-01",
    title: "Multi-Factor Authentication",
    description: "Use of multi-factor authentication or continuous authentication solutions, and secured communications.",
    nis2Article: "21",
    nis2Paragraph: "2(j)",
    greekRef: "Law 5160/2024 Art. 15",
    category: "Authentication & Communications",
    controls: [
      { title: "Multi-Factor Authentication", description: "Deploy MFA for all privileged and remote access.", guidance: "Hardware tokens, authenticator apps, FIDO2." },
      { title: "Secure Communications", description: "Implement secured voice, video, and text communications.", guidance: "E2E encryption, secure messaging platforms, verified channels." },
    ],
  },
  {
    code: "NIS2-CERT-01",
    title: "Cybersecurity Certification",
    description: "Entities may be required to use certified ICT products, services and processes under European or national certification schemes.",
    nis2Article: "24",
    nis2Paragraph: "1-2",
    greekRef: "Law 5160/2024 Art. 18",
    category: "Certification & Standards",
    controls: [
      { title: "Certification Readiness", description: "Prepare for and maintain relevant cybersecurity certifications as required.", guidance: "ISO 27001, SOC 2, EU certification schemes." },
      { title: "Standards Alignment", description: "Align cybersecurity practices with European and international standards.", guidance: "EN standards, ENISA guidelines, sector-specific requirements." },
    ],
  },
  {
    code: "NIS2-REG-01",
    title: "Registration & Jurisdiction",
    description: "Entities must register with relevant authorities and provide required information.",
    nis2Article: "27",
    nis2Paragraph: "1-4",
    greekRef: "Law 5160/2024 Art. 21",
    category: "Registration & Jurisdiction",
    controls: [
      { title: "Entity Registration", description: "Register with the competent authority and maintain up-to-date registration information.", guidance: "Submit entity name, sector, contact details, IP ranges." },
    ],
  },
  {
    code: "NIS2-SHARE-01",
    title: "Information Sharing",
    description: "Entities may participate in voluntary cybersecurity information-sharing arrangements.",
    nis2Article: "29",
    nis2Paragraph: "1-2",
    greekRef: "Law 5160/2024 Art. 23",
    category: "Information Sharing",
    controls: [
      { title: "Threat Intelligence Sharing", description: "Participate in cybersecurity information sharing with peer entities and authorities.", guidance: "ISACs, MISP, TLP protocol, STIX/TAXII." },
      { title: "Voluntary Notification", description: "Establish process for voluntary notification of non-significant incidents or near-misses.", guidance: "Low-threshold reporting, near-miss logging." },
    ],
  },
  {
    code: "NIS2-AUDIT-01",
    title: "Supervision & Audit Readiness",
    description: "Entities must be prepared for supervisory activities including audits, inspections, and evidence requests.",
    nis2Article: "32",
    nis2Paragraph: "2",
    greekRef: "Law 5160/2024 Art. 26",
    category: "Audit Readiness",
    controls: [
      { title: "Audit Pack Preparation", description: "Maintain an audit-ready evidence pack covering all NIS2 obligations.", guidance: "Pre-assemble policies, logs, training records, test results." },
      { title: "Evidence Retention", description: "Implement evidence retention policy meeting regulatory requirements.", guidance: "Minimum retention periods, secure storage, integrity verification." },
      { title: "Audit Trail Maintenance", description: "Maintain comprehensive audit trails for security-relevant activities.", guidance: "System logs, access logs, change management records." },
    ],
  },
];

export async function seedDatabase() {
  const existingReqs = await storage.getAllRequirements();
  if (existingReqs.length > 0) {
    console.log("Database already seeded with NIS2 requirements");
  } else {
    console.log("Seeding NIS2 requirement library...");

    for (const req of nis2Requirements) {
      const requirement = await storage.createRequirement({
        code: req.code,
        title: req.title,
        description: req.description,
        nis2Article: req.nis2Article,
        nis2Paragraph: req.nis2Paragraph || null,
        greekRef: req.greekRef || null,
        category: req.category,
        isActive: true,
      });

      for (const ctrl of req.controls) {
        await storage.createControlObjective({
          requirementId: requirement.id,
          title: ctrl.title,
          description: ctrl.description,
          guidance: ctrl.guidance || null,
          evidenceTypes: [],
        });
      }
    }

    console.log(`Seeded ${nis2Requirements.length} requirements with control objectives`);
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set in production. " +
        "Refusing to start with hardcoded fallback credentials."
      );
    }
    console.warn(
      "WARNING: ADMIN_EMAIL / ADMIN_PASSWORD not set. " +
      "Using insecure development defaults — never deploy this way."
    );
  }

  const effectiveAdminEmail = adminEmail || "dev-admin@localhost.invalid";
  const effectiveAdminPassword = adminPassword || "change-me-before-production";

  const existingAdmin = await storage.getUserByEmail(effectiveAdminEmail);
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(effectiveAdminPassword, 12);
    await storage.createUser({
      email: effectiveAdminEmail,
      passwordHash,
      fullName: "Platform Administrator",
      role: "PLATFORM_ADMIN",
      isActive: true,
      tenantId: null,
    });
    console.log(`Created platform admin: ${effectiveAdminEmail}`);
  }

  if (process.env.NODE_ENV !== "production") {
    const existingDemo = await storage.getUserByEmail("demo@acmecorp.com");
    if (!existingDemo) {
      const tenant = await storage.createTenant({
        name: "ACME Corporation",
        sector: "technology",
        entityType: "essential",
      });

      const passwordHash = await bcrypt.hash("demo1234", 12);
      const demoUser = await storage.createUser({
        email: "demo@acmecorp.com",
        passwordHash,
        fullName: "Maria Schmidt",
        role: "TENANT_ADMIN",
        isActive: true,
        tenantId: tenant.id,
      });

      const assessment = await storage.createAssessment({
        tenantId: tenant.id,
        name: "Initial NIS2 Readiness Assessment",
        scope: "Full organizational scope covering all NIS2 obligations",
        createdBy: demoUser.id,
        status: "IN_PROGRESS",
      });

      const allControls = await storage.getAllControlObjectives();
      const statuses = ["NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED", "VERIFIED"] as const;
      const confidences = ["NONE", "LOW", "MEDIUM", "HIGH"] as const;

      for (let i = 0; i < allControls.length; i++) {
        const statusIdx = i < 8 ? 2 : i < 15 ? 1 : i < 25 ? 3 : 0;
        const maturity = i < 8 ? 3 : i < 15 ? 2 : i < 25 ? 4 : 0;
        const confIdx = i < 8 ? 2 : i < 15 ? 1 : i < 25 ? 3 : 0;
        await storage.createAssessmentResponse({
          assessmentId: assessment.id,
          controlObjectiveId: allControls[i].id,
          implementationStatus: statuses[statusIdx],
          maturityLevel: maturity,
          evidenceConfidence: confidences[confIdx],
          notes: null,
          updatedBy: demoUser.id,
        });
      }

      await storage.createTask({
        tenantId: tenant.id,
        title: "Complete incident response plan documentation",
        description: "Draft and approve the incident response plan covering NIS2 Art. 21(2)(b) requirements",
        priority: "HIGH",
        status: "IN_PROGRESS",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        ownerUserId: demoUser.id,
        controlObjectiveId: null,
      });

      await storage.createTask({
        tenantId: tenant.id,
        title: "Deploy multi-factor authentication",
        description: "Roll out MFA for all privileged accounts and remote access per Art. 21(2)(j)",
        priority: "CRITICAL",
        status: "TODO",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ownerUserId: demoUser.id,
        controlObjectiveId: null,
      });

      await storage.createTask({
        tenantId: tenant.id,
        title: "Conduct supplier security assessments",
        description: "Complete cybersecurity due diligence for all critical suppliers",
        priority: "MEDIUM",
        status: "TODO",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ownerUserId: demoUser.id,
        controlObjectiveId: null,
      });

      await storage.createTask({
        tenantId: tenant.id,
        title: "Update business continuity plan",
        description: "Review and update BCP with current RTO/RPO targets",
        priority: "MEDIUM",
        status: "DONE",
        dueDate: null,
        ownerUserId: demoUser.id,
        controlObjectiveId: null,
      });

      await storage.createSupplier({
        tenantId: tenant.id,
        name: "CloudSecure GmbH",
        criticality: "critical",
        services: "Cloud hosting, managed SOC, DDoS protection",
        notes: "Primary cloud provider, ISO 27001 certified",
      });

      await storage.createSupplier({
        tenantId: tenant.id,
        name: "NetGuard Solutions",
        criticality: "high",
        services: "Network monitoring, firewall management",
        notes: "Annual security assessment completed Q4 2024",
      });

      await storage.createSupplier({
        tenantId: tenant.id,
        name: "DataVault Storage",
        criticality: "medium",
        services: "Backup storage, archival services",
        notes: null,
      });

      await storage.createRiskItem({
        tenantId: tenant.id,
        title: "Ransomware attack on critical infrastructure",
        likelihood: 4,
        impact: 5,
        treatment: "MITIGATE",
        ownerUserId: demoUser.id,
        status: "TREATING",
      });

      await storage.createRiskItem({
        tenantId: tenant.id,
        title: "Supply chain compromise via third-party software",
        likelihood: 3,
        impact: 4,
        treatment: "MITIGATE",
        ownerUserId: demoUser.id,
        status: "MONITORING",
      });

      await storage.createRiskItem({
        tenantId: tenant.id,
        title: "Insider threat - privileged access misuse",
        likelihood: 2,
        impact: 4,
        treatment: "MITIGATE",
        ownerUserId: demoUser.id,
        status: "IDENTIFIED",
      });

      const detectedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      await storage.createIncidentCase({
        tenantId: tenant.id,
        title: "Phishing campaign targeting finance team",
        description: "Multiple phishing emails detected targeting finance department with credential harvesting links",
        severity: "HIGH",
        isSignificant: false,
        detectedAt,
        status: "CONTAINED",
        createdBy: demoUser.id,
      });

      console.log("Created demo tenant: ACME Corporation (demo@acmecorp.com / demo1234)");
    }
  }
}
