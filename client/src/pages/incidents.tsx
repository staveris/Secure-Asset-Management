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
import { Plus, AlertTriangle, Clock, Bell, Send, ChevronRight, Shield, Siren } from "lucide-react";
import type { IncidentCase, IncidentNotification } from "@shared/schema";

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

const notificationTypeLabels: Record<string, string> = {
  EARLY_WARNING: "Early Warning",
  NOTIFICATION: "Notification",
  FINAL_REPORT: "Final Report",
};

function getDeadlineColor(due: Date, now: Date): "green" | "yellow" | "red" {
  const diff = due.getTime() - now.getTime();
  if (diff < 0) return "red";
  if (diff < 4 * 60 * 60 * 1000) return "yellow";
  return "green";
}

function formatTimeRemaining(due: Date, now: Date): string {
  const diff = due.getTime() - now.getTime();
  if (diff < 0) {
    const absDiff = Math.abs(diff);
    const hours = Math.floor(absDiff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h overdue`;
    return `${hours}h ${Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60))}m overdue`;
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h remaining`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m remaining`;
}

function getDeadlineStyleClasses(color: "green" | "yellow" | "red"): string {
  switch (color) {
    case "green":
      return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
    case "yellow":
      return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
    case "red":
      return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
  }
}

function getDeadlineDotClasses(color: "green" | "yellow" | "red"): string {
  switch (color) {
    case "green":
      return "bg-green-500";
    case "yellow":
      return "bg-yellow-500";
    case "red":
      return "bg-red-500";
  }
}

function DeadlineBadge({ label, due }: { label: string; due: Date }) {
  const now = new Date();
  const color = getDeadlineColor(due, now);
  const timeStr = formatTimeRemaining(due, now);
  return (
    <div
      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${getDeadlineStyleClasses(color)}`}
      data-testid={`deadline-badge-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
    >
      <Clock className="w-3 h-3" />
      <span>{label}:</span>
      <span className="font-medium">{timeStr}</span>
    </div>
  );
}

function IncidentDetailDialog({ incident }: { incident: IncidentCase }) {
  const [open, setOpen] = useState(false);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [notifType, setNotifType] = useState("EARLY_WARNING");
  const [notifChannel, setNotifChannel] = useState("");
  const [notifContent, setNotifContent] = useState("");
  const { toast } = useToast();

  const { data: notifications, isLoading: notifLoading } = useQuery<IncidentNotification[]>({
    queryKey: ["/api/incidents", incident.id, "notifications"],
    queryFn: async () => {
      const res = await fetch(`/api/incidents/${incident.id}/notifications`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: open,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("PATCH", `/api/incidents/${incident.id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({ title: "Status updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/incidents/${incident.id}/notifications`, {
        type: notifType,
        channel: notifChannel,
        content: { body: notifContent },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", incident.id, "notifications"] });
      setShowNotificationForm(false);
      setNotifType("EARLY_WARNING");
      setNotifChannel("");
      setNotifContent("");
      toast({ title: "Notification created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const now = new Date();

  const deadlines = [];
  if (incident.earlyWarningDueAt) {
    const due = new Date(incident.earlyWarningDueAt);
    deadlines.push({ label: "Early Warning (24h)", due, color: getDeadlineColor(due, now) });
  }
  if (incident.notificationDueAt) {
    const due = new Date(incident.notificationDueAt);
    deadlines.push({ label: "Notification (72h)", due, color: getDeadlineColor(due, now) });
  }
  if (incident.finalReportDueAt) {
    const due = new Date(incident.finalReportDueAt);
    deadlines.push({ label: "Final Report (1 month)", due, color: getDeadlineColor(due, now) });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid={`button-view-incident-${incident.id}`}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid={`dialog-incident-detail-${incident.id}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Shield className="w-5 h-5" />
            <span data-testid="text-incident-detail-title">{incident.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          <div className="flex items-center gap-2 flex-wrap" data-testid="incident-detail-meta">
            <Badge variant={severityColors[incident.severity] as any} data-testid="badge-incident-severity">
              {incident.severity}
            </Badge>
            {incident.isSignificant && (
              <Badge variant="outline" data-testid="badge-incident-significant">Significant</Badge>
            )}
            <span className="text-xs text-muted-foreground" data-testid="text-incident-detected">
              Detected: {new Date(incident.detectedAt).toLocaleString()}
            </span>
          </div>

          {incident.description && (
            <p className="text-sm text-muted-foreground" data-testid="text-incident-description">
              {incident.description}
            </p>
          )}

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={incident.status}
              onValueChange={(val) => updateStatusMutation.mutate(val)}
            >
              <SelectTrigger data-testid={`select-detail-status-${incident.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {incident.isSignificant && deadlines.length > 0 && (
            <div className="space-y-3" data-testid="deadline-timeline">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                EU Reporting Deadlines
              </h4>
              <div className="relative pl-4 space-y-4">
                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
                {deadlines.map((d, i) => (
                  <div key={i} className="relative flex items-start gap-3" data-testid={`timeline-item-${i}`}>
                    <div className={`relative z-10 w-3 h-3 rounded-full mt-0.5 shrink-0 ${getDeadlineDotClasses(d.color)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{d.label}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getDeadlineStyleClasses(d.color)}`}
                          data-testid={`badge-deadline-status-${i}`}
                        >
                          {d.color === "red" ? "OVERDUE" : d.color === "yellow" ? "URGENT" : "ON TRACK"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Due: {d.due.toLocaleString()} ({formatTimeRemaining(d.due, now)})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3" data-testid="notifications-section">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notification Drafts
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotificationForm(!showNotificationForm)}
                data-testid="button-create-notification"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Notification
              </Button>
            </div>

            {showNotificationForm && (
              <Card data-testid="notification-form">
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={notifType} onValueChange={setNotifType}>
                      <SelectTrigger data-testid="select-notification-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EARLY_WARNING">Early Warning</SelectItem>
                        <SelectItem value="NOTIFICATION">Notification</SelectItem>
                        <SelectItem value="FINAL_REPORT">Final Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Input
                      value={notifChannel}
                      onChange={(e) => setNotifChannel(e.target.value)}
                      placeholder="e.g. CSIRT, NCA, email"
                      data-testid="input-notification-channel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={notifContent}
                      onChange={(e) => setNotifContent(e.target.value)}
                      placeholder="Notification body content..."
                      rows={4}
                      data-testid="input-notification-content"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      onClick={() => createNotificationMutation.mutate()}
                      disabled={!notifContent || createNotificationMutation.isPending}
                      data-testid="button-submit-notification"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      {createNotificationMutation.isPending ? "Sending..." : "Submit"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowNotificationForm(false)}
                      data-testid="button-cancel-notification"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {notifLoading ? (
              <Skeleton className="h-16" />
            ) : notifications && notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map((notif) => (
                  <Card key={notif.id} data-testid={`card-notification-${notif.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Bell className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="outline" className="text-xs" data-testid={`badge-notification-type-${notif.id}`}>
                              {notificationTypeLabels[notif.type] || notif.type}
                            </Badge>
                            {notif.channel && (
                              <span className="text-xs text-muted-foreground" data-testid={`text-notification-channel-${notif.id}`}>
                                via {notif.channel}
                              </span>
                            )}
                            {notif.sentAt && (
                              <Badge variant="secondary" className="text-xs" data-testid={`badge-notification-sent-${notif.id}`}>
                                Sent
                              </Badge>
                            )}
                          </div>
                          {notif.content && typeof notif.content === "object" && (notif.content as any).body && (
                            <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-notification-body-${notif.id}`}>
                              {(notif.content as any).body}
                            </p>
                          )}
                          <span className="text-xs text-muted-foreground" data-testid={`text-notification-date-${notif.id}`}>
                            Created: {new Date(notif.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground" data-testid="text-no-notifications">
                No notifications drafted yet.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
          {incidents.map((incident) => (
            <Card key={incident.id} data-testid={`card-incident-${incident.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 ${incident.severity === "CRITICAL" || incident.severity === "HIGH" ? "text-red-500" : "text-muted-foreground"}`}>
                    {incident.isSignificant ? <Siren className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-sm" data-testid={`text-incident-title-${incident.id}`}>{incident.title}</h3>
                      <Badge variant={severityColors[incident.severity] as any} className="text-xs" data-testid={`badge-severity-${incident.id}`}>{incident.severity}</Badge>
                      {incident.isSignificant && <Badge variant="outline" className="text-xs" data-testid={`badge-significant-${incident.id}`}>Significant</Badge>}
                    </div>
                    {incident.description && <p className="text-xs text-muted-foreground mb-2" data-testid={`text-description-${incident.id}`}>{incident.description}</p>}

                    <div className="flex items-center gap-3 flex-wrap mb-3">
                      <span className="text-xs text-muted-foreground" data-testid={`text-detected-${incident.id}`}>
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

                    {incident.isSignificant && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {incident.earlyWarningDueAt && (
                          <DeadlineBadge label="Early Warning" due={new Date(incident.earlyWarningDueAt)} />
                        )}
                        {incident.notificationDueAt && (
                          <DeadlineBadge label="Notification" due={new Date(incident.notificationDueAt)} />
                        )}
                        {incident.finalReportDueAt && (
                          <DeadlineBadge label="Final Report" due={new Date(incident.finalReportDueAt)} />
                        )}
                      </div>
                    )}
                  </div>
                  <IncidentDetailDialog incident={incident} />
                </div>
              </CardContent>
            </Card>
          ))}
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
