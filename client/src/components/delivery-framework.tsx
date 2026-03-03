import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, FileText, Search, PenTool, Hammer, TestTube, Rocket, HeartPulse, CheckCircle2 } from "lucide-react";

type Deliverable = {
  name: string;
  timing?: string;
  role?: string;
};

type Phase = {
  id: string;
  name: string;
  icon: typeof ClipboardList;
  color: string;
  deliverables: Deliverable[];
};

const PHASES: Phase[] = [
  {
    id: "initiation",
    name: "Initiation",
    icon: ClipboardList,
    color: "bg-blue-500",
    deliverables: [
      { name: "SOW", timing: "A week prior to project commencement", role: "PM" },
      { name: "Stakeholder matrix - project, client, mapping RG, sign off", timing: "A week prior to project commencement", role: "PM" },
      { name: "Deliverables list", role: "PM" },
      { name: "Assumptions" },
      { name: "Dependencies" },
      { name: "RAID log ready" },
      { name: "Kick off deck / mobilisation plan - ways of working, ceremonies, escalation, org chart" },
    ],
  },
  {
    id: "planning",
    name: "Planning",
    icon: FileText,
    color: "bg-indigo-500",
    deliverables: [
      { name: "Customer templates request" },
      { name: "Confirmed project plan" },
      { name: "Testing strategy" },
      { name: "Training strategy" },
      { name: "Deployment Strategy" },
      { name: "Development standards (per platform)" },
      { name: "Deployment plan", role: "PM" },
      { name: "Workshop schedule - prep - PPT and demos" },
      { name: "Are we doing waterfall or agile?" },
    ],
  },
  {
    id: "discovery",
    name: "Discovery",
    icon: Search,
    color: "bg-purple-500",
    deliverables: [
      { name: "Requirements + Demo (epic, feature, user story, acceptance criteria)" },
      { name: "MoSCoW" },
      { name: "Fit gap analysis (before MoSCoW)" },
      { name: "High level architecture document" },
      { name: "Data migration plan" },
      { name: "Optional - Integration design" },
      { name: "Change management plan (communication)", role: "CM" },
      { name: "Validate job plan with known scope" },
    ],
  },
  {
    id: "design",
    name: "Design",
    icon: PenTool,
    color: "bg-amber-500",
    deliverables: [
      { name: "Impact assessment - are we doing functional design or..." },
      { name: "Technical design (integrations, architecture)" },
      { name: "Optional - Integration design" },
      { name: "Traceability matrix" },
      { name: "Sprint planning" },
    ],
  },
  {
    id: "build",
    name: "Build",
    icon: Hammer,
    color: "bg-orange-500",
    deliverables: [
      { name: "As built" },
      { name: "Showcases" },
      { name: "Optional - process document" },
      { name: "Testing plan" },
      { name: "Unit and SIT cases - on us" },
      { name: "RG to build end to end scenarios (training)" },
      { name: "UAT kick off pack - supported by training" },
      { name: "Test evaluation report" },
      { name: "Optional - data migration" },
    ],
  },
  {
    id: "uat-planning",
    name: "UAT Planning",
    icon: TestTube,
    color: "bg-teal-500",
    deliverables: [
      { name: "UAT training" },
      { name: "UAT scenarios - on customer, RG to assist" },
      { name: "UAT use cases developed by customer" },
    ],
  },
  {
    id: "uat",
    name: "UAT",
    icon: CheckCircle2,
    color: "bg-cyan-500",
    deliverables: [
      { name: "Defect management" },
      { name: "UAT execution" },
    ],
  },
  {
    id: "deployment",
    name: "Deployment",
    icon: Rocket,
    color: "bg-green-500",
    deliverables: [
      { name: "Release management" },
      { name: "Release checklist" },
      { name: "TVT" },
      { name: "BVT" },
    ],
  },
  {
    id: "hypercare",
    name: "Hypercare",
    icon: HeartPulse,
    color: "bg-rose-500",
    deliverables: [
      { name: "Daily standups" },
      { name: "Defect / incident status meeting" },
    ],
  },
];

export default function DeliveryFramework() {
  const [selectedPhase, setSelectedPhase] = useState<string>(PHASES[0].id);
  const active = PHASES.find(p => p.id === selectedPhase) || PHASES[0];
  const ActiveIcon = active.icon;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Project Phases</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col">
            {PHASES.map((phase, idx) => {
              const Icon = phase.icon;
              const isActive = phase.id === selectedPhase;
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => setSelectedPhase(phase.id)}
                  className={`flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-4 ${isActive ? "bg-muted border-l-primary font-medium" : "border-l-transparent hover:bg-muted/50"}`}
                  data-testid={`button-phase-${phase.id}`}
                >
                  <div className={`p-1.5 rounded-md ${phase.color} text-white shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm">{phase.name}</span>
                    <Badge variant="secondary" className="text-[10px] h-5 shrink-0">{phase.deliverables.length}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{idx + 1}/{PHASES.length}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${active.color} text-white`}>
              <ActiveIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{active.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{active.deliverables.length} deliverables</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {active.deliverables.map((d, idx) => (
              <div
                key={`${active.id}-${idx}`}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                data-testid={`deliverable-${active.id}-${idx}`}
              >
                <span className="text-xs font-mono text-muted-foreground w-5 pt-0.5 shrink-0 text-right">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{d.name}</p>
                  {d.timing && (
                    <p className="text-xs text-muted-foreground mt-1">{d.timing}</p>
                  )}
                </div>
                {d.role && (
                  <Badge variant="outline" className="text-[10px] shrink-0">{d.role}</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
