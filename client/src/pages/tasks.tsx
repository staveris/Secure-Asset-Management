import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, ListTodo, Clock, CheckCircle2, Circle, Eye, Calendar,
  Shield, ClipboardList, Pencil, Trash2, MessageSquare, Send,
  ExternalLink,
} from "lucide-react";
import type { Task } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { User } from "lucide-react";
import { Link } from "wouter";

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

const priorityColors: Record<string, string> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
};

const statusDisplay: Record<string, { label: string; icon: any }> = {
  TODO: { label: "To Do", icon: Circle },
  IN_PROGRESS: { label: "In Progress", icon: Clock },
  IN_REVIEW: { label: "In Review", icon: Eye },
  DONE: { label: "Done", icon: CheckCircle2 },
};

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
    <div className="space-y-3">
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
            <div key={c.id} className="p-2 rounded-md bg-muted/50 space-y-0.5" data-testid={`comment-${c.id}`}>
              <div className="flex items-center justify-between gap-2">
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

  const [editingTask, setEditingTask] = useState<EnrichedTask | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState("TODO");
  const [editAssigneeId, setEditAssigneeId] = useState("");

  const [deletingTask, setDeletingTask] = useState<EnrichedTask | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

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

  const filteredTasks = tasks?.filter((t) => {
    if (activeTab !== "all" && t.status !== activeTab) return false;
    if (isAdmin && filterByUser !== "all" && String(t.ownerUserId) !== filterByUser) return false;
    return true;
  }) || [];

  return (
    <div className="p-6 space-y-6" data-testid="tasks-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">Track remediation and compliance activities</p>
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

      <div className="flex items-center gap-4 flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList data-testid="tabs-task-filter">
            <TabsTrigger value="all">All ({tasks?.length || 0})</TabsTrigger>
            <TabsTrigger value="TODO">To Do ({tasks?.filter((t) => t.status === "TODO").length || 0})</TabsTrigger>
            <TabsTrigger value="IN_PROGRESS">In Progress ({tasks?.filter((t) => t.status === "IN_PROGRESS").length || 0})</TabsTrigger>
            <TabsTrigger value="IN_REVIEW">In Review ({tasks?.filter((t) => t.status === "IN_REVIEW").length || 0})</TabsTrigger>
            <TabsTrigger value="DONE">Done ({tasks?.filter((t) => t.status === "DONE").length || 0})</TabsTrigger>
          </TabsList>
        </Tabs>
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
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const statusInfo = statusDisplay[task.status];
            const StatusIcon = statusInfo?.icon || Circle;
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";
            const isExpanded = expandedTaskId === task.id;

            return (
              <Card key={task.id} data-testid={`card-task-${task.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Select
                      value={task.status}
                      onValueChange={(val) => updateStatusMutation.mutate({ taskId: task.id, status: val })}
                    >
                      <SelectTrigger className="w-auto border-0 p-0 h-auto shadow-none" data-testid={`select-task-status-${task.id}`}>
                        <StatusIcon className={`w-5 h-5 ${task.status === "DONE" ? "text-green-500" : "text-muted-foreground"}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODO">To Do</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="IN_REVIEW">In Review</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      data-testid={`button-expand-task-${task.id}`}
                    >
                      <p className={`text-sm font-medium ${task.status === "DONE" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {task.controlTitle && (
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3 h-3 text-primary shrink-0" />
                            {task.assessmentId && task.navResponseId && task.navSource ? (
                              <Link
                                href={`/assessments/${task.assessmentId}?control=${task.navSource}-${task.navResponseId}`}
                                className="text-xs text-primary hover:underline truncate inline-flex items-center gap-0.5"
                                data-testid={`link-task-control-${task.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {task.requirementCode ? `${task.requirementCode} — ` : ""}{task.controlTitle}
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-foreground truncate" data-testid={`text-task-control-${task.id}`}>
                                {task.requirementCode ? `${task.requirementCode} — ` : ""}{task.controlTitle}
                              </span>
                            )}
                          </div>
                        )}
                        {task.assessmentName && (
                          <div className="flex items-center gap-1.5">
                            <ClipboardList className="w-3 h-3 text-blue-500 shrink-0" />
                            {task.assessmentId ? (
                              <Link
                                href={`/assessments/${task.assessmentId}`}
                                className="text-xs text-primary hover:underline truncate inline-flex items-center gap-0.5"
                                data-testid={`link-task-assessment-${task.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {task.assessmentName}
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
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
                            <User className="w-3 h-3 text-orange-500 shrink-0" />
                            <span className="text-xs text-muted-foreground truncate" data-testid={`text-task-owner-${task.id}`}>
                              {task.ownerName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.dueDate && (
                        <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                          <Calendar className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      <Badge variant={priorityColors[task.priority] as any} className="text-xs">
                        {task.priority}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        data-testid={`button-comments-toggle-${task.id}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(task)}
                        data-testid={`button-edit-task-${task.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingTask(task)}
                        data-testid={`button-delete-task-${task.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t">
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                      )}
                      <TaskComments taskId={task.id} />
                    </div>
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
            <h3 className="font-semibold mb-1">No tasks found</h3>
            <p className="text-sm text-muted-foreground mb-4">Create tasks to track compliance activities</p>
            <Button onClick={() => setShowCreate(true)} data-testid="button-create-first-task">
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
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
