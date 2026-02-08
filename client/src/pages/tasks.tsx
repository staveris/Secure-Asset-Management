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
import { Plus, ListTodo, Clock, CheckCircle2, Circle, Eye, Calendar, Shield, ClipboardList } from "lucide-react";
import type { Task } from "@shared/schema";

type EnrichedTask = Task & {
  controlTitle?: string | null;
  requirementCode?: string | null;
  category?: string | null;
  assessmentName?: string | null;
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

export default function Tasks() {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [controlObjectiveId, setControlObjectiveId] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [activeTab, setActiveTab] = useState("all");
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

  const filteredTasks = tasks?.filter((t) => {
    if (activeTab === "all") return true;
    return t.status === activeTab;
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-task-filter">
          <TabsTrigger value="all">All ({tasks?.length || 0})</TabsTrigger>
          <TabsTrigger value="TODO">To Do ({tasks?.filter((t) => t.status === "TODO").length || 0})</TabsTrigger>
          <TabsTrigger value="IN_PROGRESS">In Progress ({tasks?.filter((t) => t.status === "IN_PROGRESS").length || 0})</TabsTrigger>
          <TabsTrigger value="IN_REVIEW">In Review ({tasks?.filter((t) => t.status === "IN_REVIEW").length || 0})</TabsTrigger>
          <TabsTrigger value="DONE">Done ({tasks?.filter((t) => t.status === "DONE").length || 0})</TabsTrigger>
        </TabsList>
      </Tabs>

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
                    <div className="flex-1 min-w-0">
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
                            <span className="text-xs text-muted-foreground truncate" data-testid={`text-task-control-${task.id}`}>
                              {task.requirementCode ? `${task.requirementCode} — ` : ""}{task.controlTitle}
                            </span>
                          </div>
                        )}
                        {task.assessmentName && (
                          <div className="flex items-center gap-1.5">
                            <ClipboardList className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="text-xs text-muted-foreground truncate" data-testid={`text-task-assessment-${task.id}`}>
                              {task.assessmentName}
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
    </div>
  );
}
