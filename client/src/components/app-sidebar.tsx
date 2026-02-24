import { Link, useLocation } from "wouter";
import {
  DollarSign,
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  FolderOpen,
  Users,
  CreditCard,
  Calendar,
  Clock,
  Receipt,
  Target,
  LineChart,
  Database,
  FlaskConical,
  GitBranch,
  Upload,
  Sparkles,
  Shield,
  FileText,
  Handshake,
  Lightbulb,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/", resource: "dashboard" },
      { title: "Finance", icon: TrendingUp, path: "/finance", resource: "finance" },
      { title: "Utilisation", icon: BarChart3, path: "/utilization", resource: "utilization" },
      { title: "Partner View", icon: Handshake, path: "/partner-view", resource: "partner_view" },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Projects", icon: FolderOpen, path: "/projects", resource: "projects" },
      { title: "Resources", icon: Users, path: "/resources", resource: "resources" },
      { title: "Rate Cards", icon: CreditCard, path: "/rate-cards", resource: "rate_cards" },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Resource Plans", icon: Calendar, path: "/resource-plans", resource: "resource_plans" },
      { title: "Timesheets", icon: Clock, path: "/timesheets", resource: "timesheets" },
      { title: "Costs", icon: Receipt, path: "/costs", resource: "costs" },
      { title: "Milestones", icon: Target, path: "/milestones", resource: "milestones" },
    ],
  },
  {
    label: "Pipeline & Forecast",
    items: [
      { title: "Pipeline", icon: GitBranch, path: "/pipeline", resource: "pipeline" },
      { title: "What-If Scenarios", icon: FlaskConical, path: "/scenarios", resource: "scenarios" },
      { title: "Forecasts", icon: LineChart, path: "/forecasts", resource: "forecasts" },
      { title: "AI Insights", icon: Sparkles, path: "/ai-insights", resource: "ai_insights" },
      { title: "VAT Reports", icon: FileText, path: "/vat-reports", resource: "vat_reports" },
      { title: "VAT Overview", icon: Target, path: "/vat-overview", resource: "vat_overview" },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Data Sources", icon: Database, path: "/data-sources", resource: "data_sources" },
      { title: "Data Upload", icon: Upload, path: "/upload", resource: "upload" },
      { title: "Feature Requests", icon: Lightbulb, path: "/feature-requests", resource: "feature_requests" },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  executive: "Executive",
  vat_lead: "VAT Lead",
  operations: "Operations",
  employee: "Employee",
};

export function AppSidebar() {
  const [location] = useLocation();
  const { isAdmin, can, user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <DollarSign className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight" data-testid="text-app-name">FinanceHub</h2>
              <p className="text-xs text-muted-foreground">Project Finance Management</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(item => can(item.resource, "view"));
          if (visibleItems.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location === item.path}>
                        <Link href={item.path} data-testid={`link-${item.path.replace(/\//g, "").replace(/-/g, "-") || "dashboard"}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
        {(isAdmin || can("admin", "view")) && (
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/admin"}>
                    <Link href="/admin" data-testid="link-admin">
                      <Shield className="h-4 w-4" />
                      <span>Administration</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="text-center">
          {user && (
            <p className="text-xs text-muted-foreground" data-testid="text-user-role">
              {ROLE_LABELS[user.role] || user.role}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            v1.0 — Azure Ready
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
