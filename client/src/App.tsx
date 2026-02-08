import { Switch, Route, Redirect } from "wouter";
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
import AdminEmailSettings from "@/pages/admin-email-settings";
import AdminStorage from "@/pages/admin-storage";
import Onboarding from "@/pages/onboarding";
import VerifyEmail from "@/pages/verify-email";
import VerificationPending from "@/pages/verification-pending";
import UsersPage from "@/pages/users";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";

function RestrictedPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6" data-testid="restricted-page">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center" data-testid="icon-restricted-lock">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold" data-testid="text-restricted-title">Access Restricted</h2>
          <p className="text-sm text-muted-foreground" data-testid="text-restricted-message">
            This feature is not yet available for your account. Your administrator needs to enable full platform access before you can use this section.
          </p>
          <p className="text-xs text-muted-foreground" data-testid="text-restricted-contact">
            Contact your tenant administrator to request access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function WithFullAccess({ component: Component }: { component: React.ComponentType }) {
  const { hasFullAccess } = useAuth();
  if (!hasFullAccess) return <RestrictedPage />;
  return <Component />;
}

function AdminRouter() {
  return (
    <Switch>
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/tenants" component={AdminTenants} />
      <Route path="/admin/storage" component={AdminStorage} />
      <Route path="/admin/requirements" component={AdminRequirements} />
      <Route path="/admin/audit-log" component={AdminAuditLog} />
      <Route path="/admin/email-settings" component={AdminEmailSettings} />
      <Route path="/settings" component={SettingsPage} />
      <Route><Redirect to="/admin" /></Route>
    </Switch>
  );
}

function TenantRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/assessments" component={Assessments} />
      <Route path="/assessments/:id">
        {(params) => <AssessmentDetail id={params.id} />}
      </Route>
      <Route path="/tasks">{() => <WithFullAccess component={Tasks} />}</Route>
      <Route path="/evidence">{() => <WithFullAccess component={Evidence} />}</Route>
      <Route path="/incidents">{() => <WithFullAccess component={Incidents} />}</Route>
      <Route path="/suppliers">{() => <WithFullAccess component={Suppliers} />}</Route>
      <Route path="/risks">{() => <WithFullAccess component={Risks} />}</Route>
      <Route path="/reports">{() => <WithFullAccess component={Reports} />}</Route>
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/users" component={UsersPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isLoading, isPlatformAdmin } = useAuth();

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

  if (window.location.pathname === "/verify-email") {
    return <VerifyEmail />;
  }

  if (!user) {
    return <AuthPage />;
  }

  if (!user.emailVerified && user.role !== "PLATFORM_ADMIN") {
    return <VerificationPending />;
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
            {isPlatformAdmin ? <AdminRouter /> : <TenantRouter />}
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
