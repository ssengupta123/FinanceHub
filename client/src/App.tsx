import type { CSSProperties } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import FinanceDashboard from "@/pages/finance";
import UtilizationDashboard from "@/pages/utilization";
import ProjectsList from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Resources from "@/pages/resources";
import RateCards from "@/pages/rate-cards";
import ResourcePlans from "@/pages/resource-plans";
import Timesheets from "@/pages/timesheets";
import Costs from "@/pages/costs";
import Milestones from "@/pages/milestones";
import Forecasts from "@/pages/forecasts";
import Pipeline from "@/pages/pipeline";
import WhatIfScenarios from "@/pages/scenarios";
import DataSources from "@/pages/data-sources";
import UploadPage from "@/pages/upload";
import AIInsights from "@/pages/ai-insights";
import LoginPage from "@/pages/login";
import AdminPage from "@/pages/admin";
import VatReportsPage from "@/pages/vat-reports";
import VatOverview from "@/pages/vat-overview";
import PartnerView from "@/pages/partner-view";
import FeatureRequests from "@/pages/feature-requests";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/finance" component={FinanceDashboard} />
      <Route path="/utilization" component={UtilizationDashboard} />
      <Route path="/projects" component={ProjectsList} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/resources" component={Resources} />
      <Route path="/rate-cards" component={RateCards} />
      <Route path="/resource-plans" component={ResourcePlans} />
      <Route path="/timesheets" component={Timesheets} />
      <Route path="/costs" component={Costs} />
      <Route path="/milestones" component={Milestones} />
      <Route path="/forecasts" component={Forecasts} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/scenarios" component={WhatIfScenarios} />
      <Route path="/data-sources" component={DataSources} />
      <Route path="/upload" component={UploadPage} />
      <Route path="/ai-insights" component={AIInsights} />
      <Route path="/vat-reports" component={VatReportsPage} />
      <Route path="/vat-overview" component={VatOverview} />
      <Route path="/partner-view" component={PartnerView} />
      <Route path="/feature-requests" component={FeatureRequests} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  executive: "Executive",
  vat_lead: "VAT Lead",
  operations: "Operations",
  employee: "Employee",
};

function AuthenticatedApp() {
  const { user, logoutMutation } = useAuth();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2 flex-wrap">
              {user && (
                <span className="text-sm text-muted-foreground" data-testid="text-current-user">
                  {user.displayName || user.username}
                  {user.role && ` (${ROLE_LABELS[user.role] || user.role})`}
                </span>
              )}
              <ThemeToggle />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => logoutMutation.mutate(undefined)}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto flex flex-col">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
