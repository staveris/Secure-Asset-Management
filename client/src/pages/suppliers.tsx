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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck, Building } from "lucide-react";
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
                <Label>Supplier Name</Label>
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
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">{supplier.name}</h3>
                  </div>
                  <Badge variant={criticalityColors[supplier.criticality] as any} className="text-xs shrink-0">
                    {supplier.criticality}
                  </Badge>
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
    </div>
  );
}
