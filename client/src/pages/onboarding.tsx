import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, UserPlus, Users } from "lucide-react";
import type { Employee, OnboardingStep } from "@shared/schema";

export default function Onboarding() {
  const { toast } = useToast();
  const { data: employees, isLoading: loadingEmployees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });

  const onboardingEmployees = employees?.filter(e => e.onboardingStatus !== "completed" && e.status !== "inactive") || [];
  const completedCount = employees?.filter(e => e.onboardingStatus === "completed").length || 0;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-onboarding-title">Person Onboarding</h1>
        <p className="text-sm text-muted-foreground">Track onboarding progress for new team members</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingEmployees ? <Skeleton className="h-8 w-12" /> : (
              <div className="text-2xl font-bold" data-testid="text-onboarding-count">
                {onboardingEmployees.filter(e => e.onboardingStatus === "in_progress" || e.status === "onboarding").length}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Started</CardTitle>
            <Circle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingEmployees ? <Skeleton className="h-8 w-12" /> : (
              <div className="text-2xl font-bold">
                {onboardingEmployees.filter(e => e.onboardingStatus === "not_started").length}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingEmployees ? <Skeleton className="h-8 w-12" /> : (
              <div className="text-2xl font-bold">{completedCount}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {loadingEmployees ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)
        ) : onboardingEmployees.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No employees currently being onboarded</p>
            </CardContent>
          </Card>
        ) : (
          onboardingEmployees.map(emp => (
            <OnboardingCard key={emp.id} employee={emp} />
          ))
        )}
      </div>
    </div>
  );
}

function OnboardingCard({ employee }: { employee: Employee }) {
  const { toast } = useToast();
  const { data: steps, isLoading } = useQuery<OnboardingStep[]>({
    queryKey: ["/api/employees", employee.id, "onboarding"],
  });

  const completeMutation = useMutation({
    mutationFn: async (stepId: number) => {
      await apiRequest("PATCH", `/api/onboarding-steps/${stepId}`, {
        completed: true,
        completedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employee.id, "onboarding"] });
      toast({ title: "Step completed" });
    },
  });

  const completedSteps = steps?.filter(s => s.completed).length || 0;
  const totalSteps = steps?.length || 0;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <Card data-testid={`card-onboarding-${employee.id}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{employee.firstName} {employee.lastName}</CardTitle>
          <p className="text-sm text-muted-foreground">{employee.role} — {employee.location}</p>
        </div>
        <Badge variant={employee.onboardingStatus === "in_progress" ? "default" : "outline"}>
          {employee.onboardingStatus?.replace("_", " ")}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completedSteps} / {totalSteps} steps</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="space-y-2">
            {steps?.sort((a, b) => a.stepOrder - b.stepOrder).map(step => (
              <div
                key={step.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md"
                data-testid={`step-${step.id}`}
              >
                <div className="flex items-center gap-2">
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={`text-sm ${step.completed ? "line-through text-muted-foreground" : ""}`}>
                    {step.stepName}
                  </span>
                </div>
                {!step.completed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => completeMutation.mutate(step.id)}
                    disabled={completeMutation.isPending}
                    data-testid={`button-complete-step-${step.id}`}
                  >
                    Complete
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
