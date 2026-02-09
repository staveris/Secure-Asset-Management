import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowRight, Building2, Lock, Mail, User, Check, X, Shield, FileCheck, AlertTriangle, BarChart3, Globe, CheckCircle2, Ban } from "lucide-react";
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
    description: "EU reporting timeline tracking with early warning & final report workflows",
  },
  {
    icon: FileCheck,
    title: "Evidence & Audit",
    description: "Secure evidence vault with smart linking and print-ready compliance reports",
  },
  {
    icon: BarChart3,
    title: "Compliance Analytics",
    description: "Real-time dashboards, trend analysis, and maturity scoring",
  },
];

const stats = [
  { value: "27", label: "EU Member States" },
  { value: "18", label: "NIS2 Sectors" },
  { value: "41", label: "Control Objectives" },
  { value: "100%", label: "Audit Ready" },
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuspendedDialog, setShowSuspendedDialog] = useState(false);
  const [showLockedDialog, setShowLockedDialog] = useState(false);
  const [lockedMessage, setLockedMessage] = useState("");
  const [showTotpStep, setShowTotpStep] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const { login, verifyTotp, register, user } = useAuth();
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
      const result = await login(loginEmail, loginPassword);
      if (result === "requireTotp") {
        setShowTotpStep(true);
      } else {
        navigate("/");
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("suspended")) {
        setShowSuspendedDialog(true);
      } else if (msg.includes("423") || msg.toLowerCase().includes("locked")) {
        const cleanMsg = msg.replace(/^\d+:\s*/, "").replace(/[{}"]/g, "").replace(/message:/i, "").trim();
        setShowLockedDialog(true);
        setLockedMessage(cleanMsg || "Account temporarily locked due to too many failed attempts.");
      } else {
        toast({ title: "Login failed", description: msg.replace(/^\d+:\s*/, "").replace(/[{}"]/g, "").replace(/message:/i, "").trim() || "Invalid credentials", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpLoading(true);
    try {
      await verifyTotp(totpCode);
      navigate("/");
    } catch (err: any) {
      const msg = err.message || "";
      toast({ title: "Verification failed", description: msg.replace(/^\d+:\s*/, "").replace(/[{}"]/g, "").replace(/message:/i, "").trim() || "Invalid verification code", variant: "destructive" });
    } finally {
      setTotpLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      setForgotSent(true);
      toast({ title: "Check your email", description: data.message });
    } catch (err: any) {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-neutral-950" data-testid="auth-page">
      {/* Left branded panel - gradient instead of solid black */}
      <div className="hidden lg:flex lg:w-[54%] relative overflow-hidden" style={{
        background: "linear-gradient(135deg, #1e293b 0%, #334155 40%, #475569 100%)",
      }}>
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full border border-white/[0.06]" />
        <div className="absolute -top-20 -left-20 w-[700px] h-[700px] rounded-full border border-white/[0.04]" />
        <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full border border-white/[0.05]" />
        <div className="absolute top-1/4 right-10 w-[300px] h-[300px] rounded-full bg-sky-500/[0.06] blur-3xl" />
        <div className="absolute bottom-1/4 left-10 w-[250px] h-[250px] rounded-full bg-indigo-500/[0.05] blur-3xl" />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />

        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          {/* Top: Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-white/10 backdrop-blur-sm">
              <img src={faviconLogo} alt="Tools of Tech" className="h-7 w-7 invert" data-testid="img-hero-icon" />
            </div>
            <div>
              <span className="text-white font-semibold tracking-wide">TOOLS OF TECH</span>
              <span className="block text-slate-400 text-[10px] tracking-[0.2em] uppercase">Innovation & Strategy</span>
            </div>
          </div>

          {/* Center: Hero content */}
          <div className="flex-1 flex flex-col justify-center max-w-xl py-8">
            <div className="flex items-center gap-2 mb-5">
              <Globe className="w-4 h-4 text-sky-400" />
              <span className="text-sky-400 text-xs font-medium tracking-wider uppercase">
                EU Directive 2022/2555
              </span>
            </div>
            <h1 className="text-4xl xl:text-[2.75rem] font-bold text-white leading-[1.15] mb-4 tracking-tight">
              Your Path to<br />
              NIS2 Compliance
            </h1>
            <p className="text-slate-300 text-base xl:text-lg leading-relaxed mb-8 max-w-md">
              Assess, track, and demonstrate your organization's cybersecurity readiness with a platform built for the NIS2 Directive.
            </p>

            {/* Stats row */}
            <div className="flex gap-6 mb-10">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Feature list */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature) => (
                <div key={feature.title} className="p-4 rounded-xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.08]">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <feature.icon className="w-4 h-4 text-sky-400" />
                    </div>
                    <h3 className="text-white text-sm font-medium">{feature.title}</h3>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Trust & compliance */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-tenant</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Encrypted & Secure</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
              <img src={faviconLogo} alt="Tools of Tech" className="h-5 w-5 invert" data-testid="img-mobile-icon" />
            </div>
            <div>
              <span className="font-semibold text-sm">NIS2 Platform</span>
              <span className="block text-[10px] text-muted-foreground">by Tools of Tech</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
          <div className="w-full max-w-[420px]">
            {/* Form header */}
            <div className="mb-8">
              <div className="hidden lg:flex items-center gap-2.5 mb-8">
                <div className="w-8 h-8 rounded-lg bg-slate-800 dark:bg-slate-200 flex items-center justify-center">
                  <img src={faviconLogo} alt="" className="h-5 w-5 dark:invert-0 invert-0 dark:brightness-0" style={{ filter: "invert(1)" }} />
                </div>
                <span className="text-xs text-muted-foreground font-medium tracking-wider uppercase">NIS2 Readiness Platform</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight" data-testid="text-form-title">
                {showTotpStep ? "Two-Factor Authentication" : showForgotPassword ? "Reset your password" : isLogin ? "Welcome back" : "Get started"}
              </h2>
              <p className="text-muted-foreground mt-1.5 text-sm">
                {showTotpStep
                  ? "Enter the 6-digit code from your authenticator app"
                  : showForgotPassword
                    ? "Enter your email and we'll send you a link to reset your password"
                    : isLogin
                      ? "Sign in to continue to your compliance dashboard"
                      : "Create your account and begin your NIS2 compliance journey"
                }
              </p>
            </div>

            {showTotpStep ? (
              <form onSubmit={handleTotpVerify} className="space-y-4" data-testid="form-totp-verify">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totp-code">Verification Code</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="totp-code"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="pl-10 bg-white dark:bg-neutral-900 text-center text-lg tracking-widest"
                      maxLength={6}
                      autoFocus
                      required
                      data-testid="input-totp-code"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={totpCode.length !== 6 || totpLoading}
                  data-testid="button-totp-verify"
                >
                  {totpLoading ? "Verifying..." : "Verify"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <button
                  type="button"
                  onClick={() => { setShowTotpStep(false); setTotpCode(""); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
                  data-testid="link-back-from-totp"
                >
                  Back to Login
                </button>
              </form>
            ) : showForgotPassword ? (
              forgotSent ? (
                <div className="space-y-4 text-center" data-testid="forgot-password-sent">
                  <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-base font-semibold" data-testid="text-forgot-sent-title">Check your email</h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-forgot-sent-message">
                    If an account with that email exists, we've sent a password reset link. Please check your inbox and spam folder.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(false); setForgotSent(false); setForgotEmail(""); }}
                    className="text-sm text-primary hover:underline"
                    data-testid="link-back-to-login"
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4" data-testid="form-forgot-password">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="you@company.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="pl-10 bg-white dark:bg-neutral-900"
                        required
                        data-testid="input-forgot-email"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 text-white no-default-hover-elevate"
                    disabled={loading}
                    data-testid="button-forgot-submit"
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <div className="text-center pt-3">
                    <button
                      type="button"
                      onClick={() => { setShowForgotPassword(false); setForgotEmail(""); }}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="link-back-to-login-from-forgot"
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              )
            ) : isLogin ? (
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
                      className="pl-10 bg-white dark:bg-neutral-900"
                      required
                      data-testid="input-login-email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label htmlFor="login-password">Password</Label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-primary hover:underline"
                      data-testid="link-forgot-password"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 bg-white dark:bg-neutral-900"
                      required
                      data-testid="input-login-password"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 text-white no-default-hover-elevate"
                  disabled={loading}
                  data-testid="button-login"
                >
                  {loading ? "Signing in..." : "Sign in"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <div className="text-center pt-3">
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
                      className="pl-10 bg-white dark:bg-neutral-900"
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
                      className="pl-10 bg-white dark:bg-neutral-900"
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
                      className="pl-10 bg-white dark:bg-neutral-900"
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
                      className="pl-10 bg-white dark:bg-neutral-900"
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
                      className="pl-10 bg-white dark:bg-neutral-900"
                      required
                      data-testid="input-reg-company"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 text-white no-default-hover-elevate"
                  disabled={loading || !isPasswordValid || !passwordsMatch}
                  data-testid="button-register"
                >
                  {loading ? "Creating account..." : "Create account"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <div className="text-center pt-3">
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
        <div className="p-4 text-center border-t bg-background">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-medium">Tools of Tech</span> &middot; Innovation & Strategy
          </p>
        </div>
      </div>

      <Dialog open={showSuspendedDialog} onOpenChange={setShowSuspendedDialog}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-suspended">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-2">
              <Ban className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-center" data-testid="text-suspended-title">Account Suspended</DialogTitle>
            <DialogDescription className="text-center" data-testid="text-suspended-description">
              Your organization's access has been suspended. You are unable to log in at this time.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted p-4 text-center space-y-2" data-testid="suspended-contact-info">
            <p className="text-sm text-muted-foreground">
              For more information or to restore access, please contact the administrator:
            </p>
            <a
              href="mailto:info@toolsoftech.eu"
              className="text-sm font-medium text-primary hover:underline"
              data-testid="link-suspended-email"
            >
              info@toolsoftech.eu
            </a>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              variant="outline"
              onClick={() => setShowSuspendedDialog(false)}
              data-testid="button-suspended-close"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLockedDialog} onOpenChange={setShowLockedDialog}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-locked">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2">
              <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-center" data-testid="text-locked-title">Account Temporarily Locked</DialogTitle>
            <DialogDescription className="text-center" data-testid="text-locked-description">
              {lockedMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact the administrator:
            </p>
            <a
              href="mailto:info@toolsoftech.eu"
              className="text-sm font-medium text-primary hover:underline"
              data-testid="link-locked-email"
            >
              info@toolsoftech.eu
            </a>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              variant="outline"
              onClick={() => setShowLockedDialog(false)}
              data-testid="button-locked-close"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
