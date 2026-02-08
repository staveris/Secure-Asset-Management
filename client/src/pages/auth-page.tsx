import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Building2, Lock, Mail, User, Check, X } from "lucide-react";
import companyLogo from "@assets/Color_logo_with_background_1770546085701.png";

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
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${strengthColor}`}
            style={{ width: `${strengthPct}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{strengthLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {rules.map((rule) => (
          <div key={rule.label} className="flex items-center gap-1.5 text-xs">
            {rule.met ? (
              <Check className="w-3 h-3 text-green-500 shrink-0" />
            ) : (
              <X className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
            <span className={rule.met ? "text-foreground" : "text-muted-foreground"}>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    <div className="min-h-screen flex" data-testid="auth-page">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <img src={companyLogo} alt="Tools of Tech" className="h-20 w-auto rounded-md object-contain mb-3" data-testid="img-company-logo" />
            <h1 className="text-xl font-semibold tracking-tight">NIS2 Platform</h1>
            <p className="text-sm text-muted-foreground">Compliance Readiness</p>
          </div>

          {isLogin ? (
            <Card>
              <CardHeader className="pb-4">
                <h2 className="text-lg font-semibold">Sign in to your account</h2>
                <p className="text-sm text-muted-foreground">Enter your credentials to access the platform</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
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
                  <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
                    {loading ? "Signing in..." : "Sign in"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setIsLogin(false)}
                    className="text-sm text-muted-foreground hover:underline"
                    data-testid="link-switch-register"
                  >
                    Don't have an account? Register your company
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-4">
                <h2 className="text-lg font-semibold">Register your company</h2>
                <p className="text-sm text-muted-foreground">Set up your organization for NIS2 compliance</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
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
                    <Label htmlFor="reg-email">Email</Label>
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

                  <Button type="submit" className="w-full" disabled={loading || !isPasswordValid || !passwordsMatch} data-testid="button-register">
                    {loading ? "Creating account..." : "Create account"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setIsLogin(true)}
                    className="text-sm text-muted-foreground hover:underline"
                    data-testid="link-switch-login"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <div className="max-w-lg text-primary-foreground">
          <img src={companyLogo} alt="Tools of Tech" className="h-28 mb-6 rounded-md opacity-90" data-testid="img-hero-logo" />
          <h2 className="text-3xl font-bold mb-4">NIS2 Compliance Made Simple</h2>
          <p className="text-lg opacity-90 mb-6">
            Assess, track, and demonstrate your organization's readiness for the NIS2 Directive with our comprehensive compliance platform.
          </p>
          <div className="space-y-3 opacity-80">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              <span>Full NIS2 Annex I & II sector coverage</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              <span>Sector-specific control applicability</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              <span>Incident reporting timeline management</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              <span>Evidence vault with audit-ready reports</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
