import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  RefreshCw,
  Clock,
  ArrowDownToLine,
  Loader2,
  ShieldAlert,
  Plus,
  Minus,
  Equal,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ValidationResult {
  valid: boolean;
  totalRecords: number;
  validRecords: number;
  errors: Array<{ index: number; id?: string; errors: string[] }>;
}

interface DiffPreview {
  added: number;
  updated: number;
  unchanged: number;
  toDeactivate: number;
  packHash: string;
  sourceKey: string;
  addedSample: Array<{ id: string; title: string }>;
  updatedSample: Array<{ id: string; title: string; changes: string[] }>;
  deactivateSample: Array<{ id: number; controlId: string; shortTitle: string }>;
}

interface ImportResult {
  success: boolean;
  mode: string;
  addedCount: number;
  updatedCount: number;
  unchangedCount: number;
  deactivatedCount: number;
  totalCount: number;
  packHash: string;
  errors?: string[];
}

interface ImportRunRecord {
  id: number;
  sourceKey: string;
  actorUserId: number;
  mode: string;
  status: string;
  addedCount: number;
  updatedCount: number;
  unchangedCount: number;
  deactivatedCount: number;
  totalCount: number;
  packHash: string | null;
  startedAt: string;
  finishedAt: string | null;
}

interface RepoFileResponse {
  controls: unknown[];
  legalSources: unknown[];
  filename: string;
}

type Step = "idle" | "loading" | "validated" | "previewing" | "previewed" | "importing" | "done";

export default function AdminAtomicImport() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("idle");
  const [controlsData, setControlsData] = useState<unknown[] | null>(null);
  const [legalSourcesData, setLegalSourcesData] = useState<unknown[] | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [validation, setValidation] = useState<{ controls: ValidationResult; legalSources: ValidationResult | null } | null>(null);
  const [diff, setDiff] = useState<DiffPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);

  const historyQuery = useQuery<ImportRunRecord[]>({
    queryKey: ["/api/admin/atomic-import/history"],
  });

  const loadRepoFile = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/admin/atomic-import/repo-file");
      return res.json() as Promise<RepoFileResponse>;
    },
    onSuccess: (data) => {
      setControlsData(data.controls);
      setLegalSourcesData(data.legalSources);
      setFilename(data.filename);
      setStep("idle");
      toast({ title: "File loaded", description: `${data.controls.length} controls from ${data.filename}` });
    },
    onError: (err: Error) => {
      toast({ title: "Error loading file", description: err.message, variant: "destructive" });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          setControlsData(data);
          setLegalSourcesData(null);
          setFilename(file.name);
          setStep("idle");
          toast({ title: "File loaded", description: `${data.length} controls from ${file.name}` });
        } else if (data.controls) {
          setControlsData(data.controls);
          setLegalSourcesData(data.legalSources || null);
          setFilename(file.name);
          setStep("idle");
          toast({ title: "File loaded", description: `${data.controls.length} controls from ${file.name}` });
        } else {
          toast({ title: "Invalid format", description: "Expected array of controls or { controls, legalSources }", variant: "destructive" });
        }
      } catch {
        toast({ title: "Parse error", description: "File is not valid JSON", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const validateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/atomic-import/validate", {
        controls: controlsData,
        legalSources: legalSourcesData,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setValidation(data);
      setStep("validated");
    },
    onError: (err: Error) => {
      toast({ title: "Validation failed", description: err.message, variant: "destructive" });
    },
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/atomic-import/preview", {
        controls: controlsData,
      });
      return res.json() as Promise<DiffPreview>;
    },
    onSuccess: (data) => {
      setDiff(data);
      setStep("previewed");
    },
    onError: (err: Error) => {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (mode: "IMPORT" | "SYNC") => {
      const res = await apiRequest("POST", "/api/admin/atomic-import/run", {
        controls: controlsData,
        legalSources: legalSourcesData,
        mode,
      });
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setImportResult(data);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/atomic-import/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/atomic-controls"] });
      if (data.success) {
        toast({ title: `${data.mode} completed`, description: `+${data.addedCount} ~${data.updatedCount} =${data.unchangedCount} -${data.deactivatedCount}` });
      } else {
        toast({ title: "Import had errors", description: data.errors?.join("; "), variant: "destructive" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  const isLoading = loadRepoFile.isPending || validateMutation.isPending || previewMutation.isPending || importMutation.isPending;

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Atomic Controls Import</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Import or sync NIS2 Option B atomic controls from JSON data files
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <span className="font-semibold text-sm">Load from Repository</span>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Load the built-in atomic_controls_nis2_optionB.json from the data directory
            </p>
            <Button
              onClick={() => loadRepoFile.mutate()}
              disabled={isLoading}
              data-testid="button-load-repo"
            >
              {loadRepoFile.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowDownToLine className="w-4 h-4 mr-2" />}
              Load Repo File
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <span className="font-semibold text-sm">Upload JSON File</span>
            <Upload className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Upload a custom JSON file containing atomic controls
            </p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
                data-testid="input-upload-file"
              />
              <Button asChild disabled={isLoading}>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </span>
              </Button>
            </label>
          </CardContent>
        </Card>
      </div>

      {controlsData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <span className="font-semibold text-sm">Loaded Data</span>
            <Badge variant="secondary">{filename}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <span><strong>{controlsData.length}</strong> controls loaded</span>
              {legalSourcesData && <span><strong>{legalSourcesData.length}</strong> legal sources</span>}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => { setStep("loading"); validateMutation.mutate(); }}
                disabled={isLoading}
                variant="outline"
                data-testid="button-validate"
              >
                {validateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Validate
              </Button>
              <Button
                onClick={() => { setStep("previewing"); previewMutation.mutate(); }}
                disabled={isLoading || (validation !== null && !validation.controls.valid)}
                variant="outline"
                data-testid="button-preview"
              >
                {previewMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Preview Diff
              </Button>
              <Button
                onClick={() => importMutation.mutate("IMPORT")}
                disabled={isLoading || !diff}
                data-testid="button-import"
              >
                {importMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Run Import (Merge)
              </Button>
              <Button
                onClick={() => setSyncConfirmOpen(true)}
                disabled={isLoading || !diff}
                variant="destructive"
                data-testid="button-sync"
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Run Sync (Authoritative)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {validation && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <span className="font-semibold text-sm">Validation Results</span>
            {validation.controls.valid ? (
              <Badge variant="default" className="bg-green-600">Valid</Badge>
            ) : (
              <Badge variant="destructive">Errors Found</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <span>{validation.controls.validRecords} / {validation.controls.totalRecords} valid</span>
              {validation.controls.errors.length > 0 && (
                <span className="text-destructive">{validation.controls.errors.length} errors</span>
              )}
            </div>
            {validation.controls.errors.length > 0 && (
              <div className="max-h-48 overflow-auto text-xs space-y-1 border rounded-md p-2">
                {validation.controls.errors.slice(0, 20).map((err, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <XCircle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                    <span>
                      <strong>#{err.index}{err.id ? ` (${err.id})` : ""}</strong>: {err.errors.join("; ")}
                    </span>
                  </div>
                ))}
                {validation.controls.errors.length > 20 && (
                  <p className="text-muted-foreground">...and {validation.controls.errors.length - 20} more errors</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {diff && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <span className="font-semibold text-sm">Diff Preview</span>
            <Badge variant="outline">{diff.sourceKey}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold" data-testid="text-diff-added">{diff.added}</p>
                  <p className="text-xs text-muted-foreground">Added</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold" data-testid="text-diff-updated">{diff.updated}</p>
                  <p className="text-xs text-muted-foreground">Updated</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                  <Equal className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold" data-testid="text-diff-unchanged">{diff.unchanged}</p>
                  <p className="text-xs text-muted-foreground">Unchanged</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-md bg-destructive/10 flex items-center justify-center">
                  <Minus className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold" data-testid="text-diff-deactivate">{diff.toDeactivate}</p>
                  <p className="text-xs text-muted-foreground">To Deactivate</p>
                </div>
              </div>
            </div>

            {diff.addedSample.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">New Controls (sample)</p>
                <div className="space-y-1">
                  {diff.addedSample.map((c) => (
                    <div key={c.id} className="text-xs flex items-center gap-2">
                      <Badge variant="outline" className="text-green-600 shrink-0">{c.id}</Badge>
                      <span className="truncate">{c.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diff.updatedSample.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Updated Controls (sample)</p>
                <div className="space-y-1">
                  {diff.updatedSample.map((c) => (
                    <div key={c.id} className="text-xs flex items-center gap-2">
                      <Badge variant="outline" className="text-blue-600 shrink-0">{c.id}</Badge>
                      <span className="truncate">{c.title}</span>
                      <span className="text-muted-foreground">({c.changes.join(", ")})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diff.deactivateSample.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">To Deactivate (sample)</p>
                <div className="space-y-1">
                  {diff.deactivateSample.map((c) => (
                    <div key={c.id} className="text-xs flex items-center gap-2">
                      <Badge variant="outline" className="text-destructive shrink-0">{c.controlId}</Badge>
                      <span className="truncate">{c.shortTitle}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {importResult && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <span className="font-semibold text-sm">Import Result</span>
            {importResult.success ? (
              <Badge variant="default" className="bg-green-600">Success</Badge>
            ) : (
              <Badge variant="destructive">Failed</Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Mode</p>
                <p className="font-semibold">{importResult.mode}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Added</p>
                <p className="font-semibold text-green-600" data-testid="text-result-added">{importResult.addedCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Updated</p>
                <p className="font-semibold text-blue-600" data-testid="text-result-updated">{importResult.updatedCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Unchanged</p>
                <p className="font-semibold" data-testid="text-result-unchanged">{importResult.unchangedCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Deactivated</p>
                <p className="font-semibold text-destructive" data-testid="text-result-deactivated">{importResult.deactivatedCount}</p>
              </div>
            </div>
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-3 text-xs text-destructive space-y-1">
                {importResult.errors.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <span className="font-semibold text-sm">Import History</span>
          <Clock className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !historyQuery.data || historyQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No import runs yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Unchanged</TableHead>
                    <TableHead>Deactivated</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyQuery.data.map((run) => (
                    <TableRow key={run.id} data-testid={`row-import-${run.id}`}>
                      <TableCell className="text-xs">
                        {new Date(run.startedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={run.mode === "SYNC" ? "destructive" : "outline"}>
                          {run.mode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={run.status === "COMPLETED" ? "default" : run.status === "FAILED" ? "destructive" : "secondary"}
                          className={run.status === "COMPLETED" ? "bg-green-600" : ""}
                        >
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-green-600">{run.addedCount}</TableCell>
                      <TableCell className="text-blue-600">{run.updatedCount}</TableCell>
                      <TableCell>{run.unchangedCount}</TableCell>
                      <TableCell className="text-destructive">{run.deactivatedCount}</TableCell>
                      <TableCell>{run.totalCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={syncConfirmOpen} onOpenChange={setSyncConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirm Authoritative Sync
            </DialogTitle>
            <DialogDescription>
              This will import all controls from the file AND deactivate any controls in the database
              that are NOT in the file (for the same source key). This action cannot be easily undone.
              {diff && diff.toDeactivate > 0 && (
                <span className="block mt-2 font-medium text-destructive">
                  {diff.toDeactivate} control(s) will be deactivated.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncConfirmOpen(false)} data-testid="button-sync-cancel">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setSyncConfirmOpen(false);
                importMutation.mutate("SYNC");
              }}
              data-testid="button-sync-confirm"
            >
              Confirm Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
