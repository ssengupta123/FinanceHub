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
      { title: "Dashboard", icon: LayoutDashboard, path: "/" },
      { title: "Finance", icon: TrendingUp, path: "/finance" },
      { title: "Utilization", icon: BarChart3, path: "/utilization" },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Projects", icon: FolderOpen, path: "/projects" },
      { title: "Resources", icon: Users, path: "/resources" },
      { title: "Rate Cards", icon: CreditCard, path: "/rate-cards" },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Resource Plans", icon: Calendar, path: "/resource-plans" },
      { title: "Timesheets", icon: Clock, path: "/timesheets" },
      { title: "Costs", icon: Receipt, path: "/costs" },
    ],
  },
  {
    label: "Pipeline & Forecast",
    items: [
      { title: "Pipeline", icon: GitBranch, path: "/pipeline" },
      { title: "What-If Scenarios", icon: FlaskConical, path: "/scenarios" },
      { title: "Forecasts", icon: LineChart, path: "/forecasts" },
      { title: "AI Insights", icon: Sparkles, path: "/ai-insights" },
    ],
  },
  {
    label: "Tracking",
    items: [
      { title: "Milestones", icon: Target, path: "/milestones" },
      { title: "Data Sources", icon: Database, path: "/data-sources" },
      { title: "Data Upload", icon: Upload, path: "/upload" },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { isAdmin } = useAuth();

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
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
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
        ))}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/admin"}>
                    <Link href="/admin" data-testid="link-admin">
                      <Shield className="h-4 w-4" />
                      <span>Reference Data</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <p className="text-xs text-muted-foreground text-center">
          v1.0 — Azure Ready
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
