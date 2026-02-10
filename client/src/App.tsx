import { Switch, Route, Redirect, useLocation } from "wouter";
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
import { IdleTimeoutWarning } from "@/components/idle-timeout";

import LandingPage from "@/pages/landing-page";
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
import AdminAtomicLibrary from "@/pages/admin-atomic-library";
import AdminAtomicImport from "@/pages/admin-atomic-import";
import AtomicAssessments from "@/pages/atomic-assessments";
import AtomicAssessmentDetail from "@/pages/atomic-assessment-detail";
import Onboarding from "@/pages/onboarding";
import VerifyEmail from "@/pages/verify-email";
import VerificationPending from "@/pages/verification-pending";
import UsersPage from "@/pages/users";
import SettingsPage from "@/pages/settings";
import ResetPassword from "@/pages/reset-password";
import NotFound from "@/pages/not-found";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Mail } from "lucide-react";
import { CookieConsent } from "@/components/cookie-consent";
import { DemoBanner } from "@/components/demo-banner";

function RestrictedPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6" data-testid="restricted-page">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center" data-testid="icon-restricted-lock">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold" data-testid="text-restricted-title">Feature Not Available in Demo</h2>
          <p className="text-sm text-muted-foreground" data-testid="text-restricted-message">
            This feature is not included in the demo version. To unlock the full NIS2 compliance platform with all modules, please contact us.
          </p>
          <div className="rounded-md bg-muted p-4 space-y-2 text-left">
            <p className="text-sm font-semibold" data-testid="text-restricted-company">Tools of Tech P.C.</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4 shrink-0" />
              <a href="mailto:info@toolsoftech.eu" className="underline" data-testid="link-restricted-email">info@toolsoftech.eu</a>
            </div>
          </div>
          <Button asChild data-testid="button-restricted-contact">
            <a href="mailto:info@toolsoftech.eu">Contact Us</a>
          </Button>
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
      <Route path="/"><Redirect to="/admin" /></Route>
      <Route path="/login"><Redirect to="/admin" /></Route>
      <Route path="/register"><Redirect to="/admin" /></Route>
      <Route path="/dashboard"><Redirect to="/admin" /></Route>
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/tenants" component={AdminTenants} />
      <Route path="/admin/storage" component={AdminStorage} />
      <Route path="/admin/requirements" component={AdminRequirements} />
      <Route path="/admin/audit-log" component={AdminAuditLog} />
      <Route path="/admin/atomic-library" component={AdminAtomicLibrary} />
      <Route path="/admin/atomic-import" component={AdminAtomicImport} />
      <Route path="/admin/email-settings" component={AdminEmailSettings} />
      <Route path="/settings" component={SettingsPage} />
      <Route><Redirect to="/admin" /></Route>
    </Switch>
  );
}

function TenantRouter() {
  return (
    <Switch>
      <Route path="/"><Redirect to="/dashboard" /></Route>
      <Route path="/login"><Redirect to="/dashboard" /></Route>
      <Route path="/register"><Redirect to="/dashboard" /></Route>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/assessments" component={Assessments} />
      <Route path="/assessments/:id">
        {(params) => <AssessmentDetail id={params.id} />}
      </Route>
      <Route path="/atomic-assessments" component={AtomicAssessments} />
      <Route path="/atomic-assessments/:id">
        {(params) => <AtomicAssessmentDetail id={params.id} />}
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
  const [location] = useLocation();

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

  if (location === "/verify-email") {
    return <VerifyEmail />;
  }

  if (location === "/reset-password") {
    return <ResetPassword />;
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={AuthPage} />
        <Route path="/register" component={AuthPage} />
        <Route component={LandingPage} />
      </Switch>
    );
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
          <DemoBanner />
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
            <IdleTimeoutWarning />
          </AuthProvider>
          <CookieConsent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
