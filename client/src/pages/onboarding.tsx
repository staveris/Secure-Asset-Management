import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Building2,
  Shield,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [assessmentName, setAssessmentName] = useState("");
  const [assessmentScope, setAssessmentScope] = useState("");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const createAssessmentMutation = useMutation({
    mutationFn: async (data: { name: string; scope: string }) => {
      const res = await apiRequest("POST", "/api/assessments", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      toast({
        title: "Assessment Created",
        description: "Your first assessment has been created successfully.",
      });
      setStep(3);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateAssessment = () => {
    if (!assessmentName.trim() || !assessmentScope.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter both a name and scope for your assessment.",
        variant: "destructive",
      });
      return;
    }
    createAssessmentMutation.mutate({
      name: assessmentName,
      scope: assessmentScope,
    });
  };

  const steps = [
    { number: 1, label: "Welcome & Profile" },
    { number: 2, label: "Initial Assessment" },
    { number: 3, label: "Complete" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-start justify-center p-6 pt-12">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="text-onboarding-title">
                NIS2 Compliance Setup
              </h1>
            </div>
            <p className="text-muted-foreground" data-testid="text-onboarding-subtitle">
              Complete the setup wizard to get started with your compliance journey
            </p>
          </div>

          <div className="flex items-center justify-center gap-2" data-testid="step-indicator">
            {steps.map((s, i) => (
              <div key={s.number} className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-medium transition-colors ${
                    step > s.number
                      ? "bg-primary border-primary text-primary-foreground"
                      : step === s.number
                        ? "border-primary text-primary"
                        : "border-muted-foreground/30 text-muted-foreground/50"
                  }`}
                  data-testid={`step-indicator-${s.number}`}
                >
                  {step > s.number ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    s.number
                  )}
                </div>
                <span
                  className={`text-sm hidden sm:inline ${
                    step === s.number
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <Separator className="w-8 sm:w-12" orientation="horizontal" />
                )}
              </div>
            ))}
          </div>

          {step === 1 && (
            <Card data-testid="card-step-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Welcome, {user?.fullName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  Welcome to the NIS2 Compliance Platform. This wizard will help
                  you set up your organization and create your first compliance
                  assessment.
                </p>

                <div className="space-y-4">
                  <h3 className="font-semibold">NIS2 Directive Overview</h3>
                  <p className="text-sm text-muted-foreground">
                    The NIS2 Directive (Network and Information Security Directive 2)
                    is the EU-wide legislation on cybersecurity. It provides legal
                    measures to boost the overall level of cybersecurity across the
                    European Union by ensuring Member States preparedness and
                    cooperation requirements among all relevant authorities.
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Your Organization Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Organization</Label>
                      <p className="font-medium" data-testid="text-tenant-name">
                        {user?.tenantName || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Contact Email</Label>
                      <p className="font-medium" data-testid="text-user-email">
                        {user?.email}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Sector</Label>
                      <Badge variant="secondary" data-testid="badge-sector">
                        {(user as any)?.sector || "Not specified"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Entity Type</Label>
                      <Badge variant="secondary" data-testid="badge-entity-type">
                        {(user as any)?.entityType || "Not specified"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card data-testid="card-step-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Create Your First Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  Assessments help you evaluate your organization's compliance with
                  NIS2 requirements. Create your first assessment to get started.
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="assessment-name">Assessment Name</Label>
                    <Input
                      id="assessment-name"
                      placeholder="e.g., Initial NIS2 Compliance Assessment"
                      value={assessmentName}
                      onChange={(e) => setAssessmentName(e.target.value)}
                      data-testid="input-assessment-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assessment-scope">Assessment Scope</Label>
                    <Input
                      id="assessment-scope"
                      placeholder="e.g., Full organization cybersecurity compliance"
                      value={assessmentScope}
                      onChange={(e) => setAssessmentScope(e.target.value)}
                      data-testid="input-assessment-scope"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card data-testid="card-step-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Setup Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  Your organization has been set up and your first assessment has
                  been created. You are ready to begin your NIS2 compliance journey.
                </p>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-semibold">Next Steps</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      variant="outline"
                      className="justify-start gap-3"
                      onClick={() => setLocation("/")}
                      data-testid="link-dashboard"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Go to Dashboard
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-3"
                      onClick={() => setLocation("/assessments")}
                      data-testid="link-assessments"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      View Assessments
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-3"
                      onClick={() => setLocation("/reports")}
                      data-testid="link-reports"
                    >
                      <BarChart3 className="h-4 w-4" />
                      View Reports
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between gap-2">
            {step > 1 && step < 3 ? (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step === 1 && (
              <Button
                onClick={() => setStep(2)}
                data-testid="button-next"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {step === 2 && (
              <Button
                onClick={handleCreateAssessment}
                disabled={createAssessmentMutation.isPending}
                data-testid="button-create-assessment"
              >
                {createAssessmentMutation.isPending
                  ? "Creating..."
                  : "Create Assessment"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {step === 3 && (
              <Button
                onClick={() => setLocation("/")}
                data-testid="button-finish"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
