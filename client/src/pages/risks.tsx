import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Shield, AlertCircle } from "lucide-react";
import type { RiskItem } from "@shared/schema";

const riskScoreColor = (score: number) => {
  if (score >= 16) return "text-red-600 dark:text-red-400";
  if (score >= 9) return "text-orange-600 dark:text-orange-400";
  if (score >= 4) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
};

const treatmentColors: Record<string, string> = {
  ACCEPT: "outline",
  MITIGATE: "default",
  TRANSFER: "secondary",
  AVOID: "destructive",
};

export default function Risks() {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);
  const [treatment, setTreatment] = useState("MITIGATE");
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

  return (
    <div className="p-6 space-y-6" data-testid="risks-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Risk Register</h1>
          <p className="text-muted-foreground mt-1">Identify and manage cybersecurity risks</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-risk">
              <Plus className="w-4 h-4 mr-2" />
              Add Risk
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Risk</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Risk Title</Label>
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
              <div className="p-3 rounded-md bg-muted">
                <p className="text-sm">Risk Score: <span className={`font-bold ${riskScoreColor(likelihood * impact)}`}>{likelihood * impact}</span> / 25</p>
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!title || createMutation.isPending} className="w-full" data-testid="button-submit-risk">
                {createMutation.isPending ? "Adding..." : "Add Risk"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>)}
        </div>
      ) : risks && risks.length > 0 ? (
        <div className="space-y-2">
          {risks.map((risk) => {
            const score = risk.likelihood * risk.impact;
            return (
              <Card key={risk.id} data-testid={`card-risk-${risk.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`text-lg font-bold w-10 text-center ${riskScoreColor(score)}`}>{score}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{risk.title}</p>
                      <p className="text-xs text-muted-foreground">
                        L:{risk.likelihood} x I:{risk.impact} | {risk.status.replace("_", " ")}
                      </p>
                    </div>
                    <Badge variant={treatmentColors[risk.treatment] as any} className="text-xs shrink-0">
                      {risk.treatment}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
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
    </div>
  );
}
