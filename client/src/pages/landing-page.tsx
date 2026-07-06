import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Shield,
  FileCheck,
  BarChart3,
  Layers,
  Scale,
  ArrowRight,
  CheckCircle2,
  Globe,
  Building2,
  Lock,
  Users,
  ChevronRight,
  ExternalLink,
  Mail,
  Target,
  AlertTriangle,
  TrendingUp,
  ListTodo,
  Clock,
  Zap,
  Eye,
  FileText,
  Activity,
  Landmark,
  ShieldAlert,
  Network,
  Compass,
  GitCompare,
} from "lucide-react";
import faviconLogo from "@assets/browser_1770569283054.png";
import companyLogo from "@assets/Color_logo_with_background_1770546085701.png";
import { HeroGraphic } from "@/components/hero-graphic";

const features = [
  {
    icon: Shield,
    title: "NIS2 Directive Compliance",
    description: "Complete coverage of 41 control objectives and 107 atomic controls from Directive 2022/2555, spanning governance, risk management, and incident response.",
    color: "from-blue-500/20 to-blue-600/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Scale,
    title: "CIR 2024/2690 Controls",
    description: "Full implementation of the Commission Implementing Regulation for digital infrastructure, ICT service management, and digital providers.",
    color: "from-violet-500/20 to-violet-600/20",
    iconColor: "text-violet-400",
  },
  {
    icon: Landmark,
    title: "DORA — Regulation (EU) 2022/2554",
    description: "155 DORA controls for financial-sector digital operational resilience, with applicability tagging (full/simplified, ICT third-party, TLPT, CTPP) driven by a scope wizard.",
    color: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-400",
  },
  {
    icon: ShieldAlert,
    title: "Article 21 Cyber-Risk Register",
    description: "Tenant register seeded from a 100-entry NIS2 Art.21 risk library with residual scoring, treatment workflow, evidence linking, and acceptance trail.",
    color: "from-rose-500/20 to-rose-600/20",
    iconColor: "text-rose-400",
  },
  {
    icon: Compass,
    title: "NIS2 Applicability & Scoping",
    description: "Guided scoping wizard that classifies your organisation as Essential or Important under Annex I/II sectors and EU 2003/361 size rules — with a per-control applicability decision and an auditable \"why\" for every inclusion or exclusion.",
    color: "from-sky-500/20 to-blue-500/20",
    iconColor: "text-sky-400",
  },
  {
    icon: GitCompare,
    title: "Cross-Framework Mapping",
    description: "Editorial crosswalks linking NIS2 atomic controls to ISO/IEC 27001:2022 Annex A and NIST CSF 2.0 — answer once, receive review-gated propagation suggestions, and track coverage across frameworks in one matrix.",
    color: "from-fuchsia-500/20 to-violet-600/20",
    iconColor: "text-fuchsia-400",
  },
  {
    icon: Layers,
    title: "Atomic-Level Assessments",
    description: "Granular control breakdowns with obligation-level tracking, filtered by entity type and subsector for precise per-organisation compliance mapping.",
    color: "from-cyan-500/20 to-cyan-600/20",
    iconColor: "text-cyan-400",
  },
  {
    icon: Network,
    title: "Supply Chain & Third-Party Risk",
    description: "Questionnaire-driven supplier assessments (NIS2 + CIR mapped), service-dependency mapping, contract clause tracking, and ICT third-party register aligned to DORA.",
    color: "from-teal-500/20 to-emerald-500/20",
    iconColor: "text-teal-400",
  },
  {
    icon: Activity,
    title: "Incident Management & EU Reporting",
    description: "Article 23 timeline tracking with 24-hour early warning, 72-hour notification, and one-month final-report drafting — plus DORA major-incident handling.",
    color: "from-orange-500/20 to-red-500/20",
    iconColor: "text-orange-400",
  },
  {
    icon: FileCheck,
    title: "Evidence & Audit Readiness",
    description: "Secure evidence vault with intelligent linking to controls and automated generation of print-ready, sign-off-ready compliance documentation.",
    color: "from-emerald-500/20 to-emerald-600/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: BarChart3,
    title: "Compliance Analytics & Reports",
    description: "Real-time dashboards with trend analysis, risk heat maps, gap identification, weighted audit-readiness scoring, and audit-grade reporting across all frameworks.",
    color: "from-indigo-500/20 to-purple-500/20",
    iconColor: "text-indigo-400",
  },
];

const stats = [
  { value: "3", label: "EU Frameworks", description: "NIS2 · CIR · DORA" },
  { value: "300+", label: "Mapped Controls", description: "41 NIS2 + 17 CIR + 155 DORA + atomic" },
  { value: "100", label: "Art.21 Cyber Risks", description: "Pre-seeded risk register" },
  { value: "199", label: "ISO & NIST Controls", description: "Mapped via ISO 27001:2022 · NIST CSF 2.0 crosswalks" },
];

const capabilities = [
  { icon: Building2, label: "Multi-Tenant Architecture" },
  { icon: Lock, label: "End-to-End Encryption" },
  { icon: Users, label: "Role-Based Access Control" },
  { icon: Shield, label: "Two-Factor Authentication" },
];

const processSteps = [
  { step: "01", icon: Building2, title: "Onboard & Determine Scope", description: "Set up your tenant, then run the NIS2 scoping wizard to classify your entity as Essential or Important with a live applicability preview. Financial-sector tenants run the DORA scope wizard." },
  { step: "02", icon: Target, title: "Assess Across Frameworks", description: "Run unified assessments across NIS2 objectives, atomic controls, CIR requirements, and DORA controls — each scoped automatically to your applicability profile, with ISO 27001 and NIST CSF crosswalks surfaced per control." },
  { step: "03", icon: ListTodo, title: "Remediate & Track", description: "Generate and manage remediation tasks with priority-based workflows, due dates, owners, and Gantt-style project planning, tagged per framework." },
  { step: "04", icon: FileText, title: "Report, Sign-Off & Audit", description: "Produce print-ready audit-grade reports with Article 21 measure coverage, audit-readiness scoring, incident posture, and a document control + sign-off block." },
];

function MockComplianceDonut() {
  const segments = [
    { pct: 32, color: "#22c55e", label: "Implemented" },
    { pct: 18, color: "#3b82f6", label: "In Progress" },
    { pct: 12, color: "#f59e0b", label: "Partial" },
    { pct: 38, color: "#374151", label: "Not Started" },
  ];
  const r = 52, cx = 64, cy = 64, strokeWidth = 14;
  const circumference = 2 * Math.PI * r;
  let offset = -circumference * 0.25;

  return (
    <div className="flex items-center gap-4">
      <svg width="128" height="128" viewBox="0 0 128 128" className="shrink-0">
        {segments.map((seg, i) => {
          const dashLen = (seg.pct / 100) * circumference;
          const el = (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              className="transition-all duration-700"
              style={{ opacity: 0.9 }}
            />
          );
          offset += dashLen;
          return el;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">62%</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="9">Compliance</text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-slate-400 text-[11px]">{seg.label}</span>
            <span className="text-white text-[11px] font-semibold ml-auto">{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockTrendChart() {
  const points = [18, 24, 28, 35, 38, 42, 48, 52, 55, 58, 62];
  const w = 280, h = 80;
  const maxY = 100;
  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * w,
    y: h - (p / maxY) * h,
  }));
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <svg width="100%" height="80" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#trendGrad)" />
      <path d={line} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        i === coords.length - 1 && (
          <circle key={i} cx={c.x} cy={c.y} r="4" fill="#3b82f6" stroke="#0a0e1a" strokeWidth="2" />
        )
      ))}
    </svg>
  );
}

function MockRadarChart() {
  const categories = ["Governance", "Risk Mgmt", "Incident", "Supply Chain", "Continuity", "Access Ctrl"];
  const values = [0.75, 0.6, 0.45, 0.55, 0.4, 0.7];
  const cx = 90, cy = 90, maxR = 70;
  const n = categories.length;

  const pointsFor = (vals: number[]) =>
    vals.map((v, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      return `${cx + v * maxR * Math.cos(angle)},${cy + v * maxR * Math.sin(angle)}`;
    }).join(" ");

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg width="100%" height="180" viewBox="0 0 180 180" className="block">
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={Array.from({ length: n }, (_, i) => {
            const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
            return `${cx + level * maxR * Math.cos(angle)},${cy + level * maxR * Math.sin(angle)}`;
          }).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}
      {categories.map((_, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        return (
          <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(angle)} y2={cy + maxR * Math.sin(angle)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        );
      })}
      <polygon points={pointsFor(values)} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" />
      {categories.map((label, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const lx = cx + (maxR + 18) * Math.cos(angle);
        const ly = cy + (maxR + 18) * Math.sin(angle);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill="#94a3b8" fontSize="7" fontWeight="500">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function MockStatusBars() {
  const statuses = [
    { label: "Implemented", value: 32, max: 100, color: "#22c55e" },
    { label: "In Progress", value: 18, max: 100, color: "#3b82f6" },
    { label: "Partial", value: 12, max: 100, color: "#f59e0b" },
    { label: "Not Started", value: 38, max: 100, color: "#374151" },
  ];

  return (
    <div className="space-y-2">
      {statuses.map((s) => (
        <div key={s.label} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px]">{s.label}</span>
            <span className="text-white text-[10px] font-semibold">{s.value}%</span>
          </div>
          <div className="h-1.5 rounded-sm bg-white/[0.04] overflow-hidden">
            <div className="h-full rounded-sm transition-all duration-700" style={{ width: `${s.value}%`, backgroundColor: s.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MockHeatMap() {
  const rows = [
    { label: "Critical", cells: [0, 1, 2, 0, 0] },
    { label: "Major", cells: [0, 0, 3, 1, 0] },
    { label: "Moderate", cells: [1, 2, 0, 1, 0] },
    { label: "Minor", cells: [0, 1, 0, 2, 1] },
    { label: "Negligible", cells: [0, 0, 1, 0, 0] },
  ];
  const cols = ["V.Low", "Low", "Med", "High", "V.High"];

  const cellColor = (val: number) => {
    if (val === 0) return "rgba(255,255,255,0.02)";
    if (val === 1) return "rgba(250,204,21,0.25)";
    if (val === 2) return "rgba(249,115,22,0.35)";
    return "rgba(239,68,68,0.45)";
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-0.5">
        <div className="w-14 shrink-0" />
        {cols.map((c) => (
          <div key={c} className="flex-1 text-center text-[7px] text-slate-500 font-medium">{c}</div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-0.5">
          <div className="w-14 shrink-0 text-[7px] text-slate-500 text-right pr-1 font-medium">{row.label}</div>
          {row.cells.map((val, i) => (
            <div
              key={i}
              className="flex-1 aspect-square flex items-center justify-center rounded-sm text-[9px] font-bold"
              style={{ backgroundColor: cellColor(val), color: val > 0 ? "rgba(255,255,255,0.8)" : "transparent" }}
            >
              {val > 0 ? val : ""}
            </div>
          ))}
        </div>
      ))}
      <div className="text-center text-[7px] text-slate-500 mt-1">Likelihood →</div>
    </div>
  );
}

function MockGanttBars() {
  const tasks = [
    { label: "Risk Assessment", start: 0, width: 40, color: "#ef4444", prio: "Critical" },
    { label: "Access Control Policy", start: 10, width: 35, color: "#f59e0b", prio: "High" },
    { label: "Incident Response Plan", start: 20, width: 45, color: "#3b82f6", prio: "Medium" },
    { label: "Supplier Review", start: 35, width: 30, color: "#3b82f6", prio: "Medium" },
    { label: "DR Testing", start: 50, width: 25, color: "#22c55e", prio: "Done" },
  ];

  return (
    <div className="space-y-1.5">
      {tasks.map((t) => (
        <div key={t.label} className="flex items-center gap-2">
          <span className="text-[8px] text-slate-400 w-24 shrink-0 truncate text-right">{t.label}</span>
          <div className="flex-1 h-4 relative bg-white/[0.02] rounded-sm overflow-hidden">
            <div
              className="absolute top-0.5 bottom-0.5 rounded-sm"
              style={{ left: `${t.start}%`, width: `${t.width}%`, backgroundColor: t.color, opacity: 0.8 }}
            />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-end gap-3 mt-1">
        {[
          { label: "Critical", color: "#ef4444" },
          { label: "High", color: "#f59e0b" },
          { label: "Medium", color: "#3b82f6" },
          { label: "Done", color: "#22c55e" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span className="w-2 h-1.5 rounded-sm" style={{ backgroundColor: l.color }} />
            <span className="text-[7px] text-slate-500">{l.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#0f1424] to-[#0a0e1a] overflow-hidden" data-testid="dashboard-preview">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        <span className="text-slate-500 text-[10px] ml-2 font-mono">NIS2 Compliance Dashboard</span>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: "Compliance", value: "62%", color: "text-green-400", icon: Target },
            { label: "Maturity", value: "3.2", color: "text-blue-400", icon: TrendingUp },
            { label: "Active Tasks", value: "24", color: "text-amber-400", icon: ListTodo },
            { label: "Evidence", value: "18", color: "text-emerald-400", icon: FileCheck },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-md bg-white/[0.03] border border-white/[0.06] p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-[9px]">{kpi.label}</span>
                <kpi.icon className={`w-3 h-3 ${kpi.color}`} />
              </div>
              <div className={`text-base font-bold ${kpi.color}`}>{kpi.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-md bg-white/[0.03] border border-white/[0.06] p-3">
            <div className="text-[10px] text-slate-400 font-semibold mb-2 uppercase tracking-wider">Compliance Score</div>
            <MockComplianceDonut />
          </div>

          <div className="rounded-md bg-white/[0.03] border border-white/[0.06] p-3">
            <div className="text-[10px] text-slate-400 font-semibold mb-2 uppercase tracking-wider">Domain Maturity</div>
            <MockRadarChart />
          </div>
        </div>

        <div className="rounded-md bg-white/[0.03] border border-white/[0.06] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Compliance Trend</div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-green-400 text-[10px] font-semibold">+12%</span>
            </div>
          </div>
          <MockTrendChart />
          <div className="flex items-center justify-between mt-2">
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((m) => (
              <span key={m} className="text-[7px] text-slate-500">{m}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsPreview() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#0f1424] to-[#0a0e1a] overflow-hidden" data-testid="reports-preview">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        <span className="text-slate-500 text-[10px] ml-2 font-mono">Compliance Report & Analysis</span>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-md bg-white/[0.03] border border-white/[0.06] p-3">
            <div className="text-[10px] text-slate-400 font-semibold mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> Risk Heat Map
            </div>
            <MockHeatMap />
          </div>

          <div className="rounded-md bg-white/[0.03] border border-white/[0.06] p-3">
            <div className="text-[10px] text-slate-400 font-semibold mb-2 uppercase tracking-wider">Implementation Status</div>
            <MockStatusBars />
          </div>
        </div>

        <div className="rounded-md bg-white/[0.03] border border-white/[0.06] p-3">
          <div className="text-[10px] text-slate-400 font-semibold mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Project Plan (Gantt View)
          </div>
          <MockGanttBars />
        </div>

        <div className="space-y-2">
          {[
            { severity: "success", title: "Strong Governance Controls", detail: "Board oversight and policy frameworks at 85% implementation.", color: "#22c55e" },
            { severity: "warning", title: "Supply Chain Gaps Identified", detail: "3 suppliers require updated security assessments by Q2.", color: "#f59e0b" },
            { severity: "critical", title: "Incident Response Below Target", detail: "Response procedures at 35% — prioritize remediation.", color: "#ef4444" },
          ].map((insight) => (
            <div
              key={insight.title}
              className="rounded-md bg-white/[0.03] border border-white/[0.06] p-2.5"
              style={{ borderLeftWidth: "3px", borderLeftColor: insight.color }}
            >
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: insight.color + "18" }}>
                  <Activity className="w-2.5 h-2.5" style={{ color: insight.color }} />
                </div>
                <div>
                  <div className="text-white text-[10px] font-semibold">{insight.title}</div>
                  <div className="text-slate-400 text-[9px] mt-0.5">{insight.detail}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-[#0a0e1a]" data-testid="landing-page">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]" style={{ background: "rgba(10, 14, 26, 0.85)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3" data-testid="nav-brand">
              <img src={companyLogo} alt="Tools of Tech" className="h-10 rounded-md object-contain" />
              <div>
                <span className="text-white font-semibold text-sm tracking-wide">CyberResilience360</span>
                <span className="hidden sm:block text-slate-500 text-[10px] tracking-[0.12em] uppercase">by Tools of Tech</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <a href="#features" className="text-slate-400 text-sm px-3 py-2 rounded-md" style={{ textDecoration: "none" }} data-testid="link-nav-features">Features</a>
              <a href="#preview" className="text-slate-400 text-sm px-3 py-2 rounded-md" style={{ textDecoration: "none" }} data-testid="link-nav-preview">Preview</a>
              <a href="#how-it-works" className="text-slate-400 text-sm px-3 py-2 rounded-md" style={{ textDecoration: "none" }} data-testid="link-nav-how-it-works">How It Works</a>
              <a href="#compliance" className="text-slate-400 text-sm px-3 py-2 rounded-md" style={{ textDecoration: "none" }} data-testid="link-nav-security">Security</a>
              <a href="#contact" className="text-slate-400 text-sm px-3 py-2 rounded-md" style={{ textDecoration: "none" }} data-testid="link-nav-contact">Contact</a>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="text-slate-300 border-0"
                onClick={() => navigate("/login")}
                data-testid="button-nav-login"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate("/register")}
                className="bg-blue-600 text-white border-blue-500"
                data-testid="button-nav-register"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(56,139,248,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 60%)",
        }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-16">
            {/* Left — text content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] mb-8" data-testid="badge-regulation">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="text-blue-300/90 text-xs font-medium tracking-wider uppercase">
                  NIS2 · CIR · DORA — EU Cyber Resilience Suite
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight mb-4" data-testid="text-hero-title">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-400 to-violet-400">
                  CyberResilience360
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-3 max-w-xl font-medium" data-testid="text-hero-tagline">
                One platform. Three EU frameworks. Audit-grade evidence.
              </p>

              <p className="text-base sm:text-lg text-slate-400 leading-relaxed mb-10 max-w-xl" data-testid="text-hero-description">
                Unified compliance for the NIS2 Directive, Commission Implementing Regulation 2024/2690, and the Digital Operational Resilience Act (DORA). Guided applicability scoping, enterprise-grade assessments, cross-framework mapping to ISO 27001 and NIST CSF, EU incident-reporting timelines, and sign-off-ready reporting in a single multi-tenant SaaS.
              </p>

              <div className="flex flex-wrap items-center gap-2 mb-10" data-testid="hero-framework-chips">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold tracking-wider uppercase">
                  <Lock className="w-3 h-3" /> NIS2 · 2022/2555
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[11px] font-semibold tracking-wider uppercase">
                  <Scale className="w-3 h-3" /> CIR · 2024/2690
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold tracking-wider uppercase">
                  <Landmark className="w-3 h-3" /> DORA · 2022/2554
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold tracking-wider uppercase">
                  <GitCompare className="w-3 h-3" /> ISO 27001 · NIST CSF Mapped
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/register")}
                  className="bg-blue-600 text-white border-blue-500"
                  data-testid="button-hero-get-started"
                >
                  Start Compliance Journey
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="border-white/[0.15] text-slate-300 bg-white/[0.04]"
                  style={{ backdropFilter: "blur(8px)" }}
                  data-testid="button-hero-sign-in"
                >
                  Sign In to Dashboard
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Right — hero graphic */}
            <div className="flex justify-center lg:justify-end">
              <HeroGraphic />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 border-t border-white/[0.06] pt-12" data-testid="hero-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-blue-400 text-xs font-semibold tracking-wider uppercase mb-0.5">{stat.label}</div>
                <div className="text-slate-500 text-[11px]">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="relative py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-blue-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3 block" data-testid="text-features-label">Platform Capabilities</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" data-testid="text-features-title">
              Built for NIS2, CIR & DORA in One Place
            </h2>
            <p className="text-slate-400 text-base max-w-2xl mx-auto" data-testid="text-features-description">
              A comprehensive suite of tools designed to guide your organisation through every aspect of EU cybersecurity and digital operational resilience regulation — from atomic control assessments to executive sign-off.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="features-grid">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                data-testid={`feature-card-${feature.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`}
              >
                <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${feature.color} border border-white/[0.08] flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                </div>
                <h3 className="text-white font-semibold text-base mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="preview" className="relative py-20 lg:py-28">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 60% 50% at 30% 50%, rgba(56,139,248,0.05) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 70% 50%, rgba(139,92,246,0.04) 0%, transparent 70%)",
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-blue-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3 block" data-testid="text-preview-label">Platform Preview</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" data-testid="text-preview-title">
              Powerful Analytics at Your Fingertips
            </h2>
            <p className="text-slate-400 text-base max-w-2xl mx-auto" data-testid="text-preview-description">
              From real-time compliance dashboards to detailed risk analysis reports, get the insights you need to make data-driven compliance decisions.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Compliance Dashboard</h3>
                  <p className="text-slate-500 text-[11px]">Real-time KPIs, trend analysis, and domain maturity radar</p>
                </div>
              </div>
              <DashboardPreview />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Reports & Analysis</h3>
                  <p className="text-slate-500 text-[11px]">Risk heat maps, project timelines, and compliance insights</p>
                </div>
              </div>
              <ReportsPreview />
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Eye, label: "Real-Time Monitoring", desc: "Live compliance score tracking" },
              { icon: BarChart3, label: "Trend Analysis", desc: "Historical compliance progression" },
              { icon: AlertTriangle, label: "Risk Heat Maps", desc: "5x5 impact-likelihood matrix" },
              { icon: Zap, label: "Instant Reports", desc: "Print-ready A4 documentation" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]" data-testid={`preview-feature-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <item.icon className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-white text-sm font-medium">{item.label}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-blue-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3 block" data-testid="text-process-label">How It Works</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" data-testid="text-process-title">
              Your Path to EU Cyber Resilience
            </h2>
            <p className="text-slate-400 text-base max-w-2xl mx-auto" data-testid="text-process-description">
              Follow our structured four-step process to achieve and maintain compliance with the NIS2 Directive, CIR 2024/2690, and DORA — without duplicating effort across frameworks.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5" data-testid="process-steps">
            {processSteps.map((step) => (
              <div
                key={step.step}
                className="relative p-6 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                data-testid={`step-${step.step}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-blue-500/40 text-3xl font-bold font-mono">{step.step}</span>
                  <div className="w-9 h-9 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/[0.08] flex items-center justify-center">
                    <step.icon className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                </div>
                <h3 className="text-white font-semibold text-sm mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="compliance" className="relative py-20 lg:py-28">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 50% 60% at 50% 50%, rgba(56,139,248,0.04) 0%, transparent 70%)",
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span className="text-blue-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3 block" data-testid="text-security-label">Enterprise Security</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6" data-testid="text-security-title">
                Built for Enterprise-Grade Security
              </h2>
              <p className="text-slate-400 text-base leading-relaxed mb-8" data-testid="text-security-description">
                Our platform is designed with security at its core, implementing the same standards we help our clients achieve. Every layer of the application follows security best practices.
              </p>
              <div className="grid grid-cols-2 gap-4" data-testid="capabilities-grid">
                {capabilities.map((cap) => (
                  <div key={cap.label} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]" data-testid={`capability-${cap.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <cap.icon className="w-5 h-5 text-blue-400 shrink-0" />
                    <span className="text-slate-300 text-sm">{cap.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4" data-testid="compliance-checklist">
              {[
                { title: "Risk Assessment & Management", desc: "Article 21 cyber-risk register with 100 pre-seeded entries, residual scoring, treatment workflow, and acceptance trail.", icon: Target },
                { title: "Supply Chain & ICT Third-Party Risk", desc: "Supplier assessments mapped to NIS2 Art. 21(2)(d) and the DORA ICT third-party register requirements.", icon: Users },
                { title: "DORA Digital Operational Resilience", desc: "Scope-aware control set for financial entities — applicability tags for simplified scope, TLPT, CTPP, and ICT TPPs.", icon: Landmark },
                { title: "Scoping & Cross-Framework Coverage", desc: "NIS2 applicability engine with an auditable inclusion reason per control, plus ISO 27001 and NIST CSF coverage mapping with human-approved propagation.", icon: GitCompare },
                { title: "Audit Trail & Evidence Vault", desc: "Tamper-evident audit logs, secure evidence storage, and document control with formal Prepared / Reviewed / Approved sign-off.", icon: FileCheck },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]" data-testid={`checklist-${item.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`}>
                  <div className="w-9 h-9 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-4.5 h-4.5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm mb-1">{item.title}</h4>
                    <p className="text-slate-400 text-[13px] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-10 sm:p-14 rounded-2xl bg-gradient-to-br from-blue-600/10 to-violet-600/10 border border-white/[0.08]" data-testid="cta-section">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" data-testid="text-cta-title">
              Ready to Unify NIS2, CIR & DORA Compliance?
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto mb-8" data-testid="text-cta-description">
              Join organisations across Europe who trust CyberResilience360 to run their cybersecurity and digital operational resilience programmes end-to-end. Get started today with a guided onboarding experience.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/register")}
                className="bg-blue-600 text-white border-blue-500"
                data-testid="button-cta-register"
              >
                Create Your Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/[0.15] text-slate-300 bg-white/[0.04]"
                style={{ backdropFilter: "blur(8px)" }}
                asChild
                data-testid="button-cta-contact"
              >
                <a href="mailto:info@toolsoftech.eu">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Sales
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer id="contact" className="border-t border-white/[0.06] py-12" data-testid="landing-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src={companyLogo} alt="Tools of Tech" className="h-10 rounded-md object-contain" />
                <div>
                  <span className="text-white font-semibold text-sm">Tools of Tech P.C.</span>
                  <span className="block text-slate-500 text-[10px] tracking-[0.12em] uppercase">Innovation & Strategy</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Empowering European organisations with enterprise-grade NIS2, CIR, and DORA compliance solutions.
              </p>
            </div>

            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Platform</h4>
              <div className="space-y-2.5">
                <a href="#features" className="block text-slate-400 text-sm" style={{ textDecoration: "none" }} data-testid="link-footer-features">Features</a>
                <a href="#preview" className="block text-slate-400 text-sm" style={{ textDecoration: "none" }} data-testid="link-footer-preview">Preview</a>
                <a href="#compliance" className="block text-slate-400 text-sm" style={{ textDecoration: "none" }} data-testid="link-footer-security">Security</a>
                <button onClick={() => navigate("/login")} className="block text-slate-400 text-sm" data-testid="link-footer-login">Sign In</button>
                <button onClick={() => navigate("/register")} className="block text-slate-400 text-sm" data-testid="link-footer-register">Get Started</button>
              </div>
            </div>

            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Frameworks</h4>
              <div className="space-y-2.5">
                <span className="block text-slate-400 text-sm">NIS2 Directive (2022/2555)</span>
                <span className="block text-slate-400 text-sm">CIR 2024/2690</span>
                <span className="block text-slate-400 text-sm">DORA (EU 2022/2554)</span>
                <span className="block text-slate-400 text-sm">Article 21 Risk Register</span>
                <span className="block text-slate-400 text-sm">NIS2 Applicability Scoping</span>
                <span className="block text-slate-400 text-sm">ISO 27001 · NIST CSF Mapping</span>
                <span className="block text-slate-400 text-sm">Incident Reporting (Art. 23)</span>
              </div>
            </div>

            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Contact</h4>
              <div className="space-y-2.5">
                <a href="mailto:info@toolsoftech.eu" className="flex items-center gap-2 text-slate-400 text-sm" style={{ textDecoration: "none" }} data-testid="link-footer-email">
                  <Mail className="w-4 h-4 shrink-0" />
                  info@toolsoftech.eu
                </a>
                <a href="https://toolsoftech.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-400 text-sm" style={{ textDecoration: "none" }} data-testid="link-footer-website">
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  toolsoftech.com
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-xs" data-testid="text-copyright">
              &copy; {new Date().getFullYear()} Tools of Tech P.C. All rights reserved.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              {capabilities.slice(0, 3).map((cap) => (
                <div key={cap.label} className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500/70" />
                  <span>{cap.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
