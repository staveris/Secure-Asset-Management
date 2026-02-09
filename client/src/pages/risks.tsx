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
import { Plus, Shield, Pencil, Trash2 } from "lucide-react";
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

  const [editingRisk, setEditingRisk] = useState<RiskItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLikelihood, setEditLikelihood] = useState(3);
  const [editImpact, setEditImpact] = useState(3);
  const [editTreatment, setEditTreatment] = useState("MITIGATE");
  const [editStatus, setEditStatus] = useState("IDENTIFIED");

  const [deletingRisk, setDeletingRisk] = useState<RiskItem | null>(null);

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
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={treatmentColors[risk.treatment] as any} className="text-xs">
                        {risk.treatment}
                      </Badge>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(risk)} data-testid={`button-edit-risk-${risk.id}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeletingRisk(risk)} data-testid={`button-delete-risk-${risk.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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

      <Dialog open={!!editingRisk} onOpenChange={(open) => { if (!open) setEditingRisk(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Risk</DialogTitle></DialogHeader>
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
                    <SelectItem value="ASSESSING">Assessing</SelectItem>
                    <SelectItem value="TREATING">Treating</SelectItem>
                    <SelectItem value="MONITORED">Monitored</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted">
              <p className="text-sm">Risk Score: <span className={`font-bold ${riskScoreColor(editLikelihood * editImpact)}`}>{editLikelihood * editImpact}</span> / 25</p>
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
