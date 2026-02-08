import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Assessments from "@/pages/assessments";
import AssessmentDetail from "@/pages/assessment-detail";
import Tasks from "@/pages/tasks";
import Evidence from "@/pages/evidence";
import Incidents from "@/pages/incidents";
import Suppliers from "@/pages/suppliers";
import Risks from "@/pages/risks";
import Reports from "@/pages/reports";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminTenants from "@/pages/admin-tenants";
import AdminRequirements from "@/pages/admin-requirements";
import AdminAuditLog from "@/pages/admin-audit-log";
import Onboarding from "@/pages/onboarding";
import NotFound from "@/pages/not-found";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/assessments" component={Assessments} />
      <Route path="/assessments/:id">
        {(params) => <AssessmentDetail id={params.id} />}
      </Route>
      <Route path="/tasks" component={Tasks} />
      <Route path="/evidence" component={Evidence} />
      <Route path="/incidents" component={Incidents} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/risks" component={Risks} />
      <Route path="/reports" component={Reports} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/tenants" component={AdminTenants} />
      <Route path="/admin/requirements" component={AdminRequirements} />
      <Route path="/admin/audit-log" component={AdminAuditLog} />
      <Route path="/onboarding" component={Onboarding} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 text-center">
          <Skeleton className="h-10 w-10 rounded-md mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 p-2 border-b sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <AuthenticatedRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
