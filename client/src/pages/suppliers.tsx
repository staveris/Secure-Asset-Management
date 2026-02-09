import { useState } from "react";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck, Building, Pencil, Trash2 } from "lucide-react";
import type { Supplier } from "@shared/schema";

const criticalityColors: Record<string, string> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export default function Suppliers() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [criticality, setCriticality] = useState("medium");
  const [services, setServices] = useState("");
  const [notes, setNotes] = useState("");

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editName, setEditName] = useState("");
  const [editCriticality, setEditCriticality] = useState("medium");
  const [editServices, setEditServices] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  const { toast } = useToast();

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/suppliers", {
        name,
        criticality,
        services: services || null,
        notes: notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setShowCreate(false);
      setName("");
      setCriticality("medium");
      setServices("");
      setNotes("");
      toast({ title: "Supplier added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingSupplier) return;
      await apiRequest("PATCH", `/api/suppliers/${editingSupplier.id}`, {
        name: editName,
        criticality: editCriticality,
        services: editServices || null,
        notes: editNotes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setEditingSupplier(null);
      toast({ title: "Supplier updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingSupplier) return;
      await apiRequest("DELETE", `/api/suppliers/${deletingSupplier.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setDeletingSupplier(null);
      toast({ title: "Supplier deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openEdit = (supplier: Supplier) => {
    setEditName(supplier.name);
    setEditCriticality(supplier.criticality);
    setEditServices(supplier.services || "");
    setEditNotes(supplier.notes || "");
    setEditingSupplier(supplier);
  };

  return (
    <div className="p-6 space-y-6" data-testid="suppliers-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground mt-1">Supply chain risk management (Art. 21/22)</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-supplier">
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Supplier Name <span className="text-red-500">*</span></Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" data-testid="input-supplier-name" />
              </div>
              <div className="space-y-2">
                <Label>Criticality</Label>
                <Select value={criticality} onValueChange={setCriticality}>
                  <SelectTrigger data-testid="select-supplier-criticality"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Services Provided</Label>
                <Input value={services} onChange={(e) => setServices(e.target.value)} placeholder="e.g., Cloud hosting, SOC" data-testid="input-supplier-services" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes" data-testid="input-supplier-notes" />
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending} className="w-full" data-testid="button-submit-supplier">
                {createMutation.isPending ? "Adding..." : "Add Supplier"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-24" /></CardContent></Card>)}
        </div>
      ) : suppliers && suppliers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((supplier) => (
            <Card key={supplier.id} data-testid={`card-supplier-${supplier.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building className="w-4 h-4 text-muted-foreground shrink-0" />
                    <h3 className="font-semibold text-sm truncate">{supplier.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={criticalityColors[supplier.criticality] as any} className="text-xs">
                      {supplier.criticality}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(supplier)} data-testid={`button-edit-supplier-${supplier.id}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeletingSupplier(supplier)} data-testid={`button-delete-supplier-${supplier.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {supplier.services && <p className="text-xs text-muted-foreground mb-1">{supplier.services}</p>}
                {supplier.notes && <p className="text-xs text-muted-foreground italic">{supplier.notes}</p>}
                {supplier.lastAssessmentAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last assessed: {new Date(supplier.lastAssessmentAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Truck className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">No suppliers registered</h3>
            <p className="text-sm text-muted-foreground mb-4">Add suppliers to manage supply chain risks</p>
            <Button onClick={() => setShowCreate(true)} data-testid="button-create-first-supplier">
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingSupplier} onOpenChange={(open) => { if (!open) setEditingSupplier(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Supplier</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Supplier Name <span className="text-red-500">*</span></Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} data-testid="input-edit-supplier-name" />
            </div>
            <div className="space-y-2">
              <Label>Criticality</Label>
              <Select value={editCriticality} onValueChange={setEditCriticality}>
                <SelectTrigger data-testid="select-edit-supplier-criticality"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Services Provided</Label>
              <Input value={editServices} onChange={(e) => setEditServices(e.target.value)} data-testid="input-edit-supplier-services" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} data-testid="input-edit-supplier-notes" />
            </div>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={!editName || editMutation.isPending}
              className="w-full"
              data-testid="button-save-edit-supplier"
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingSupplier} onOpenChange={(open) => { if (!open) setDeletingSupplier(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingSupplier?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingSupplier(null)} data-testid="button-cancel-delete-supplier">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-supplier"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
