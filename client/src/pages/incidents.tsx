import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, AlertTriangle, Clock, Siren, CheckCircle2, XCircle } from "lucide-react";
import type { IncidentCase } from "@shared/schema";

const severityColors: Record<string, string> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "destructive",
  CRITICAL: "destructive",
};

const statusLabels: Record<string, string> = {
  DETECTED: "Detected",
  TRIAGED: "Triaged",
  CONTAINED: "Contained",
  ERADICATED: "Eradicated",
  RECOVERED: "Recovered",
  CLOSED: "Closed",
};

export default function Incidents() {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [isSignificant, setIsSignificant] = useState(false);
  const { toast } = useToast();

  const { data: incidents, isLoading } = useQuery<IncidentCase[]>({
    queryKey: ["/api/incidents"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/incidents", {
        title,
        description: description || null,
        severity,
        isSignificant,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setSeverity("MEDIUM");
      setIsSignificant(false);
      toast({ title: "Incident created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ incidentId, status }: { incidentId: number; status: string }) => {
      await apiRequest("PATCH", `/api/incidents/${incidentId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
    },
  });

  const getTimelineStatus = (incident: IncidentCase) => {
    if (!incident.isSignificant) return null;
    const now = new Date();
    const deadlines = [];
    if (incident.earlyWarningDueAt) {
      const due = new Date(incident.earlyWarningDueAt);
      deadlines.push({
        label: "Early Warning (24h)",
        due,
        overdue: now > due && incident.status === "DETECTED",
      });
    }
    if (incident.notificationDueAt) {
      const due = new Date(incident.notificationDueAt);
      deadlines.push({
        label: "Notification (72h)",
        due,
        overdue: now > due && ["DETECTED", "TRIAGED"].includes(incident.status),
      });
    }
    if (incident.finalReportDueAt) {
      const due = new Date(incident.finalReportDueAt);
      deadlines.push({
        label: "Final Report (1 month)",
        due,
        overdue: now > due && incident.status !== "CLOSED",
      });
    }
    return deadlines;
  };

  return (
    <div className="p-6 space-y-6" data-testid="incidents-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
          <p className="text-muted-foreground mt-1">NIS2 incident reporting and management</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-incident">
              <Plus className="w-4 h-4 mr-2" />
              Report Incident
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Incident</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Incident title" data-testid="input-incident-title" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the incident" data-testid="input-incident-description" />
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger data-testid="select-incident-severity"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="text-sm font-medium">Significant Incident</Label>
                  <p className="text-xs text-muted-foreground">Triggers NIS2 reporting deadlines (24h/72h/1mo)</p>
                </div>
                <Switch checked={isSignificant} onCheckedChange={setIsSignificant} data-testid="switch-significant" />
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!title || createMutation.isPending} className="w-full" data-testid="button-submit-incident">
                {createMutation.isPending ? "Creating..." : "Report Incident"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-20" /></CardContent></Card>)}
        </div>
      ) : incidents && incidents.length > 0 ? (
        <div className="space-y-3">
          {incidents.map((incident) => {
            const timeline = getTimelineStatus(incident);
            return (
              <Card key={incident.id} data-testid={`card-incident-${incident.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 ${incident.severity === "CRITICAL" || incident.severity === "HIGH" ? "text-red-500" : "text-muted-foreground"}`}>
                      {incident.isSignificant ? <Siren className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-sm">{incident.title}</h3>
                        <Badge variant={severityColors[incident.severity] as any} className="text-xs">{incident.severity}</Badge>
                        {incident.isSignificant && <Badge variant="outline" className="text-xs">Significant</Badge>}
                      </div>
                      {incident.description && <p className="text-xs text-muted-foreground mb-2">{incident.description}</p>}

                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs text-muted-foreground">
                          Detected: {new Date(incident.detectedAt).toLocaleString()}
                        </span>
                        <Select
                          value={incident.status}
                          onValueChange={(val) => updateStatusMutation.mutate({ incidentId: incident.id, status: val })}
                        >
                          <SelectTrigger className="w-auto h-7 text-xs" data-testid={`select-incident-status-${incident.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([val, label]) => (
                              <SelectItem key={val} value={val}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {timeline && timeline.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {timeline.map((d, i) => (
                            <div key={i} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${d.overdue ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-muted text-muted-foreground"}`}>
                              <Clock className="w-3 h-3" />
                              <span>{d.label}:</span>
                              <span className="font-medium">{d.due.toLocaleString()}</span>
                              {d.overdue && <span className="font-semibold">OVERDUE</span>}
                            </div>
                          ))}
                        </div>
                      )}
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
            <AlertTriangle className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">No incidents reported</h3>
            <p className="text-sm text-muted-foreground mb-4">Report incidents to track NIS2 notification timelines</p>
            <Button onClick={() => setShowCreate(true)} data-testid="button-create-first-incident">
              <Plus className="w-4 h-4 mr-2" />
              Report Incident
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
