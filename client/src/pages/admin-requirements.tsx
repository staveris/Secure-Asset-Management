import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen, ChevronRight } from "lucide-react";
import type { Requirement, ControlObjective } from "@shared/schema";

interface RequirementWithControls extends Requirement {
  controlObjectives: ControlObjective[];
}

export default function AdminRequirements() {
  const { data: requirements, isLoading } = useQuery<RequirementWithControls[]>({
    queryKey: ["/api/admin/requirements"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  const grouped = (requirements || []).reduce(
    (acc, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    },
    {} as Record<string, RequirementWithControls[]>,
  );

  return (
    <div className="p-6 space-y-6" data-testid="admin-requirements-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">NIS2 Requirement Library</h1>
        <p className="text-muted-foreground mt-1">Full coverage of NIS2 entity obligations</p>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Badge variant="outline">{requirements?.length || 0} requirements</Badge>
        <Badge variant="outline">{requirements?.reduce((sum, r) => sum + r.controlObjectives.length, 0) || 0} control objectives</Badge>
      </div>

      <Accordion type="multiple" defaultValue={Object.keys(grouped)} className="space-y-3">
        {Object.entries(grouped).map(([category, reqs]) => (
          <AccordionItem key={category} value={category} className="border rounded-md px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3 flex-1">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">{category}</span>
                <Badge variant="outline" className="text-xs">{reqs.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pb-2">
                {reqs.map((req) => (
                  <Card key={req.id} data-testid={`card-requirement-${req.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">{req.code}</Badge>
                        <Badge variant="secondary" className="text-xs">Art. {req.nis2Article}</Badge>
                        {req.greekRef && <Badge variant="outline" className="text-xs">{req.greekRef}</Badge>}
                      </div>
                      <h4 className="font-medium text-sm mb-1">{req.title}</h4>
                      <p className="text-xs text-muted-foreground mb-3">{req.description}</p>
                      {req.controlObjectives.length > 0 && (
                        <div className="space-y-1.5 pl-3 border-l-2 border-border">
                          {req.controlObjectives.map((co) => (
                            <div key={co.id} className="text-xs">
                              <p className="font-medium">{co.title}</p>
                              <p className="text-muted-foreground">{co.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
