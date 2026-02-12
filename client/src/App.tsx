import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
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
import Onboarding from "@/pages/onboarding";
import DataSources from "@/pages/data-sources";

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
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/data-sources" component={DataSources} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex items-center justify-between gap-2 p-2 border-b sticky top-0 z-50 bg-background">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-hidden flex flex-col">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
