import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Shield, Pencil, Trash2, Search, Filter, ArrowUpDown, Activity,
  AlertTriangle, ShieldAlert, ShieldCheck, Eye, CheckCircle2, BarChart3,
  TrendingUp, Target, ShieldX,
} from "lucide-react";
import type { RiskItem } from "@shared/schema";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Nis2Art21Register } from "@/components/nis2-art21-register";

const RISK_COLORS = {
  critical: { color: "#dc2626", bg: "#dc262612", label: "Critical" },
  high: { color: "#f59e0b", bg: "#f59e0b12", label: "High" },
  medium: { color: "#3b82f6", bg: "#3b82f612", label: "Medium" },
  low: { color: "#22c55e", bg: "#22c55e12", label: "Low" },
};

function getRiskLevel(score: number): keyof typeof RISK_COLORS {
  if (score >= 16) return "critical";
  if (score >= 9) return "high";
  if (score >= 4) return "medium";
  return "low";
}

const TREATMENT_CONFIG: Record<string, { color: string; bg: string; icon: typeof Shield; badgeVariant: string }> = {
  MITIGATE: { color: "#3b82f6", bg: "#3b82f612", icon: ShieldCheck, badgeVariant: "default" },
  TRANSFER: { color: "#8b5cf6", bg: "#8b5cf612", icon: TrendingUp, badgeVariant: "secondary" },
  ACCEPT: { color: "#22c55e", bg: "#22c55e12", icon: CheckCircle2, badgeVariant: "outline" },
  AVOID: { color: "#dc2626", bg: "#dc262612", icon: ShieldX, badgeVariant: "destructive" },
};

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: typeof Eye }> = {
  IDENTIFIED: { color: "#6b7280", label: "Identified", icon: Eye },
  ANALYZING: { color: "#f59e0b", label: "Analyzing", icon: Search as any },
  TREATING: { color: "#3b82f6", label: "Treating", icon: ShieldCheck },
  MONITORING: { color: "#8b5cf6", label: "Monitoring", icon: Activity },
  CLOSED: { color: "#22c55e", label: "Closed", icon: CheckCircle2 },
};

function RiskScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const level = getRiskLevel(score);
  const conf = RISK_COLORS[level];
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(score / 25, 1);
  const strokeDashoffset = circumference * (1 - pct);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={3} />
            <circle
              cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke={conf.color} strokeWidth={3} strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold" style={{ color: conf.color }}>{score}</span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent><span className="text-xs">{conf.label} risk: {score}/25</span></TooltipContent>
    </Tooltip>
  );
}

function RiskHeatmap({ risks }: { risks: RiskItem[] }) {
  const grid = useMemo(() => {
    const cells: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    risks.forEach(r => {
      cells[5 - r.impact][r.likelihood - 1]++;
    });
    return cells;
  }, [risks]);

  return (
    <Card data-testid="risk-heatmap">
      <CardContent className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" />
          Risk Heatmap
        </h3>
        <div className="flex gap-2">
          <div className="flex flex-col justify-between text-[9px] text-muted-foreground py-0.5 pr-1 items-end shrink-0">
            {[5, 4, 3, 2, 1].map(i => (
              <div key={i} className="h-7 flex items-center">{i}</div>
            ))}
            <div className="h-3" />
          </div>
          <div className="flex-1">
            <div className="grid grid-rows-5 gap-0.5">
              {grid.map((row, ri) => (
                <div key={ri} className="grid grid-cols-5 gap-0.5">
                  {row.map((count, ci) => {
                    const score = (ci + 1) * (5 - ri);
                    const level = getRiskLevel(score);
                    const conf = RISK_COLORS[level];
                    return (
                      <Tooltip key={ci}>
                        <TooltipTrigger asChild>
                          <div
                            className="h-7 rounded-sm flex items-center justify-center text-[10px] font-medium transition-all"
                            style={{
                              backgroundColor: count > 0 ? conf.color + (count > 2 ? "60" : count > 1 ? "40" : "25") : "var(--muted)",
                              color: count > 0 ? conf.color : "var(--muted-foreground)",
                            }}
                          >
                            {count > 0 ? count : ""}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <span className="text-xs">L:{ci + 1} x I:{5 - ri} = {score} ({count} {count === 1 ? "risk" : "risks"})</span>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="text-[9px] text-muted-foreground text-center">{i}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-[9px] text-muted-foreground">
          <span>Likelihood &rarr;</span>
          <span>&uarr; Impact</span>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskCard({ risk, onEdit, onDelete }: {
  risk: RiskItem;
  onEdit: (r: RiskItem) => void;
  onDelete: (r: RiskItem) => void;
}) {
  const score = risk.likelihood * risk.impact;
  const level = getRiskLevel(score);
  const riskConf = RISK_COLORS[level];
  const treatConf = TREATMENT_CONFIG[risk.treatment] || TREATMENT_CONFIG.MITIGATE;
  const statusConf = STATUS_CONFIG[risk.status] || STATUS_CONFIG.IDENTIFIED;
  const TreatIcon = treatConf.icon;
  const StatusIcon = statusConf.icon;

  return (
    <Card className="hover-elevate group" data-testid={`card-risk-${risk.id}`}>
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-md" style={{ backgroundColor: riskConf.color }} />
      <CardContent className="p-4 pt-5">
        <div className="flex items-start gap-3">
          <RiskScoreRing score={score} />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight" data-testid={`text-risk-title-${risk.id}`}>{risk.title}</p>
                {risk.description && (
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{risk.description}</p>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => onEdit(risk)} data-testid={`button-edit-risk-${risk.id}`}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(risk)} data-testid={`button-delete-risk-${risk.id}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: riskConf.color }} />
                <span className="text-[10px] font-medium" style={{ color: riskConf.color }}>{riskConf.label}</span>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Target className="w-3 h-3" />
                <span>L:{risk.likelihood} x I:{risk.impact}</span>
              </div>

              <Badge
                variant={treatConf.badgeVariant as any}
                className="text-[10px] gap-1 no-default-hover-elevate no-default-active-elevate"
              >
                <TreatIcon className="w-2.5 h-2.5" />
                {risk.treatment}
              </Badge>

              <div className="flex items-center gap-1">
                <StatusIcon className="w-3 h-3" style={{ color: statusConf.color }} />
                <span className="text-[10px]" style={{ color: statusConf.color }}>{statusConf.label}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-1 rounded-full transition-all"
                  style={{ width: `${(score / 25) * 100}%`, backgroundColor: riskConf.color }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{score}/25</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Risks() {
  const { data: flagData } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/feature-flags/check", "NIS2_ART21_RISK_REGISTER"],
  });
  const registerEnabled = !!flagData?.enabled;

  if (!registerEnabled) {
    return <AdhocRisks />;
  }

  return (
    <div className="p-6 space-y-5" data-testid="risks-page-with-tabs">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-risks-heading">Risk Register</h1>
        <p className="text-sm text-muted-foreground mt-1">Cybersecurity risk identification and treatment per NIS2 Art. 21</p>
      </div>
      <Tabs defaultValue="nis2-art21" className="space-y-4">
        <TabsList data-testid="tabs-risks">
          <TabsTrigger value="nis2-art21" data-testid="tab-nis2-art21">NIS2 Art.21 Register</TabsTrigger>
          <TabsTrigger value="adhoc" data-testid="tab-adhoc-risks">Ad-hoc Risks</TabsTrigger>
        </TabsList>
        <TabsContent value="nis2-art21">
          <Nis2Art21Register />
        </TabsContent>
        <TabsContent value="adhoc">
          <AdhocRisks embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdhocRisks({ embedded = false }: { embedded?: boolean }) {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);
  const [treatment, setTreatment] = useState("MITIGATE");

  const [editingRisk, setEditingRisk] = useState<RiskItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLikelihood, setEditLikelihood] = useState(3);
  const [editImpact, setEditImpact] = useState(3);
  const [editTreatment, setEditTreatment] = useState("MITIGATE");
  const [editStatus, setEditStatus] = useState("IDENTIFIED");

  const [deletingRisk, setDeletingRisk] = useState<RiskItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterTreatment, setFilterTreatment] = useState("all");
  const [sortBy, setSortBy] = useState<"score" | "likelihood" | "impact" | "name">("score");

  const { toast } = useToast();

  const { data: risks, isLoading } = useQuery<RiskItem[]>({
    queryKey: ["/api/risks"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/risks", { title, likelihood, impact, treatment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      setShowCreate(false);
      setTitle("");
      setLikelihood(3);
      setImpact(3);
      setTreatment("MITIGATE");
      toast({ title: "Risk added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingRisk) return;
      await apiRequest("PATCH", `/api/risks/${editingRisk.id}`, {
        title: editTitle,
        likelihood: editLikelihood,
        impact: editImpact,
        treatment: editTreatment,
        status: editStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      setEditingRisk(null);
      toast({ title: "Risk updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingRisk) return;
      await apiRequest("DELETE", `/api/risks/${deletingRisk.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      setDeletingRisk(null);
      toast({ title: "Risk deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openEdit = (risk: RiskItem) => {
    setEditTitle(risk.title);
    setEditLikelihood(risk.likelihood);
    setEditImpact(risk.impact);
    setEditTreatment(risk.treatment);
    setEditStatus(risk.status);
    setEditingRisk(risk);
  };

  const stats = useMemo(() => {
    if (!risks) return { total: 0, critical: 0, high: 0, avgScore: 0, treating: 0, mitigating: 0 };
    const total = risks.length;
    const scores = risks.map(r => r.likelihood * r.impact);
    const critical = scores.filter(s => s >= 16).length;
    const high = scores.filter(s => s >= 9 && s < 16).length;
    const avgScore = total > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / total) * 10) / 10 : 0;
    const treating = risks.filter(r => r.status === "TREATING" || r.status === "ANALYZING").length;
    const mitigating = risks.filter(r => r.treatment === "MITIGATE").length;
    return { total, critical, high, avgScore, treating, mitigating };
  }, [risks]);

  const filtered = useMemo(() => {
    if (!risks) return [];
    let result = [...risks];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    }
    if (filterLevel !== "all") {
      result = result.filter(r => {
        const level = getRiskLevel(r.likelihood * r.impact);
        return level === filterLevel;
      });
    }
    if (filterTreatment !== "all") {
      result = result.filter(r => r.treatment === filterTreatment);
    }
    result.sort((a, b) => {
      if (sortBy === "score") return (b.likelihood * b.impact) - (a.likelihood * a.impact);
      if (sortBy === "likelihood") return b.likelihood - a.likelihood;
      if (sortBy === "impact") return b.impact - a.impact;
      return a.title.localeCompare(b.title);
    });
    return result;
  }, [risks, searchQuery, filterLevel, filterTreatment, sortBy]);

  const createScore = likelihood * impact;
  const createLevel = getRiskLevel(createScore);
  const createConf = RISK_COLORS[createLevel];
  const editScore = editLikelihood * editImpact;
  const editLevel = getRiskLevel(editScore);
  const editConf = RISK_COLORS[editLevel];

  return (
    <div className={embedded ? "space-y-5" : "p-6 space-y-5"} data-testid="risks-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          {!embedded && (
            <>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-risks-heading">Risk Register</h1>
              <p className="text-sm text-muted-foreground mt-1">Cybersecurity risk identification and treatment per NIS2 Art. 21</p>
            </>
          )}
          {embedded && (
            <p className="text-sm text-muted-foreground">Free-form risks recorded outside the NIS2 Art.21 reference library.</p>
          )}
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-risk">
              <Plus className="w-4 h-4 mr-2" />
              Add Risk
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Risk</DialogTitle>
              <DialogDescription>Register a new cybersecurity risk for tracking and treatment.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Risk Title <span className="text-red-500">*</span></Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Ransomware attack on critical systems" data-testid="input-risk-title" />
              </div>
              <div className="space-y-2">
                <Label>Likelihood: {likelihood}/5</Label>
                <Slider value={[likelihood]} min={1} max={5} step={1} onValueChange={(v) => setLikelihood(v[0])} data-testid="slider-risk-likelihood" />
              </div>
              <div className="space-y-2">
                <Label>Impact: {impact}/5</Label>
                <Slider value={[impact]} min={1} max={5} step={1} onValueChange={(v) => setImpact(v[0])} data-testid="slider-risk-impact" />
              </div>
              <div className="space-y-2">
                <Label>Treatment Strategy</Label>
                <Select value={treatment} onValueChange={setTreatment}>
                  <SelectTrigger data-testid="select-risk-treatment"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACCEPT">Accept</SelectItem>
                    <SelectItem value="MITIGATE">Mitigate</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="AVOID">Avoid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 rounded-md flex items-center justify-between" style={{ backgroundColor: createConf.bg }}>
                <span className="text-sm">Risk Score</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: createConf.color }} />
                  <span className="text-sm font-bold" style={{ color: createConf.color }}>{createScore}/25</span>
                  <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate" style={{ borderColor: createConf.color + "40", color: createConf.color }}>{createConf.label}</Badge>
                </div>
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!title || createMutation.isPending} className="w-full" data-testid="button-submit-risk">
                {createMutation.isPending ? "Adding..." : "Add Risk"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!isLoading && risks && risks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="risk-kpis">
          <Card>
            <CardContent className="p-3 text-center">
              <Shield className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xl font-bold" data-testid="kpi-total-risks">{stats.total}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Risks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <ShieldAlert className="w-4 h-4 mx-auto mb-1" style={{ color: "#dc2626" }} />
              <div className="text-xl font-bold" style={stats.critical > 0 ? { color: "#dc2626" } : {}} data-testid="kpi-critical-risks">{stats.critical}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Critical</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <AlertTriangle className="w-4 h-4 mx-auto mb-1" style={{ color: "#f59e0b" }} />
              <div className="text-xl font-bold" style={stats.high > 0 ? { color: "#f59e0b" } : {}} data-testid="kpi-high-risks">{stats.high}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">High</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Activity className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xl font-bold" data-testid="kpi-avg-score">{stats.avgScore}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Score</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <ShieldCheck className="w-4 h-4 mx-auto mb-1" style={{ color: "#3b82f6" }} />
              <div className="text-xl font-bold" style={{ color: "#3b82f6" }} data-testid="kpi-treating">{stats.treating}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">In Treatment</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Target className="w-4 h-4 mx-auto mb-1" style={{ color: "#8b5cf6" }} />
              <div className="text-xl font-bold" style={{ color: "#8b5cf6" }} data-testid="kpi-mitigating">{stats.mitigating}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Mitigating</div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && risks && risks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="lg:col-span-1">
            <RiskHeatmap risks={risks} />
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center gap-3 flex-wrap" data-testid="risk-controls">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search risks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-risks"
                />
              </div>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-32" data-testid="select-filter-level">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterTreatment} onValueChange={setFilterTreatment}>
                <SelectTrigger className="w-32" data-testid="select-filter-treatment">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Treatment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Treatment</SelectItem>
                  <SelectItem value="MITIGATE">Mitigate</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="ACCEPT">Accept</SelectItem>
                  <SelectItem value="AVOID">Avoid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-32" data-testid="select-sort-risks">
                  <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Highest Score</SelectItem>
                  <SelectItem value="likelihood">Likelihood</SelectItem>
                  <SelectItem value="impact">Impact</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground ml-auto" data-testid="text-risk-count">
                {filtered.length} of {risks?.length || 0} risks
              </span>
            </div>

            {filtered.length > 0 ? (
              <div className="space-y-3" data-testid="risk-list">
                {filtered.map((risk) => (
                  <RiskCard key={risk.id} risk={risk} onEdit={openEdit} onDelete={setDeletingRisk} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <h3 className="font-semibold mb-1">No matching risks</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-20" /></CardContent></Card>)}
        </div>
      )}

      {!isLoading && risks && risks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">No risks identified</h3>
            <p className="text-sm text-muted-foreground mb-4">Add risks to your register for tracking</p>
            <Button onClick={() => setShowCreate(true)} data-testid="button-create-first-risk">
              <Plus className="w-4 h-4 mr-2" />
              Add Risk
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingRisk} onOpenChange={(open) => { if (!open) setEditingRisk(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Risk</DialogTitle>
            <DialogDescription>Update risk assessment details, treatment strategy and status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Risk Title <span className="text-red-500">*</span></Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} data-testid="input-edit-risk-title" />
            </div>
            <div className="space-y-2">
              <Label>Likelihood: {editLikelihood}/5</Label>
              <Slider value={[editLikelihood]} min={1} max={5} step={1} onValueChange={(v) => setEditLikelihood(v[0])} data-testid="slider-edit-risk-likelihood" />
            </div>
            <div className="space-y-2">
              <Label>Impact: {editImpact}/5</Label>
              <Slider value={[editImpact]} min={1} max={5} step={1} onValueChange={(v) => setEditImpact(v[0])} data-testid="slider-edit-risk-impact" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Treatment Strategy</Label>
                <Select value={editTreatment} onValueChange={setEditTreatment}>
                  <SelectTrigger data-testid="select-edit-risk-treatment"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACCEPT">Accept</SelectItem>
                    <SelectItem value="MITIGATE">Mitigate</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="AVOID">Avoid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger data-testid="select-edit-risk-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDENTIFIED">Identified</SelectItem>
                    <SelectItem value="ANALYZING">Analyzing</SelectItem>
                    <SelectItem value="TREATING">Treating</SelectItem>
                    <SelectItem value="MONITORING">Monitoring</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-3 rounded-md flex items-center justify-between" style={{ backgroundColor: editConf.bg }}>
              <span className="text-sm">Risk Score</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: editConf.color }} />
                <span className="text-sm font-bold" style={{ color: editConf.color }}>{editScore}/25</span>
                <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate" style={{ borderColor: editConf.color + "40", color: editConf.color }}>{editConf.label}</Badge>
              </div>
            </div>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={!editTitle || editMutation.isPending}
              className="w-full"
              data-testid="button-save-edit-risk"
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingRisk} onOpenChange={(open) => { if (!open) setDeletingRisk(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Risk</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingRisk?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingRisk(null)} data-testid="button-cancel-delete-risk">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-risk"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
