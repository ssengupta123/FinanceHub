import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, GitBranch, FolderOpen, AlertTriangle, Loader2 } from "lucide-react";

type InsightType = "pipeline" | "projects" | "overview";

const insightCards: { type: InsightType; title: string; description: string; icon: typeof Sparkles }[] = [
  {
    type: "overview",
    title: "Risk Register",
    description: "Critical risks across the business: margin erosion, revenue concentration, pipeline gaps, and cash flow threats",
    icon: AlertTriangle,
  },
  {
    type: "pipeline",
    title: "Pipeline Risks",
    description: "Concentration risk, conversion risk, revenue gaps, stale opportunities, and H1/H2 imbalance",
    icon: GitBranch,
  },
  {
    type: "projects",
    title: "Project Risks",
    description: "Budget overruns, margin erosion, cost blowouts, fixed-price exposure, and billing leakage by project",
    icon: FolderOpen,
  },
];

export default function AIInsights() {
  const [activeType, setActiveType] = useState<InsightType | null>(null);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsight = useCallback(async (type: InsightType) => {
    setActiveType(type);
    setContent("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to generate insights");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            if (data.error) throw new Error(data.error);
            if (data.content) {
              setContent(prev => prev + data.content);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-ai-insights-title">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Insights
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered analysis of your financial data and project portfolio
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insightCards.map((card) => {
          const Icon = card.icon;
          const isActive = activeType === card.type;
          const isCurrentlyLoading = isLoading && isActive;

          return (
            <Card
              key={card.type}
              className={`cursor-pointer transition-colors ${isActive ? "border-primary" : ""}`}
              data-testid={`card-insight-${card.type}`}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">{card.description}</p>
                <Button
                  size="sm"
                  onClick={() => generateInsight(card.type)}
                  disabled={isLoading}
                  data-testid={`button-generate-${card.type}`}
                >
                  {isCurrentlyLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Generate
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && (
        <Card className="border-destructive" data-testid="card-insight-error">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {(content || isLoading) && (
        <Card data-testid="card-insight-result">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {insightCards.find(c => c.type === activeType)?.title || "Analysis"}
            </CardTitle>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="text-insight-content">
              <ReactMarkdown>{content || "Generating analysis..."}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {!content && !isLoading && !error && (
        <Card data-testid="card-insight-empty">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-medium mb-1">Select an analysis type above</h3>
              <p className="text-xs text-muted-foreground">
                AI will analyze your live data and provide actionable insights
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
