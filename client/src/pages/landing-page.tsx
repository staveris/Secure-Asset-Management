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
} from "lucide-react";
import faviconLogo from "@assets/browser_1770569283054.png";
import companyLogo from "@assets/Color_logo_with_background_1770546085701.png";

const features = [
  {
    icon: Shield,
    title: "NIS2 Directive Compliance",
    description: "Complete coverage of 41 control objectives from Directive 2022/2555, spanning governance, risk management, and incident response frameworks.",
    color: "from-blue-500/20 to-blue-600/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Scale,
    title: "CIR 2024/2690 Controls",
    description: "Full implementation of 17 sector-specific requirements for digital infrastructure, ICT service management, and digital providers.",
    color: "from-violet-500/20 to-violet-600/20",
    iconColor: "text-violet-400",
  },
  {
    icon: FileCheck,
    title: "Evidence & Audit Readiness",
    description: "Secure evidence vault with intelligent linking to controls and automated generation of print-ready compliance documentation.",
    color: "from-emerald-500/20 to-emerald-600/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: Layers,
    title: "Atomic-Level Assessments",
    description: "Granular control breakdowns with obligation-level tracking, filtered by entity type and subsector for precise compliance mapping.",
    color: "from-cyan-500/20 to-cyan-600/20",
    iconColor: "text-cyan-400",
  },
  {
    icon: BarChart3,
    title: "Compliance Analytics",
    description: "Real-time dashboards with trend analysis, gap identification, and comprehensive reporting across your entire compliance posture.",
    color: "from-rose-500/20 to-rose-600/20",
    iconColor: "text-rose-400",
  },
];

const stats = [
  { value: "18", label: "NIS2 Sectors", description: "Industry sectors covered" },
  { value: "41", label: "Control Objectives", description: "Compliance checkpoints" },
  { value: "17", label: "CIR Controls", description: "Regulatory controls" },
  { value: "27", label: "EU Countries", description: "Member states supported" },
];

const capabilities = [
  { icon: Building2, label: "Multi-Tenant Architecture" },
  { icon: Lock, label: "End-to-End Encryption" },
  { icon: Users, label: "Role-Based Access Control" },
  { icon: Shield, label: "Two-Factor Authentication" },
];

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
                <span className="text-white font-semibold text-sm tracking-wide">NIS2 Platform</span>
                <span className="hidden sm:block text-slate-500 text-[10px] tracking-[0.12em] uppercase">by Tools of Tech</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <a href="#features" className="text-slate-400 text-sm px-3 py-2 rounded-md transition-colors" style={{ textDecoration: "none" }}>Features</a>
              <a href="#compliance" className="text-slate-400 text-sm px-3 py-2 rounded-md transition-colors" style={{ textDecoration: "none" }}>Compliance</a>
              <a href="#contact" className="text-slate-400 text-sm px-3 py-2 rounded-md transition-colors" style={{ textDecoration: "none" }}>Contact</a>
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

      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(56,139,248,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 60%)",
        }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] mb-8" data-testid="badge-regulation">
              <Globe className="w-4 h-4 text-blue-400" />
              <span className="text-blue-300/90 text-xs font-medium tracking-wider uppercase">
                EU Directive 2022/2555 & CIR 2024/2690
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight mb-6" data-testid="text-hero-title">
              Enterprise NIS2{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-400 to-violet-400">
                Compliance Platform
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 leading-relaxed mb-10 max-w-2xl mx-auto" data-testid="text-hero-description">
              Streamline your organization's path to NIS2 and CIR compliance with unified assessments, automated reporting timelines, and audit-ready evidence management.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button
                size="lg"
                onClick={() => navigate("/register")}
                className="bg-blue-600 text-white border-blue-500 px-8"
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8" data-testid="hero-stats">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-blue-400 text-xs font-semibold tracking-wider uppercase mb-0.5">{stat.label}</div>
                  <div className="text-slate-500 text-[11px]">{stat.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-blue-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3 block" data-testid="text-features-label">Platform Capabilities</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" data-testid="text-features-title">
              Everything You Need for NIS2 Compliance
            </h2>
            <p className="text-slate-400 text-base max-w-2xl mx-auto" data-testid="text-features-description">
              A comprehensive suite of tools designed to guide your organization through every aspect of NIS2 and CIR regulatory compliance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="features-grid">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-lg bg-white/[0.03] border border-white/[0.06] transition-all duration-300"
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
                { title: "Risk Assessment & Management", desc: "Systematic identification and mitigation of cybersecurity risks aligned with NIS2 requirements" },
                { title: "Incident Reporting Workflows", desc: "Automated timelines ensuring compliance with EU-mandated 24h, 72h, and 30-day reporting windows" },
                { title: "Supply Chain Security", desc: "Third-party risk management with comprehensive supplier assessment and monitoring" },
                { title: "Audit Trail & Evidence", desc: "Complete audit logging with tamper-proof records and secure evidence management" },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]" data-testid={`checklist-${item.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`}>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
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
              Ready to Achieve NIS2 Compliance?
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto mb-8" data-testid="text-cta-description">
              Join organizations across Europe who trust our platform to manage their NIS2 compliance journey. Get started today with a guided onboarding experience.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/register")}
                className="bg-blue-600 text-white border-blue-500 px-8"
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
                Empowering European organizations with enterprise-grade NIS2 compliance solutions.
              </p>
            </div>

            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Platform</h4>
              <div className="space-y-2.5">
                <a href="#features" className="block text-slate-400 text-sm" style={{ textDecoration: "none" }}>Features</a>
                <a href="#compliance" className="block text-slate-400 text-sm" style={{ textDecoration: "none" }}>Security</a>
                <button onClick={() => navigate("/login")} className="block text-slate-400 text-sm" data-testid="link-footer-login">Sign In</button>
                <button onClick={() => navigate("/register")} className="block text-slate-400 text-sm" data-testid="link-footer-register">Get Started</button>
              </div>
            </div>

            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Compliance</h4>
              <div className="space-y-2.5">
                <span className="block text-slate-400 text-sm">NIS2 Directive</span>
                <span className="block text-slate-400 text-sm">CIR 2024/2690</span>
                <span className="block text-slate-400 text-sm">Risk Management</span>
                <span className="block text-slate-400 text-sm">Incident Response</span>
              </div>
            </div>

            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Contact</h4>
              <div className="space-y-2.5">
                <a href="mailto:info@toolsoftech.eu" className="flex items-center gap-2 text-slate-400 text-sm" style={{ textDecoration: "none" }} data-testid="link-footer-email">
                  <Mail className="w-4 h-4 shrink-0" />
                  info@toolsoftech.eu
                </a>
                <a href="https://toolsoftech.eu" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-400 text-sm" style={{ textDecoration: "none" }} data-testid="link-footer-website">
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  toolsoftech.eu
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
