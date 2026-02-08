import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Building2, Lock, Mail, User } from "lucide-react";
import companyLogo from "@assets/Color_logo_with_background_1770546085701.png";

interface SectorData {
  sectors: Array<{ sectorGroup: string; sector: string; subsectors: string[] }>;
  countries: string[];
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
  const [regName, setRegName] = useState("");
  const [regCompany, setRegCompany] = useState("");
  const [regSectorGroup, setRegSectorGroup] = useState("ANNEX_I");
  const [regSector, setRegSector] = useState("");
  const [regSubsector, setRegSubsector] = useState("");
  const [regEntityType, setRegEntityType] = useState("essential");
  const [regCountry, setRegCountry] = useState("");

  const { data: sectorData } = useQuery<SectorData>({
    queryKey: ["/api/nis2/sectors"],
    enabled: !isLogin,
  });

  const filteredSectors = useMemo(() => {
    if (!sectorData) return [];
    return sectorData.sectors.filter(s => s.sectorGroup === regSectorGroup);
  }, [sectorData, regSectorGroup]);

  const selectedSectorObj = useMemo(() => {
    return filteredSectors.find(s => s.sector === regSector);
  }, [filteredSectors, regSector]);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regSector) {
      toast({ title: "Required", description: "Please select a sector", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await register({
        email: regEmail,
        password: regPassword,
        fullName: regName,
        companyName: regCompany,
        sectorGroup: regSectorGroup,
        sector: regSector,
        subsector: regSubsector || undefined,
        entityType: regEntityType,
        country: regCountry || undefined,
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
                        placeholder="Min 8 characters"
                        className="pl-10"
                        required
                        data-testid="input-reg-password"
                      />
                    </div>
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

                  <div className="space-y-2">
                    <Label>NIS2 Classification</Label>
                    <Select value={regSectorGroup} onValueChange={(v) => { setRegSectorGroup(v); setRegSector(""); setRegSubsector(""); }}>
                      <SelectTrigger data-testid="select-sector-group">
                        <SelectValue placeholder="Select annex" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANNEX_I">Annex I - Highly Critical Sectors</SelectItem>
                        <SelectItem value="ANNEX_II">Annex II - Other Critical Sectors</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Sector</Label>
                      <Select value={regSector} onValueChange={(v) => { setRegSector(v); setRegSubsector(""); }}>
                        <SelectTrigger data-testid="select-sector">
                          <SelectValue placeholder="Select sector" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredSectors.map(s => (
                            <SelectItem key={s.sector} value={s.sector}>{s.sector}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Entity Type</Label>
                      <Select value={regEntityType} onValueChange={setRegEntityType}>
                        <SelectTrigger data-testid="select-entity-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="essential">Essential Entity</SelectItem>
                          <SelectItem value="important">Important Entity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedSectorObj && selectedSectorObj.subsectors.length > 0 && (
                    <div className="space-y-2">
                      <Label>Subsector</Label>
                      <Select value={regSubsector} onValueChange={setRegSubsector}>
                        <SelectTrigger data-testid="select-subsector">
                          <SelectValue placeholder="Select subsector (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedSectorObj.subsectors.map(ss => (
                            <SelectItem key={ss} value={ss}>{ss}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>EU Member State</Label>
                    <Select value={regCountry} onValueChange={setRegCountry}>
                      <SelectTrigger data-testid="select-country">
                        <SelectValue placeholder="Select country (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {(sectorData?.countries || []).map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading} data-testid="button-register">
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
