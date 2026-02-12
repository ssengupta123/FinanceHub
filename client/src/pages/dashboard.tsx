import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Project } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Plus, FileSpreadsheet, ArrowRight, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
              Your Projects
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload Excel files and transform them into interactive apps
            </p>
          </div>
          <Link href="/upload">
            <Button data-testid="button-new-project">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && (!projects || projects.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
                <FileSpreadsheet className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Upload an Excel file to create your first project. Each sheet becomes a screen you can customize with rules and views.
              </p>
              <Link href="/upload">
                <Button data-testid="button-create-first">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {projects && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/project/${project.id}`}>
      <Card className="hover-elevate active-elevate-2 cursor-pointer h-full" data-testid={`card-project-${project.id}`}>
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <FolderOpen className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate" data-testid={`text-project-name-${project.id}`}>
                {project.name}
              </CardTitle>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        </CardHeader>
        <CardContent className="pt-0">
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {project.description}
            </p>
          )}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              <LayoutGrid className="h-3 w-3 mr-1" />
              Sheets
            </Badge>
            <span className="text-xs text-muted-foreground">
              {project.createdAt ? format(new Date(project.createdAt), "MMM d, yyyy") : ""}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
