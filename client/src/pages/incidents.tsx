import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Plus, AlertTriangle, Clock, Bell, Send, ChevronRight, Shield, Siren,
  Search, Filter, ArrowUpDown, Activity, ShieldAlert, ShieldCheck, Eye, FileText,
  CheckCircle2, XCircle, Radio, Zap, Timer,
} from "lucide-react";
import type { IncidentCase, IncidentNotification } from "@shared/schema";

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string; badgeVariant: string }> = {
  CRITICAL: { color: "#dc2626", bg: "#dc262612", label: "Critical", badgeVariant: "destructive" },
  HIGH: { color: "#f59e0b", bg: "#f59e0b12", label: "High", badgeVariant: "destructive" },
  MEDIUM: { color: "#3b82f6", bg: "#3b82f612", label: "Medium", badgeVariant: "secondary" },
  LOW: { color: "#22c55e", bg: "#22c55e12", label: "Low", badgeVariant: "outline" },
};

const STATUS_CONFIG: Record<string, { icon: typeof Radio; color: string; label: string; order: number }> = {
  DETECTED: { icon: Radio, color: "#dc2626", label: "Detected", order: 0 },
  TRIAGED: { icon: Eye, color: "#f59e0b", label: "Triaged", order: 1 },
  CONTAINED: { icon: Shield, color: "#3b82f6", label: "Contained", order: 2 },
  ERADICATED: { icon: ShieldCheck, color: "#8b5cf6", label: "Eradicated", order: 3 },
  RECOVERED: { icon: CheckCircle2, color: "#22c55e", label: "Recovered", order: 4 },
  CLOSED: { icon: XCircle, color: "#6b7280", label: "Closed", order: 5 },
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
    case "green": return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
    case "yellow": return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
    case "red": return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
  }
}

function getDeadlineDotClasses(color: "green" | "yellow" | "red"): string {
  switch (color) {
    case "green": return "bg-green-500";
    case "yellow": return "bg-yellow-500";
    case "red": return "bg-red-500";
  }
}

function StatusPipeline({ status }: { status: string }) {
  const stages = ["DETECTED", "TRIAGED", "CONTAINED", "ERADICATED", "RECOVERED", "CLOSED"];
  const rawIdx = stages.indexOf(status);
  const currentIdx = rawIdx >= 0 ? rawIdx : 0;
  return (
    <div className="flex items-center gap-0.5" data-testid="incident-status-pipeline">
      {stages.map((stage, idx) => {
        const conf = STATUS_CONFIG[stage];
        const isActive = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <Tooltip key={stage}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-0.5">
                <div
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    backgroundColor: isActive ? conf.color : "var(--border)",
                    boxShadow: isCurrent ? `0 0 0 3px ${conf.color}25` : "none",
                  }}
                />
                {idx < stages.length - 1 && (
                  <div
                    className="w-3 h-0.5 rounded-full"
                    style={{ backgroundColor: idx < currentIdx ? conf.color : "var(--border)" }}
                  />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent><span className="text-xs">{conf.label}</span></TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

function DeadlineCompact({ label, due, icon: Icon }: { label: string; due: Date; icon: typeof Clock }) {
  const now = new Date();
  const color = getDeadlineColor(due, now);
  const timeStr = formatTimeRemaining(due, now);
  const dotColor = color === "red" ? "#dc2626" : color === "yellow" ? "#f59e0b" : "#22c55e";
  return (
    <div
      className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md ${getDeadlineStyleClasses(color)}`}
      data-testid={`deadline-badge-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
    >
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
      <Icon className="w-3 h-3 shrink-0" />
      <span className="font-medium truncate">{label}:</span>
      <span className="truncate">{timeStr}</span>
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
          <DialogDescription>Incident case details and NIS2 notification management</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          <div className="flex items-center gap-2 flex-wrap" data-testid="incident-detail-meta">
            <Badge variant={SEVERITY_CONFIG[incident.severity]?.badgeVariant as any} data-testid="badge-incident-severity">
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
                {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
                  <SelectItem key={val} value={val}>{conf.label}</SelectItem>
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

function IncidentCard({ incident, onStatusChange }: {
  incident: IncidentCase;
  onStatusChange: (id: number, status: string) => void;
}) {
  const sev = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.MEDIUM;
  const statusConf = STATUS_CONFIG[incident.status] || STATUS_CONFIG.DETECTED;
  const StatusIcon = statusConf.icon;
  const now = new Date();
  const detectedDate = new Date(incident.detectedAt);
  const daysSince = Math.floor((now.getTime() - detectedDate.getTime()) / (1000 * 60 * 60 * 24));

  const overdueCount = [incident.earlyWarningDueAt, incident.notificationDueAt, incident.finalReportDueAt]
    .filter(d => d && new Date(d).getTime() < now.getTime()).length;

  return (
    <Card className="hover-elevate group" data-testid={`card-incident-${incident.id}`}>
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-md" style={{ backgroundColor: sev.color }} />
      <CardContent className="p-4 pt-5">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: sev.bg }}
          >
            {incident.isSignificant
              ? <Siren className="w-4 h-4" style={{ color: sev.color }} />
              : <AlertTriangle className="w-4 h-4" style={{ color: sev.color }} />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm leading-tight truncate" data-testid={`text-incident-title-${incident.id}`}>
                  {incident.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 gap-1 no-default-hover-elevate no-default-active-elevate"
                    style={{ borderColor: sev.color + "40", color: sev.color }}
                    data-testid={`badge-severity-${incident.id}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sev.color }} />
                    {sev.label}
                  </Badge>
                  {incident.isSignificant && (
                    <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate" data-testid={`badge-significant-${incident.id}`}>
                      NIS2 Significant
                    </Badge>
                  )}
                  <div className="flex items-center gap-1">
                    <StatusIcon className="w-3 h-3" style={{ color: statusConf.color }} />
                    <span className="text-[10px] font-medium" style={{ color: statusConf.color }}>{statusConf.label}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Select
                  value={incident.status}
                  onValueChange={(val) => onStatusChange(incident.id, val)}
                >
                  <SelectTrigger className="w-auto text-xs border-none" data-testid={`select-incident-status-${incident.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
                      <SelectItem key={val} value={val}>{conf.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <IncidentDetailDialog incident={incident} />
              </div>
            </div>

            {incident.description && (
              <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2" data-testid={`text-description-${incident.id}`}>
                {incident.description}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <StatusPipeline status={incident.status} />
              <span className="text-[10px] text-muted-foreground" data-testid={`text-detected-${incident.id}`}>
                {daysSince === 0 ? "Today" : daysSince === 1 ? "Yesterday" : `${daysSince}d ago`}
              </span>
            </div>

            {incident.isSignificant && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {incident.earlyWarningDueAt && (
                  <DeadlineCompact label="EW 24h" due={new Date(incident.earlyWarningDueAt)} icon={Zap} />
                )}
                {incident.notificationDueAt && (
                  <DeadlineCompact label="Notif 72h" due={new Date(incident.notificationDueAt)} icon={Bell} />
                )}
                {incident.finalReportDueAt && (
                  <DeadlineCompact label="Final 1mo" due={new Date(incident.finalReportDueAt)} icon={FileText} />
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Incidents() {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [isSignificant, setIsSignificant] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "severity" | "status">("newest");
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

  const stats = useMemo(() => {
    if (!incidents) return { total: 0, active: 0, significant: 0, critical: 0, overdue: 0, closed: 0 };
    const now = new Date();
    const total = incidents.length;
    const active = incidents.filter(i => i.status !== "CLOSED").length;
    const significant = incidents.filter(i => i.isSignificant).length;
    const critical = incidents.filter(i => i.severity === "CRITICAL" || i.severity === "HIGH").length;
    const overdue = incidents.filter(i => {
      if (!i.isSignificant) return false;
      return [i.earlyWarningDueAt, i.notificationDueAt, i.finalReportDueAt]
        .some(d => d && new Date(d).getTime() < now.getTime());
    }).length;
    const closed = incidents.filter(i => i.status === "CLOSED").length;
    return { total, active, significant, critical, overdue, closed };
  }, [incidents]);

  const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  const filtered = useMemo(() => {
    if (!incidents) return [];
    let result = [...incidents];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.description && i.description.toLowerCase().includes(q))
      );
    }
    if (filterSeverity !== "all") result = result.filter(i => i.severity === filterSeverity);
    if (filterStatus !== "all") {
      if (filterStatus === "ACTIVE") result = result.filter(i => i.status !== "CLOSED");
      else if (filterStatus === "SIGNIFICANT") result = result.filter(i => i.isSignificant);
      else result = result.filter(i => i.status === filterStatus);
    }
    result.sort((a, b) => {
      if (sortBy === "severity") return (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
      if (sortBy === "status") return (STATUS_CONFIG[a.status]?.order ?? 9) - (STATUS_CONFIG[b.status]?.order ?? 9);
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });
    return result;
  }, [incidents, searchQuery, filterSeverity, filterStatus, sortBy]);

  return (
    <div className="p-6 space-y-5" data-testid="incidents-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-incidents-heading">Incidents</h1>
          <p className="text-sm text-muted-foreground mt-1">NIS2 Art. 23 incident reporting and case management</p>
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
              <DialogDescription>Log a new security incident for case management and NIS2 compliance tracking.</DialogDescription>
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

      {!isLoading && incidents && incidents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="incident-kpis">
          <Card>
            <CardContent className="p-3 text-center">
              <Activity className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xl font-bold" data-testid="kpi-total-incidents">{stats.total}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Radio className="w-4 h-4 mx-auto mb-1" style={{ color: "#dc2626" }} />
              <div className="text-xl font-bold" style={stats.active > 0 ? { color: "#dc2626" } : {}} data-testid="kpi-active-incidents">{stats.active}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Siren className="w-4 h-4 mx-auto mb-1" style={{ color: "#f59e0b" }} />
              <div className="text-xl font-bold" style={stats.significant > 0 ? { color: "#f59e0b" } : {}} data-testid="kpi-significant-incidents">{stats.significant}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Significant</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <ShieldAlert className="w-4 h-4 mx-auto mb-1" style={{ color: "#dc2626" }} />
              <div className="text-xl font-bold" style={stats.critical > 0 ? { color: "#dc2626" } : {}} data-testid="kpi-critical-incidents">{stats.critical}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">High/Critical</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Timer className="w-4 h-4 mx-auto mb-1" style={{ color: stats.overdue > 0 ? "#dc2626" : undefined }} />
              <div className="text-xl font-bold" style={stats.overdue > 0 ? { color: "#dc2626" } : {}} data-testid="kpi-overdue-incidents">{stats.overdue}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Overdue</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="w-4 h-4 mx-auto mb-1" style={{ color: "#22c55e" }} />
              <div className="text-xl font-bold" style={{ color: "#22c55e" }} data-testid="kpi-closed-incidents">{stats.closed}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Closed</div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && incidents && incidents.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap" data-testid="incident-controls">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-incidents"
            />
          </div>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-36" data-testid="select-filter-severity">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36" data-testid="select-filter-status">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active Only</SelectItem>
              <SelectItem value="SIGNIFICANT">Significant</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
                <SelectItem key={val} value={val}>{conf.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-36" data-testid="select-sort-incidents">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="severity">Severity</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto" data-testid="text-incident-count">
            {filtered.length} of {incidents?.length || 0} incidents
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-24" /></CardContent></Card>
          ))}
        </div>
      ) : incidents && incidents.length > 0 ? (
        filtered.length > 0 ? (
          <div className="space-y-3" data-testid="incident-list">
            {filtered.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onStatusChange={(id, status) => updateStatusMutation.mutate({ incidentId: id, status })}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold mb-1">No matching incidents</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">No incidents reported</h3>
            <p className="text-sm text-muted-foreground mb-4">Report security incidents for NIS2 compliance tracking</p>
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
