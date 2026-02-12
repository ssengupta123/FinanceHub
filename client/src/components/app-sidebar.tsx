import { Link, useLocation } from "wouter";
import { LayoutDashboard, FolderOpen, Plus, FileSpreadsheet } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export function AppSidebar() {
  const [location] = useLocation();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <FileSpreadsheet className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight" data-testid="text-app-name">SheetApp</h2>
              <p className="text-xs text-muted-foreground">Excel to App</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/"}>
                  <Link href="/" data-testid="link-dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/upload"}>
                  <Link href="/upload" data-testid="link-upload">
                    <Plus className="h-4 w-4" />
                    <span>New Project</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading && (
                <>
                  {[1, 2, 3].map((i) => (
                    <SidebarMenuItem key={i}>
                      <div className="px-2 py-1.5">
                        <Skeleton className="h-5 w-full" />
                      </div>
                    </SidebarMenuItem>
                  ))}
                </>
              )}
              {projects?.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === `/project/${project.id}`}
                  >
                    <Link href={`/project/${project.id}`} data-testid={`link-project-${project.id}`}>
                      <FolderOpen className="h-4 w-4" />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {!isLoading && (!projects || projects.length === 0) && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No projects yet
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <p className="text-xs text-muted-foreground text-center">
          Upload Excel files to get started
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
