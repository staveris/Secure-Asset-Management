import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Building2, Lock, Mail, User, Check, X, Shield, FileCheck, AlertTriangle, BarChart3 } from "lucide-react";
import companyLogo from "@assets/Color_logo_with_background_1770546085701.png";
import faviconLogo from "@assets/browser_1770569283054.png";

function PasswordStrength({ password }: { password: string }) {
  const rules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const metCount = rules.filter(r => r.met).length;
  const strengthPct = (metCount / rules.length) * 100;
  const strengthColor = metCount <= 2 ? "bg-red-500" : metCount <= 3 ? "bg-yellow-500" : metCount <= 4 ? "bg-blue-500" : "bg-green-500";
  const strengthLabel = metCount <= 2 ? "Weak" : metCount <= 3 ? "Fair" : metCount <= 4 ? "Good" : "Strong";

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2" data-testid="password-strength">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${strengthColor}`}
            style={{ width: `${strengthPct}%` }}
          />
        </div>
        <span className="text-xs text-neutral-500">{strengthLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {rules.map((rule) => (
          <div key={rule.label} className="flex items-center gap-1.5 text-xs">
            {rule.met ? (
              <Check className="w-3 h-3 text-green-500 shrink-0" />
            ) : (
              <X className="w-3 h-3 text-neutral-400 shrink-0" />
            )}
            <span className={rule.met ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-400"}>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const features = [
  {
    icon: Shield,
    title: "Full NIS2 Coverage",
    description: "Annex I & II sector-aware assessments with domain-based control grouping",
  },
  {
    icon: AlertTriangle,
    title: "Incident Management",
    description: "EU reporting timeline tracking with early warning, notification & final report workflows",
  },
  {
    icon: FileCheck,
    title: "Evidence & Audit",
    description: "Secure evidence vault with smart linking, file uploads, and print-ready compliance reports",
  },
  {
    icon: BarChart3,
    title: "Compliance Analytics",
    description: "Real-time dashboards, trend analysis, and maturity scoring across your organization",
  },
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login, register, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regCompany, setRegCompany] = useState("");

  if (user) {
    navigate("/");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      navigate("/");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isPasswordValid = regPassword.length >= 8 &&
    /[A-Z]/.test(regPassword) &&
    /[a-z]/.test(regPassword) &&
    /[0-9]/.test(regPassword) &&
    /[^A-Za-z0-9]/.test(regPassword);

  const passwordsMatch = regPassword === regConfirmPassword && regConfirmPassword.length > 0;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      toast({ title: "Weak password", description: "Please meet all password requirements", variant: "destructive" });
      return;
    }
    if (!passwordsMatch) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are identical", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await register({
        email: regEmail,
        password: regPassword,
        fullName: regName,
        companyName: regCompany,
      });
      navigate("/onboarding");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" data-testid="auth-page">
      {/* Left branded panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-neutral-950">
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 17.32v34.64L30 60 0 51.96V17.32z' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }} />
        {/* Gradient accents */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/[0.02] blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-white/[0.03] blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top: Logo & branding */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img src={faviconLogo} alt="Tools of Tech" className="h-10 w-10 invert" data-testid="img-hero-icon" />
              <div>
                <span className="text-white text-lg font-semibold tracking-wide">TOOLS OF TECH</span>
                <span className="block text-neutral-500 text-xs tracking-[0.2em] uppercase">Innovation & Strategy</span>
              </div>
            </div>
          </div>

          {/* Center: Hero content */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <div className="mb-2">
              <span className="inline-block px-3 py-1 text-xs font-medium tracking-wider uppercase text-neutral-400 border border-neutral-800 rounded-full">
                EU Directive 2022/2555
              </span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4 tracking-tight">
              NIS2 Compliance<br />
              <span className="text-neutral-400">Made Simple</span>
            </h1>
            <p className="text-neutral-400 text-lg leading-relaxed mb-10">
              The complete platform for assessing, tracking, and demonstrating your organization's cybersecurity readiness under the NIS2 Directive.
            </p>

            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature) => (
                <div key={feature.title} className="group p-4 rounded-lg border border-neutral-800/60 bg-white/[0.02]">
                  <feature.icon className="w-5 h-5 text-neutral-500 mb-2.5" />
                  <h3 className="text-white text-sm font-medium mb-1">{feature.title}</h3>
                  <p className="text-neutral-500 text-xs leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Trust indicators */}
          <div className="flex items-center gap-6 text-neutral-600 text-xs">
            <span>Multi-tenant SaaS</span>
            <span className="w-1 h-1 rounded-full bg-neutral-700" />
            <span>GDPR Compliant</span>
            <span className="w-1 h-1 rounded-full bg-neutral-700" />
            <span>27 EU Member States</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col min-h-screen bg-background">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <img src={faviconLogo} alt="Tools of Tech" className="h-7 w-7 dark:invert" data-testid="img-mobile-icon" />
            <span className="font-semibold text-sm">NIS2 Platform</span>
          </div>
          <span className="text-xs text-muted-foreground px-2 py-0.5 border rounded-full">by Tools of Tech</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-[420px]">
            {/* Form header */}
            <div className="mb-8">
              <div className="hidden lg:flex items-center gap-2 mb-6">
                <img src={faviconLogo} alt="" className="h-6 w-6 dark:invert" />
                <span className="text-xs text-muted-foreground font-medium tracking-wider uppercase">NIS2 Readiness Platform</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight" data-testid="text-form-title">
                {isLogin ? "Welcome back" : "Get started"}
              </h2>
              <p className="text-muted-foreground mt-1.5 text-sm">
                {isLogin
                  ? "Sign in to continue to your compliance dashboard"
                  : "Create your account and start your NIS2 compliance journey"
                }
              </p>
            </div>

            {isLogin ? (
              <form onSubmit={handleLogin} className="space-y-4" data-testid="form-login">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@company.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-login-email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-login-password"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 no-default-hover-elevate" disabled={loading} data-testid="button-login">
                  {loading ? "Signing in..." : "Sign in"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="link-switch-register"
                  >
                    Don't have an account? <span className="font-medium underline underline-offset-4">Register your company</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3.5" data-testid="form-register">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-name"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Your full name"
                      className="pl-10"
                      required
                      data-testid="input-reg-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Work email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="pl-10"
                      required
                      data-testid="input-reg-email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-password"
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="pl-10"
                      required
                      data-testid="input-reg-password"
                    />
                  </div>
                  <PasswordStrength password={regPassword} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-confirm-password"
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="pl-10"
                      required
                      data-testid="input-reg-confirm-password"
                    />
                  </div>
                  {regConfirmPassword && !passwordsMatch && (
                    <p className="text-sm text-destructive" data-testid="text-password-mismatch">Passwords do not match</p>
                  )}
                  {passwordsMatch && (
                    <p className="text-sm text-green-600" data-testid="text-password-match">Passwords match</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-company">Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-company"
                      value={regCompany}
                      onChange={(e) => setRegCompany(e.target.value)}
                      placeholder="Your company name"
                      className="pl-10"
                      required
                      data-testid="input-reg-company"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 no-default-hover-elevate" disabled={loading || !isPasswordValid || !passwordsMatch} data-testid="button-register">
                  {loading ? "Creating account..." : "Create account"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="link-switch-login"
                  >
                    Already have an account? <span className="font-medium underline underline-offset-4">Sign in</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 text-center border-t">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-medium">Tools of Tech</span> &middot; Innovation & Strategy
          </p>
        </div>
      </div>
    </div>
  );
}
