import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, ListTodo, Clock, CheckCircle2, Circle, Eye, Calendar,
  Shield, ClipboardList, Pencil, Trash2, MessageSquare, Send,
  ExternalLink, Search, MoreHorizontal, AlertTriangle, ArrowUpDown,
  User, ChevronDown, ChevronUp, ChevronRight, Flame, ArrowUp, ArrowDown, Minus,
  LayoutList, GanttChart,
} from "lucide-react";
import type { Task } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { Link, useSearch } from "wouter";

type TenantUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
};

type EnrichedTask = Task & {
  controlTitle?: string | null;
  requirementCode?: string | null;
  category?: string | null;
  assessmentName?: string | null;
  ownerName?: string | null;
  atomicControlId?: number | null;
  sourceKey?: string | null;
  navResponseId?: number | null;
  navSource?: string | null;
};

type ControlObjective = {
  id: number;
  title: string;
  description: string;
  requirementId: number;
  requirementCode: string;
  requirementTitle: string;
  category: string;
};

type AssessmentSummary = {
  id: number;
  name: string;
  status: string;
  createdAt: string;
};

type EnrichedComment = {
  id: number;
  taskId: number;
  userId: number;
  content: string;
  createdAt: string;
  userName: string;
};

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  TODO: { label: "To Do", icon: Circle, color: "text-muted-foreground" },
  IN_PROGRESS: { label: "In Progress", icon: Clock, color: "text-blue-500" },
  IN_REVIEW: { label: "In Review", icon: Eye, color: "text-amber-500" },
  DONE: { label: "Done", icon: CheckCircle2, color: "text-green-500" },
};

const priorityConfig: Record<string, { label: string; variant: string; icon: any }> = {
  CRITICAL: { label: "Critical", variant: "destructive", icon: Flame },
  HIGH: { label: "High", variant: "destructive", icon: ArrowUp },
  MEDIUM: { label: "Medium", variant: "secondary", icon: Minus },
  LOW: { label: "Low", variant: "outline", icon: ArrowDown },
};

type SortOption = "priority" | "dueDate" | "status" | "title";

function getTaskCategory(task: EnrichedTask): string {
  if (task.atomicControlId && task.sourceKey === "CIR_2024_2690") return "CIR";
  if (task.atomicControlId) return "NIS2 Atomic";
  if (task.category) return task.category;
  return "NIS2 Objective";
}

function getCategoryVariant(category: string): "default" | "secondary" | "outline" {
  if (category === "CIR") return "default";
  if (category === "NIS2 Atomic") return "secondary";
  return "outline";
}

function prioritySortValue(p: string): number {
  const map: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return map[p] ?? 4;
}

function statusSortValue(s: string): number {
  const map: Record<string, number> = { TODO: 0, IN_PROGRESS: 1, IN_REVIEW: 2, DONE: 3 };
  return map[s] ?? 4;
}

function TaskComments({ taskId }: { taskId: number }) {
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const { data: comments, isLoading } = useQuery<EnrichedComment[]>({
    queryKey: ["/api/tasks", taskId, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/comments`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load comments");
      return res.json();
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/tasks/${taskId}/comments`, { content: content.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "comments"] });
      setContent("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-3 pt-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Comments</span>
        {comments && comments.length > 0 && (
          <Badge variant="secondary" className="text-xs">{comments.length}</Badge>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-16" />
      ) : comments && comments.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="p-2.5 rounded-md bg-muted/50 space-y-0.5" data-testid={`comment-${c.id}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-medium" data-testid={`text-comment-author-${c.id}`}>{c.userName}</span>
                <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm" data-testid={`text-comment-content-${c.id}`}>{c.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No comments yet</p>
      )}

      <div className="flex gap-2">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && content.trim()) addComment.mutate();
          }}
          data-testid={`input-comment-${taskId}`}
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => addComment.mutate()}
          disabled={!content.trim() || addComment.isPending}
          data-testid={`button-send-comment-${taskId}`}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f59e0b",
  MEDIUM: "#3b82f6",
  LOW: "#64748b",
};

const STATUS_COLORS: Record<string, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW: "#f59e0b",
  DONE: "#22c55e",
};

function GanttTimeline({ tasks, onTaskClick }: { tasks: EnrichedTask[]; onTaskClick: (id: number) => void }) {
  const [groupBy, setGroupBy] = useState<"status" | "priority" | "category">("status");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const { timelineStart, timelineEnd, totalDays, groups, hasAnyDates } = useMemo(() => {
    const now = new Date();
    let minDate = new Date(now);
    let maxDate = new Date(now);
    let anyDates = false;

    for (const t of tasks) {
      const created = t.createdAt ? new Date(t.createdAt) : null;
      const due = t.dueDate ? new Date(t.dueDate) : null;
      if (created) { if (created < minDate) minDate = new Date(created); anyDates = true; }
      if (due) { if (due > maxDate) maxDate = new Date(due); if (due < minDate) minDate = new Date(due); anyDates = true; }
    }

    minDate.setDate(minDate.getDate() - 5);
    maxDate.setDate(maxDate.getDate() + 10);
    const days = Math.max(Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)), 21);

    const grouped: Record<string, EnrichedTask[]> = {};
    for (const t of tasks) {
      let key: string;
      if (groupBy === "status") key = statusConfig[t.status]?.label || t.status;
      else if (groupBy === "priority") key = priorityConfig[t.priority]?.label || t.priority;
      else key = getTaskCategory(t);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    }

    return { timelineStart: minDate, timelineEnd: maxDate, totalDays: days, groups: grouped, hasAnyDates: anyDates };
  }, [tasks, groupBy]);

  const months = useMemo(() => {
    const result: { label: string; startPct: number; widthPct: number }[] = [];
    const start = new Date(timelineStart);
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current < timelineEnd) {
      const monthStart = Math.max(0, (current.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      const monthEnd = Math.min(totalDays, (nextMonth.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
      if (monthEnd > monthStart) {
        result.push({
          label: current.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          startPct: (monthStart / totalDays) * 100,
          widthPct: ((monthEnd - monthStart) / totalDays) * 100,
        });
      }
      current = nextMonth;
    }
    return result;
  }, [timelineStart, timelineEnd, totalDays]);

  const weeks = useMemo(() => {
    const result: { label: string; pct: number; isMonthStart: boolean }[] = [];
    const start = new Date(timelineStart);
    const dayOfWeek = start.getDay();
    const firstMonday = new Date(start);
    firstMonday.setDate(firstMonday.getDate() + ((8 - dayOfWeek) % 7));
    let cursor = new Date(firstMonday);
    while (cursor < timelineEnd) {
      const dayOffset = (cursor.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
      if (dayOffset >= 0 && dayOffset <= totalDays) {
        result.push({
          label: cursor.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
          pct: (dayOffset / totalDays) * 100,
          isMonthStart: cursor.getDate() <= 7,
        });
      }
      cursor.setDate(cursor.getDate() + 7);
    }
    return result;
  }, [timelineStart, timelineEnd, totalDays]);

  const todayPct = useMemo(() => {
    const now = new Date();
    const offset = (now.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    return (offset / totalDays) * 100;
  }, [timelineStart, totalDays]);

  const getBarStyle = (task: EnrichedTask) => {
    const created = task.createdAt ? new Date(task.createdAt) : new Date();
    const due = task.dueDate ? new Date(task.dueDate) : null;
    const now = new Date();

    let startDay = (created.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    let endDay: number;

    if (due) {
      endDay = (due.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    } else {
      endDay = startDay + 7;
    }

    if (endDay <= startDay) endDay = startDay + 1;

    const leftPct = Math.max(0, (startDay / totalDays) * 100);
    const widthPct = Math.max(1.5, ((endDay - startDay) / totalDays) * 100);

    let color = PRIORITY_COLORS[task.priority] || "#3b82f6";
    if (task.status === "DONE") color = STATUS_COLORS.DONE;
    const isOverdue = due && due < now && task.status !== "DONE";

    let progressPct = 0;
    if (task.status === "DONE") progressPct = 100;
    else if (task.status === "IN_REVIEW") progressPct = 80;
    else if (task.status === "IN_PROGRESS") progressPct = 40;

    return { leftPct, widthPct, color, isOverdue, hasDueDate: !!due, progressPct };
  };

  if (tasks.length === 0) return null;

  const groupOrder = groupBy === "status"
    ? ["To Do", "In Progress", "In Review", "Done"]
    : groupBy === "priority"
    ? ["Critical", "High", "Medium", "Low"]
    : Object.keys(groups).sort();

  const sortedGroupKeys = groupOrder.filter(k => groups[k]?.length > 0);
  const remainingKeys = Object.keys(groups).filter(k => !sortedGroupKeys.includes(k) && groups[k].length > 0);
  const allGroupKeys = [...sortedGroupKeys, ...remainingKeys];

  const groupColorMap: Record<string, string> = {
    "To Do": "#94a3b8", "In Progress": "#3b82f6", "In Review": "#f59e0b", "Done": "#22c55e",
    "Critical": "#ef4444", "High": "#f59e0b", "Medium": "#3b82f6", "Low": "#64748b",
  };

  const totalTaskCount = tasks.length;
  const doneCount = tasks.filter(t => t.status === "DONE").length;
  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length;

  return (
    <div className="space-y-3" data-testid="gantt-timeline">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Group by:</span>
          <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
            <SelectTrigger className="w-32" data-testid="select-gantt-group">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><ListTodo className="w-3.5 h-3.5" />{totalTaskCount} tasks</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />{doneCount} done</span>
          {overdueCount > 0 && (
            <span className="flex items-center gap-1.5 text-red-500 font-medium"><AlertTriangle className="w-3.5 h-3.5" />{overdueCount} overdue</span>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto" ref={scrollContainerRef}>
            <div className="min-w-[900px]">
              <div className="flex border-b-2 border-border bg-muted/30 sticky top-0 z-20">
                <div className="w-72 shrink-0 px-4 py-2.5 border-r border-border flex items-center gap-2">
                  <GanttChart className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Task</span>
                </div>
                <div className="w-20 shrink-0 px-2 py-2.5 border-r border-border text-center">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</span>
                </div>
                <div className="flex-1 relative">
                  <div className="h-full">
                    {months.map((m, i) => (
                      <div
                        key={i}
                        className="absolute top-0 h-full flex items-center justify-center text-xs font-semibold text-foreground/80 border-r border-border/50"
                        style={{ left: `${m.startPct}%`, width: `${m.widthPct}%` }}
                      >
                        {m.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex border-b border-border/60 bg-muted/15">
                <div className="w-72 shrink-0 border-r border-border" />
                <div className="w-20 shrink-0 border-r border-border" />
                <div className="flex-1 relative h-7">
                  {weeks.map((w, i) => (
                    <div
                      key={i}
                      className="absolute top-0 h-full flex items-end pb-1"
                      style={{ left: `${w.pct}%` }}
                    >
                      <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap" style={{ transform: "translateX(-50%)" }}>
                        {w.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {allGroupKeys.map((groupKey) => {
                const isCollapsed = collapsedGroups.has(groupKey);
                const groupTasks = groups[groupKey];
                const groupDone = groupTasks.filter(t => t.status === "DONE").length;
                const groupTotal = groupTasks.length;
                const groupPct = groupTotal > 0 ? Math.round((groupDone / groupTotal) * 100) : 0;
                const accentColor = groupColorMap[groupKey] || "#6b7280";

                return (
                  <div key={groupKey}>
                    <div
                      className="flex items-center border-b border-border cursor-pointer"
                      onClick={() => toggleGroup(groupKey)}
                      style={{ borderLeft: `3px solid ${accentColor}` }}
                      data-testid={`gantt-group-${groupKey.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <div className="w-72 shrink-0 px-3 py-2 border-r border-border flex items-center gap-2">
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        <span className="text-xs font-semibold">{groupKey}</span>
                        <Badge variant="secondary" className="text-[10px] ml-auto">{groupTotal}</Badge>
                      </div>
                      <div className="w-20 shrink-0 px-2 border-r border-border" />
                      <div className="flex-1 px-3 py-2 flex items-center gap-3">
                        <div className="flex-1 max-w-48 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${groupPct}%`, backgroundColor: accentColor, opacity: 0.7 }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium shrink-0">{groupPct}% complete</span>
                      </div>
                    </div>

                    {!isCollapsed && groupTasks.map((task, taskIdx) => {
                      const bar = getBarStyle(task);
                      const sc = statusConfig[task.status] || statusConfig.TODO;
                      const StatusIcon = sc.icon;
                      const pc = priorityConfig[task.priority] || priorityConfig.MEDIUM;
                      const PriorityIcon = pc.icon;
                      const isEvenRow = taskIdx % 2 === 0;

                      return (
                        <div
                          key={task.id}
                          className={`flex items-center border-b border-border/40 cursor-pointer hover-elevate ${isEvenRow ? "" : "bg-muted/15"}`}
                          onClick={() => onTaskClick(task.id)}
                          data-testid={`gantt-row-${task.id}`}
                        >
                          <div className="w-72 shrink-0 px-4 py-2.5 border-r border-border flex items-center gap-2.5 min-w-0">
                            <StatusIcon className={`w-4 h-4 shrink-0 ${sc.color}`} />
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-medium truncate ${task.status === "DONE" ? "line-through text-muted-foreground" : ""}`} data-testid={`gantt-task-title-${task.id}`}>
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {task.dueDate ? (
                                  <span className={`text-[10px] flex items-center gap-0.5 ${bar.isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                                    <Calendar className="w-2.5 h-2.5" />
                                    {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    {bar.isOverdue && " (overdue)"}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/60 italic">No due date</span>
                                )}
                                {task.ownerName && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <User className="w-2.5 h-2.5" />
                                    {task.ownerName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="w-20 shrink-0 px-2 py-2 border-r border-border flex items-center justify-center">
                            <div className="flex items-center gap-1">
                              <PriorityIcon className="w-3 h-3" style={{ color: PRIORITY_COLORS[task.priority] || "#6b7280" }} />
                              <span className="text-[10px] font-medium" style={{ color: PRIORITY_COLORS[task.priority] || "#6b7280" }}>
                                {pc.label}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 relative h-12">
                            {weeks.map((w, i) => (
                              <div
                                key={i}
                                className="absolute top-0 bottom-0 border-l border-border/20"
                                style={{ left: `${w.pct}%` }}
                              />
                            ))}
                            {todayPct >= 0 && todayPct <= 100 && (
                              <div
                                className="absolute top-0 bottom-0 w-px z-10"
                                style={{ left: `${todayPct}%`, background: "linear-gradient(to bottom, #ef4444, #ef444480)" }}
                              />
                            )}
                            <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${bar.leftPct}%`, width: `${bar.widthPct}%`, minWidth: "12px" }}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`h-7 rounded-md flex items-center px-2 overflow-hidden relative ${bar.isOverdue ? "ring-1 ring-red-500/70 ring-offset-1 ring-offset-background" : ""} ${!bar.hasDueDate ? "opacity-60 border border-dashed" : ""}`}
                                    style={{
                                      backgroundColor: bar.color + "cc",
                                      borderColor: !bar.hasDueDate ? bar.color + "60" : undefined,
                                    }}
                                  >
                                    <div
                                      className="absolute left-0 top-0 bottom-0 rounded-md"
                                      style={{
                                        width: `${bar.progressPct}%`,
                                        backgroundColor: "rgba(255,255,255,0.15)",
                                      }}
                                    />
                                    <div
                                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
                                      style={{ backgroundColor: bar.color }}
                                    />
                                    <span className="text-[10px] font-semibold truncate whitespace-nowrap relative z-10 pl-1 text-white drop-shadow-sm">
                                      {task.title}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs p-3">
                                  <div className="space-y-1.5">
                                    <p className="font-semibold text-sm">{task.title}</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                      <span className="text-[11px] text-muted-foreground">Status:</span>
                                      <span className="text-[11px] font-medium">{sc.label}</span>
                                      <span className="text-[11px] text-muted-foreground">Priority:</span>
                                      <span className="text-[11px] font-medium">{pc.label}</span>
                                      {task.dueDate && (
                                        <>
                                          <span className="text-[11px] text-muted-foreground">Due:</span>
                                          <span className="text-[11px] font-medium">{new Date(task.dueDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                                        </>
                                      )}
                                      {task.ownerName && (
                                        <>
                                          <span className="text-[11px] text-muted-foreground">Assigned:</span>
                                          <span className="text-[11px] font-medium">{task.ownerName}</span>
                                        </>
                                      )}
                                      {task.category && (
                                        <>
                                          <span className="text-[11px] text-muted-foreground">Category:</span>
                                          <span className="text-[11px] font-medium">{getTaskCategory(task)}</span>
                                        </>
                                      )}
                                    </div>
                                    {bar.isOverdue && <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Overdue</p>}
                                    {!bar.hasDueDate && <p className="text-[11px] text-muted-foreground italic">No due date set — bar shown as estimate</p>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">Legend:</span>
          {Object.entries(PRIORITY_COLORS).map(([key, color]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: color }} />
              {priorityConfig[key]?.label || key}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: STATUS_COLORS.DONE }} />
            Done
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-px h-3.5 bg-red-500" />
            Today
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm border border-dashed border-muted-foreground/40 bg-muted/30" />
            No due date
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const isAdmin = user?.role === "TENANT_ADMIN" || user?.role === "TENANT_MANAGER" || user?.role === "PLATFORM_ADMIN";

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [controlObjectiveId, setControlObjectiveId] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filterByUser, setFilterByUser] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("priority");
  const [sortAsc, setSortAsc] = useState(true);

  const [editingTask, setEditingTask] = useState<EnrichedTask | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState("TODO");
  const [editAssigneeId, setEditAssigneeId] = useState("");

  const [deletingTask, setDeletingTask] = useState<EnrichedTask | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");

  const searchString = useSearch();
  const highlightedTaskId = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const t = params.get("task");
    return t ? parseInt(t) : null;
  }, [searchString]);
  const taskRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const didScrollRef = useRef(false);

  const { toast } = useToast();

  const { data: tasks, isLoading } = useQuery<EnrichedTask[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: controlObjectives } = useQuery<ControlObjective[]>({
    queryKey: ["/api/control-objectives"],
  });

  const { data: assessments, isLoading: assessmentsLoading } = useQuery<AssessmentSummary[]>({
    queryKey: ["/api/assessments"],
  });

  const { data: tenantUsers } = useQuery<TenantUser[]>({
    queryKey: ["/api/tenant-users"],
  });

  useEffect(() => {
    if (highlightedTaskId && tasks && !didScrollRef.current) {
      setExpandedTaskId(highlightedTaskId);
      didScrollRef.current = true;
      setTimeout(() => {
        const el = taskRefs.current[highlightedTaskId];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-primary");
          setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 3000);
        }
      }, 200);
    }
  }, [highlightedTaskId, tasks]);

  const activeAssessments = useMemo(() => {
    if (!assessments) return [];
    return assessments.filter(a => a.status !== "ARCHIVED");
  }, [assessments]);

  const groupedControls = useMemo(() => {
    if (!controlObjectives) return {};
    const grouped: Record<string, ControlObjective[]> = {};
    for (const co of controlObjectives) {
      const key = `${co.requirementCode} - ${co.category}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(co);
    }
    return grouped;
  }, [controlObjectives]);

  const stats = useMemo(() => {
    if (!tasks) return { total: 0, overdue: 0, critical: 0, high: 0, done: 0, inProgress: 0 };
    const now = new Date();
    return {
      total: tasks.length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE").length,
      critical: tasks.filter(t => t.priority === "CRITICAL" && t.status !== "DONE").length,
      high: tasks.filter(t => t.priority === "HIGH" && t.status !== "DONE").length,
      done: tasks.filter(t => t.status === "DONE").length,
      inProgress: tasks.filter(t => t.status === "IN_PROGRESS").length,
    };
  }, [tasks]);

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/tasks", {
        title,
        description: description || null,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        controlObjectiveId: parseInt(controlObjectiveId),
        assessmentId: parseInt(assessmentId),
        ownerUserId: assigneeId ? parseInt(assigneeId) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setDueDate("");
      setControlObjectiveId("");
      setAssessmentId("");
      setAssigneeId("");
      toast({ title: "Task created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      await apiRequest("PATCH", `/api/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingTask) return;
      await apiRequest("PATCH", `/api/tasks/${editingTask.id}`, {
        title: editTitle,
        description: editDescription || null,
        priority: editPriority,
        status: editStatus,
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
        ownerUserId: editAssigneeId ? parseInt(editAssigneeId) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setEditingTask(null);
      toast({ title: "Task updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingTask) return;
      await apiRequest("DELETE", `/api/tasks/${deletingTask.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDeletingTask(null);
      toast({ title: "Task deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openEdit = (task: EnrichedTask) => {
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
    setEditAssigneeId(task.ownerUserId ? String(task.ownerUserId) : "");
    setEditingTask(task);
  };

  const filteredTasks = useMemo(() => {
    let result = tasks || [];

    if (activeTab !== "all") {
      result = result.filter(t => t.status === activeTab);
    }

    if (isAdmin && filterByUser !== "all") {
      result = result.filter(t => String(t.ownerUserId) === filterByUser);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.controlTitle && t.controlTitle.toLowerCase().includes(q)) ||
        (t.requirementCode && t.requirementCode.toLowerCase().includes(q))
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "priority":
          cmp = prioritySortValue(a.priority) - prioritySortValue(b.priority);
          break;
        case "dueDate": {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          cmp = da - db;
          break;
        }
        case "status":
          cmp = statusSortValue(a.status) - statusSortValue(b.status);
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [tasks, activeTab, filterByUser, isAdmin, searchQuery, sortBy, sortAsc]);

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(option);
      setSortAsc(true);
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="tasks-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-tasks-heading">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Track remediation and compliance activities</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-task">
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Assessment <span className="text-red-500">*</span></Label>
                <Select value={assessmentId} onValueChange={setAssessmentId} disabled={assessmentsLoading}>
                  <SelectTrigger data-testid="select-task-assessment">
                    <SelectValue placeholder={assessmentsLoading ? "Loading assessments..." : "Select an assessment..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAssessments.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground text-center">No assessments available. Create an assessment first.</div>
                    ) : (
                      activeAssessments.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>NIS2 Control Objective <span className="text-red-500">*</span></Label>
                <Select value={controlObjectiveId} onValueChange={setControlObjectiveId}>
                  <SelectTrigger data-testid="select-task-control-objective">
                    <SelectValue placeholder="Select a control objective..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {Object.entries(groupedControls).map(([group, controls]) => (
                      <SelectGroup key={group}>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground">{group}</SelectLabel>
                        {controls.map((co) => (
                          <SelectItem key={co.id} value={String(co.id)}>
                            {co.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
                  data-testid="input-task-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task description"
                  data-testid="input-task-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger data-testid="select-task-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    data-testid="input-task-due-date"
                  />
                </div>
              </div>
              {isAdmin && tenantUsers && tenantUsers.length > 0 && (
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger data-testid="select-task-assignee">
                      <SelectValue placeholder="Select a user (defaults to you)" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenantUsers.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.fullName} ({u.role.replace("TENANT_", "")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!title || !controlObjectiveId || !assessmentId || createMutation.isPending}
                className="w-full"
                data-testid="button-submit-task"
              >
                {createMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!isLoading && tasks && tasks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="task-stats">
          <Card>
            <CardContent className="p-3 flex flex-col items-center gap-1">
              <span className="text-2xl font-bold" data-testid="text-stat-total">{stats.total}</span>
              <span className="text-xs text-muted-foreground">Total Tasks</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-blue-500" data-testid="text-stat-inprogress">{stats.inProgress}</span>
              <span className="text-xs text-muted-foreground">In Progress</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-green-500" data-testid="text-stat-done">{stats.done}</span>
              <span className="text-xs text-muted-foreground">Completed</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex flex-col items-center gap-1">
              <span className={`text-2xl font-bold ${stats.overdue > 0 ? "text-red-500" : ""}`} data-testid="text-stat-overdue">{stats.overdue}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {stats.overdue > 0 && <AlertTriangle className="w-3 h-3 text-red-500" />}
                Overdue
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex flex-col items-center gap-1">
              <span className={`text-2xl font-bold ${stats.critical > 0 ? "text-red-500" : ""}`} data-testid="text-stat-critical">{stats.critical}</span>
              <span className="text-xs text-muted-foreground">Critical</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex flex-col items-center gap-1">
              <span className={`text-2xl font-bold ${stats.high > 0 ? "text-amber-500" : ""}`} data-testid="text-stat-high">{stats.high}</span>
              <span className="text-xs text-muted-foreground">High Priority</span>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9"
              data-testid="input-search-tasks"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-sort-tasks">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Sort: {sortBy === "priority" ? "Priority" : sortBy === "dueDate" ? "Due Date" : sortBy === "status" ? "Status" : "Title"}
                {sortAsc ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toggleSort("priority")} data-testid="sort-priority">
                Priority {sortBy === "priority" && (sortAsc ? "(High first)" : "(Low first)")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort("dueDate")} data-testid="sort-duedate">
                Due Date {sortBy === "dueDate" && (sortAsc ? "(Earliest)" : "(Latest)")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort("status")} data-testid="sort-status">
                Status {sortBy === "status" && (sortAsc ? "(To Do first)" : "(Done first)")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort("title")} data-testid="sort-title">
                Title {sortBy === "title" && (sortAsc ? "(A-Z)" : "(Z-A)")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isAdmin && tenantUsers && tenantUsers.length > 1 && (
            <Select value={filterByUser} onValueChange={setFilterByUser}>
              <SelectTrigger className="w-48" data-testid="select-filter-user">
                <User className="w-4 h-4 mr-1 shrink-0" />
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {tenantUsers.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="rounded-r-none"
              data-testid="button-view-list"
            >
              <LayoutList className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "timeline" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("timeline")}
              className="rounded-l-none"
              data-testid="button-view-timeline"
            >
              <GanttChart className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-task-filter">
            <TabsTrigger value="all" data-testid="tab-all">All ({tasks?.length || 0})</TabsTrigger>
            <TabsTrigger value="TODO" data-testid="tab-todo">To Do ({tasks?.filter((t) => t.status === "TODO").length || 0})</TabsTrigger>
            <TabsTrigger value="IN_PROGRESS" data-testid="tab-inprogress">In Progress ({tasks?.filter((t) => t.status === "IN_PROGRESS").length || 0})</TabsTrigger>
            <TabsTrigger value="IN_REVIEW" data-testid="tab-inreview">In Review ({tasks?.filter((t) => t.status === "IN_REVIEW").length || 0})</TabsTrigger>
            <TabsTrigger value="DONE" data-testid="tab-done">Done ({tasks?.filter((t) => t.status === "DONE").length || 0})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
      ) : viewMode === "timeline" ? (
        filteredTasks.length > 0 ? (
          <GanttTimeline
            tasks={filteredTasks}
            onTaskClick={(id) => {
              setViewMode("list");
              setExpandedTaskId(id);
              setTimeout(() => {
                const el = taskRefs.current[id];
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 100);
            }}
          />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <GanttChart className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="font-semibold mb-1">No tasks to display</h3>
              <p className="text-sm text-muted-foreground">Create tasks with due dates for the timeline view</p>
            </CardContent>
          </Card>
        )
      ) : filteredTasks.length > 0 ? (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const sc = statusConfig[task.status] || statusConfig.TODO;
            const StatusIcon = sc.icon;
            const pc = priorityConfig[task.priority] || priorityConfig.MEDIUM;
            const PriorityIcon = pc.icon;
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";
            const isExpanded = expandedTaskId === task.id;
            const category = getTaskCategory(task);

            return (
              <Card
                key={task.id}
                ref={(el: HTMLDivElement | null) => { taskRefs.current[task.id] = el; }}
                className={`transition-all ${isExpanded ? "ring-1 ring-primary/20" : ""}`}
                data-testid={`card-task-${task.id}`}
              >
                <CardContent className="p-0">
                  <div className="flex items-start gap-4 p-4">
                    <div className="pt-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Select
                              value={task.status}
                              onValueChange={(val) => updateStatusMutation.mutate({ taskId: task.id, status: val })}
                            >
                              <SelectTrigger className="w-auto border-0 p-0 h-auto shadow-none focus:ring-0" data-testid={`select-task-status-${task.id}`}>
                                <StatusIcon className={`w-5 h-5 ${sc.color}`} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TODO">
                                  <span className="flex items-center gap-2"><Circle className="w-4 h-4" /> To Do</span>
                                </SelectItem>
                                <SelectItem value="IN_PROGRESS">
                                  <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" /> In Progress</span>
                                </SelectItem>
                                <SelectItem value="IN_REVIEW">
                                  <span className="flex items-center gap-2"><Eye className="w-4 h-4 text-amber-500" /> In Review</span>
                                </SelectItem>
                                <SelectItem value="DONE">
                                  <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Done</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{sc.label} - Click to change</TooltipContent>
                      </Tooltip>
                    </div>

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      data-testid={`button-expand-task-${task.id}`}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-medium ${task.status === "DONE" ? "line-through text-muted-foreground" : ""}`} data-testid={`text-task-title-${task.id}`}>
                              {task.title}
                            </p>
                            <Badge variant={getCategoryVariant(category)} className="text-[10px] shrink-0" data-testid={`badge-task-category-${task.id}`}>
                              {category}
                            </Badge>
                          </div>

                          {task.description && !isExpanded && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                          )}

                          <div className="flex items-center gap-x-4 gap-y-1 mt-2 flex-wrap">
                            {task.controlTitle && (
                              <div className="flex items-center gap-1.5">
                                <Shield className="w-3 h-3 text-primary shrink-0" />
                                {task.assessmentId && task.navResponseId && task.navSource ? (
                                  <Link
                                    href={`/assessments/${task.assessmentId}?control=${task.navSource}-${task.navResponseId}`}
                                    className="text-xs text-primary hover:underline truncate inline-flex items-center gap-0.5 max-w-[250px]"
                                    data-testid={`link-task-control-${task.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {task.requirementCode ? `${task.requirementCode}` : ""}{task.requirementCode ? " — " : ""}{task.controlTitle}
                                    <ExternalLink className="w-2.5 h-2.5 shrink-0 ml-0.5" />
                                  </Link>
                                ) : (
                                  <span className="text-xs text-muted-foreground truncate max-w-[250px]" data-testid={`text-task-control-${task.id}`}>
                                    {task.requirementCode ? `${task.requirementCode} — ` : ""}{task.controlTitle}
                                  </span>
                                )}
                              </div>
                            )}
                            {task.assessmentName && (
                              <div className="flex items-center gap-1.5">
                                <ClipboardList className="w-3 h-3 text-muted-foreground shrink-0" />
                                {task.assessmentId ? (
                                  <Link
                                    href={`/assessments/${task.assessmentId}`}
                                    className="text-xs text-muted-foreground hover:text-foreground hover:underline truncate inline-flex items-center gap-0.5"
                                    data-testid={`link-task-assessment-${task.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {task.assessmentName}
                                  </Link>
                                ) : (
                                  <span className="text-xs text-muted-foreground truncate" data-testid={`text-task-assessment-${task.id}`}>
                                    {task.assessmentName}
                                  </span>
                                )}
                              </div>
                            )}
                            {task.ownerName && (
                              <div className="flex items-center gap-1.5">
                                <User className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground" data-testid={`text-task-owner-${task.id}`}>
                                  {task.ownerName}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      {task.dueDate && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`text-xs flex items-center gap-1 whitespace-nowrap ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`} data-testid={`text-task-due-${task.id}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(task.dueDate).toLocaleDateString()}
                              {isOverdue && <AlertTriangle className="w-3 h-3" />}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{isOverdue ? "Overdue!" : "Due date"}</TooltipContent>
                        </Tooltip>
                      )}

                      <Badge variant={pc.variant as any} className="text-xs gap-1 shrink-0" data-testid={`badge-task-priority-${task.id}`}>
                        <PriorityIcon className="w-3 h-3" />
                        {pc.label}
                      </Badge>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        data-testid={`button-comments-toggle-${task.id}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" data-testid={`button-task-actions-${task.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(task)} data-testid={`menu-edit-task-${task.id}`}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Task
                          </DropdownMenuItem>
                          {task.assessmentId && task.navResponseId && task.navSource && (
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/assessments/${task.assessmentId}?control=${task.navSource}-${task.navResponseId}`}
                                className="flex items-center"
                                data-testid={`menu-goto-control-${task.id}`}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Go to Control
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeletingTask(task)}
                            data-testid={`menu-delete-task-${task.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {isExpanded && (
                    <>
                      <Separator />
                      <div className="p-4 bg-muted/30">
                        {task.description && (
                          <div className="mb-3">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</span>
                            <p className="text-sm mt-1">{task.description}</p>
                          </div>
                        )}
                        <TaskComments taskId={task.id} />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ListTodo className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">
              {searchQuery ? "No tasks match your search" : "No tasks found"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? "Try adjusting your search or filters" : "Create tasks to track compliance activities"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreate(true)} data-testid="button-create-first-task">
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingTask} onOpenChange={(open) => { if (!open) setEditingTask(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                data-testid="input-edit-task-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                data-testid="input-edit-task-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger data-testid="select-edit-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger data-testid="select-edit-task-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="IN_REVIEW">In Review</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                data-testid="input-edit-task-due-date"
              />
            </div>
            {isAdmin && tenantUsers && tenantUsers.length > 0 && (
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={editAssigneeId} onValueChange={setEditAssigneeId}>
                  <SelectTrigger data-testid="select-edit-task-assignee">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantUsers.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.fullName} ({u.role.replace("TENANT_", "")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              onClick={() => editMutation.mutate()}
              disabled={!editTitle || editMutation.isPending}
              className="w-full"
              data-testid="button-save-edit-task"
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingTask} onOpenChange={(open) => { if (!open) setDeletingTask(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingTask?.title}"? This will also remove all comments. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingTask(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
