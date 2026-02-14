import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import XLSX from "xlsx";
import OpenAI from "openai";
import {
  insertEmployeeSchema,
  insertProjectSchema,
  insertRateCardSchema,
  insertResourcePlanSchema,
  insertTimesheetSchema,
  insertCostSchema,
  insertKpiSchema,
  insertForecastSchema,
  insertMilestoneSchema,
  insertDataSourceSchema,
  insertOnboardingStepSchema,
  insertProjectMonthlySchema,
  insertPipelineOpportunitySchema,
  insertScenarioSchema,
  insertScenarioAdjustmentSchema,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ─── Employees ───
  app.get("/api/employees", async (_req, res) => {
    const data = await storage.getEmployees();
    res.json(data);
  });
  app.get("/api/employees/:id", async (req, res) => {
    const data = await storage.getEmployee(Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.post("/api/employees", async (req, res) => {
    const parsed = insertEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createEmployee(parsed.data);
    res.json(data);
  });
  app.patch("/api/employees/:id", async (req, res) => {
    const data = await storage.updateEmployee(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.delete("/api/employees/:id", async (req, res) => {
    await storage.deleteEmployee(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Projects ───
  app.get("/api/projects", async (_req, res) => {
    const data = await storage.getProjects();
    res.json(data);
  });
  app.get("/api/projects/:id", async (req, res) => {
    const data = await storage.getProject(Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.post("/api/projects", async (req, res) => {
    const parsed = insertProjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createProject(parsed.data);
    res.json(data);
  });
  app.patch("/api/projects/:id", async (req, res) => {
    const data = await storage.updateProject(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.delete("/api/projects/:id", async (req, res) => {
    await storage.deleteProject(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Rate Cards ───
  app.get("/api/rate-cards", async (_req, res) => {
    const data = await storage.getRateCards();
    res.json(data);
  });
  app.post("/api/rate-cards", async (req, res) => {
    const parsed = insertRateCardSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createRateCard(parsed.data);
    res.json(data);
  });
  app.patch("/api/rate-cards/:id", async (req, res) => {
    const data = await storage.updateRateCard(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.delete("/api/rate-cards/:id", async (req, res) => {
    await storage.deleteRateCard(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Resource Plans ───
  app.get("/api/resource-plans", async (req, res) => {
    if (req.query.projectId) {
      const data = await storage.getResourcePlansByProject(Number(req.query.projectId));
      return res.json(data);
    }
    if (req.query.employeeId) {
      const data = await storage.getResourcePlansByEmployee(Number(req.query.employeeId));
      return res.json(data);
    }
    const data = await storage.getResourcePlans();
    res.json(data);
  });
  app.post("/api/resource-plans", async (req, res) => {
    const parsed = insertResourcePlanSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createResourcePlan(parsed.data);
    res.json(data);
  });
  app.patch("/api/resource-plans/:id", async (req, res) => {
    const data = await storage.updateResourcePlan(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.delete("/api/resource-plans/:id", async (req, res) => {
    await storage.deleteResourcePlan(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Timesheets ───
  app.get("/api/timesheets", async (req, res) => {
    if (req.query.projectId) {
      const data = await storage.getTimesheetsByProject(Number(req.query.projectId));
      return res.json(data);
    }
    if (req.query.employeeId) {
      const data = await storage.getTimesheetsByEmployee(Number(req.query.employeeId));
      return res.json(data);
    }
    const data = await storage.getTimesheets();
    res.json(data);
  });
  app.post("/api/timesheets", async (req, res) => {
    const parsed = insertTimesheetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createTimesheet(parsed.data);
    res.json(data);
  });
  app.patch("/api/timesheets/:id", async (req, res) => {
    const data = await storage.updateTimesheet(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.delete("/api/timesheets/:id", async (req, res) => {
    await storage.deleteTimesheet(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Costs ───
  app.get("/api/costs", async (req, res) => {
    if (req.query.projectId) {
      const data = await storage.getCostsByProject(Number(req.query.projectId));
      return res.json(data);
    }
    const data = await storage.getCosts();
    res.json(data);
  });
  app.post("/api/costs", async (req, res) => {
    const parsed = insertCostSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createCost(parsed.data);
    res.json(data);
  });
  app.delete("/api/costs/:id", async (req, res) => {
    await storage.deleteCost(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── KPIs ───
  app.get("/api/kpis", async (req, res) => {
    if (req.query.projectId) {
      const data = await storage.getKpisByProject(Number(req.query.projectId));
      return res.json(data);
    }
    const data = await storage.getKpis();
    res.json(data);
  });
  app.post("/api/kpis", async (req, res) => {
    const parsed = insertKpiSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createKpi(parsed.data);
    res.json(data);
  });

  // ─── Forecasts ───
  app.get("/api/forecasts", async (req, res) => {
    if (req.query.projectId) {
      const data = await storage.getForecastsByProject(Number(req.query.projectId));
      return res.json(data);
    }
    const data = await storage.getForecasts();
    res.json(data);
  });
  app.post("/api/forecasts", async (req, res) => {
    const parsed = insertForecastSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createForecast(parsed.data);
    res.json(data);
  });

  // ─── Milestones ───
  app.get("/api/milestones", async (req, res) => {
    if (req.query.projectId) {
      const data = await storage.getMilestonesByProject(Number(req.query.projectId));
      return res.json(data);
    }
    const data = await storage.getMilestones();
    res.json(data);
  });
  app.post("/api/milestones", async (req, res) => {
    const parsed = insertMilestoneSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createMilestone(parsed.data);
    res.json(data);
  });
  app.patch("/api/milestones/:id", async (req, res) => {
    const data = await storage.updateMilestone(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.delete("/api/milestones/:id", async (req, res) => {
    await storage.deleteMilestone(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Data Sources ───
  app.get("/api/data-sources", async (_req, res) => {
    const data = await storage.getDataSources();
    res.json(data);
  });
  app.post("/api/data-sources", async (req, res) => {
    const parsed = insertDataSourceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createDataSource(parsed.data);
    res.json(data);
  });
  app.patch("/api/data-sources/:id", async (req, res) => {
    const data = await storage.updateDataSource(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });

  // ─── Onboarding Steps ───
  app.get("/api/employees/:id/onboarding", async (req, res) => {
    const data = await storage.getOnboardingStepsByEmployee(Number(req.params.id));
    res.json(data);
  });
  app.post("/api/employees/:id/onboarding", async (req, res) => {
    const parsed = insertOnboardingStepSchema.safeParse({ ...req.body, employeeId: Number(req.params.id) });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createOnboardingStep(parsed.data);
    res.json(data);
  });
  app.patch("/api/onboarding-steps/:id", async (req, res) => {
    const data = await storage.updateOnboardingStep(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });

  // ─── Dashboard Aggregates ───
  app.get("/api/dashboard/summary", async (_req, res) => {
    const data = await storage.getDashboardSummary();
    res.json(data);
  });
  app.get("/api/dashboard/finance", async (_req, res) => {
    const data = await storage.getFinanceDashboard();
    res.json(data);
  });
  app.get("/api/dashboard/utilization", async (_req, res) => {
    const data = await storage.getUtilizationSummary();
    res.json(data);
  });
  app.get("/api/projects/:id/summary", async (req, res) => {
    const data = await storage.getProjectSummary(Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });

  // ─── Project Monthly ───
  app.get("/api/project-monthly", async (req, res) => {
    if (req.query.projectId) {
      const data = await storage.getProjectMonthlyByProject(Number(req.query.projectId));
      return res.json(data);
    }
    const data = await storage.getProjectMonthly();
    res.json(data);
  });
  app.post("/api/project-monthly", async (req, res) => {
    const parsed = insertProjectMonthlySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createProjectMonthly(parsed.data);
    res.json(data);
  });

  // ─── Pipeline Opportunities ───
  app.get("/api/pipeline-opportunities", async (req, res) => {
    if (req.query.classification) {
      const data = await storage.getPipelineByClassification(String(req.query.classification));
      return res.json(data);
    }
    if (req.query.vat) {
      const data = await storage.getPipelineByVat(String(req.query.vat));
      return res.json(data);
    }
    const data = await storage.getPipelineOpportunities();
    res.json(data);
  });
  app.post("/api/pipeline-opportunities", async (req, res) => {
    const parsed = insertPipelineOpportunitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createPipelineOpportunity(parsed.data);
    res.json(data);
  });
  app.delete("/api/pipeline-opportunities/:id", async (req, res) => {
    await storage.deletePipelineOpportunity(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Scenarios ───
  app.get("/api/scenarios", async (_req, res) => {
    const data = await storage.getScenarios();
    res.json(data);
  });
  app.get("/api/scenarios/:id", async (req, res) => {
    const data = await storage.getScenarioWithAdjustments(Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.post("/api/scenarios", async (req, res) => {
    const parsed = insertScenarioSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createScenario(parsed.data);
    res.json(data);
  });
  app.delete("/api/scenarios/:id", async (req, res) => {
    await storage.deleteScenario(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Scenario Adjustments ───
  app.post("/api/scenarios/:id/adjustments", async (req, res) => {
    const parsed = insertScenarioAdjustmentSchema.safeParse({ ...req.body, scenarioId: Number(req.params.id) });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createScenarioAdjustment(parsed.data);
    res.json(data);
  });
  app.delete("/api/scenario-adjustments/:id", async (req, res) => {
    await storage.deleteScenarioAdjustment(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Excel Upload (KPI Raw Data File) ───
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

  app.post("/api/upload/preview", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheets = wb.SheetNames.map((name) => {
        const ws = wb.Sheets[name];
        const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
        const rows = range.e.r + 1;
        const cols = range.e.c + 1;
        const preview = XLSX.utils.sheet_to_json(ws, { header: 1, range: { s: { r: 0, c: 0 }, e: { r: Math.min(4, range.e.r), c: range.e.c } } }) as any[][];
        return { name, rows, cols, preview };
      });
      res.json({ fileName: req.file.originalname, sheets });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to parse file" });
    }
  });

  app.post("/api/upload/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const selectedSheets: string[] = JSON.parse(req.body.sheets || "[]");
      if (selectedSheets.length === 0) return res.status(400).json({ message: "No sheets selected" });

      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      const results: Record<string, { imported: number; errors: string[] }> = {};

      for (const sheetName of selectedSheets) {
        const ws = wb.Sheets[sheetName];
        if (!ws) {
          results[sheetName] = { imported: 0, errors: ["Sheet not found in file"] };
          continue;
        }

        try {
          if (sheetName === "Job Status") {
            results[sheetName] = await importJobStatus(ws);
          } else if (sheetName === "Staff SOT") {
            results[sheetName] = await importStaffSOT(ws);
          } else if (sheetName === "Resource Plan Opps" || sheetName === "Resource Plan Opps FY25-26") {
            results[sheetName] = await importPipelineRevenue(ws, sheetName === "Resource Plan Opps", sheetName);
          } else if (sheetName === "GrossProfit") {
            results[sheetName] = await importGrossProfit(ws);
          } else if (sheetName === "Personal Hours - inc non-projec") {
            results[sheetName] = await importPersonalHours(ws);
          } else if (sheetName === "Project Hours") {
            results[sheetName] = await importProjectHours(ws);
          } else {
            results[sheetName] = { imported: 0, errors: ["Import not supported for this sheet"] };
          }
        } catch (err: any) {
          results[sheetName] = { imported: 0, errors: [err.message || "Unknown import error"] };
        }
      }

      res.json({ results });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Import failed" });
    }
  });

  // ─── AI Insights ───
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  app.post("/api/ai/insights", async (req, res) => {
    try {
      const { type } = req.body;
      if (!type || !["pipeline", "projects", "overview"].includes(type)) {
        return res.status(400).json({ message: "Invalid type. Use: pipeline, projects, or overview" });
      }

      const projects = await storage.getProjects();
      const kpis = await storage.getKpis();
      const pipelineOpps = await storage.getPipelineOpportunities();
      const projectMonthly = await storage.getProjectMonthly();

      let systemPrompt = `You are an expert financial analyst for a project management firm in Australia. 
You analyze financial data and provide actionable insights. Use Australian Financial Year format (Jul-Jun, e.g. FY25-26).
Pipeline classifications: C(100% Committed), S(80% Sold), DVF(50%), DF(30%), Q(15% Qualified), A(5% Awareness).
Respond with structured analysis in markdown. Include specific numbers and percentages where possible.
Keep analysis concise but impactful - focus on actionable insights.`;

      let userPrompt = "";

      if (type === "pipeline") {
        const classGroups: Record<string, number> = {};
        let totalWeighted = 0;
        pipelineOpps.forEach(opp => {
          const cls = opp.classification || "Unknown";
          const total = [opp.m1Revenue, opp.m2Revenue, opp.m3Revenue, opp.m4Revenue, opp.m5Revenue, opp.m6Revenue,
            opp.m7Revenue, opp.m8Revenue, opp.m9Revenue, opp.m10Revenue, opp.m11Revenue, opp.m12Revenue]
            .reduce((s, v) => s + parseFloat(v || "0"), 0);
          classGroups[cls] = (classGroups[cls] || 0) + total;
          const winRate: Record<string, number> = { C: 1, S: 0.8, DVF: 0.5, DF: 0.3, Q: 0.15, A: 0.05 };
          totalWeighted += total * (winRate[cls] || 0);
        });

        userPrompt = `Analyze our sales pipeline health:

Pipeline Summary (${pipelineOpps.length} opportunities):
${Object.entries(classGroups).map(([k, v]) => `- ${k}: $${v.toLocaleString()}`).join("\n")}

Total Weighted Pipeline: $${totalWeighted.toLocaleString()}
Number of Active Projects: ${projects.filter(p => p.status === "active").length}
Total Projects: ${projects.length}

Key Questions:
1. Is our pipeline healthy? What's the conversion risk?
2. Are we too dependent on any single classification stage?
3. What actions should we take to strengthen the pipeline?
4. Any red flags in the pipeline distribution?`;
      } else if (type === "projects") {
        const projectSummaries = projects.slice(0, 15).map(p => {
          const monthly = projectMonthly.filter(m => m.projectId === p.id);
          const totalRev = monthly.reduce((s, m) => s + parseFloat(m.revenue || "0"), 0);
          const totalCost = monthly.reduce((s, m) => s + parseFloat(m.cost || "0"), 0);
          const margin = totalRev > 0 ? ((totalRev - totalCost) / totalRev * 100).toFixed(1) : "0";
          return `- ${p.name} (${p.billingCategory || "N/A"}): Revenue $${totalRev.toLocaleString()}, Cost $${totalCost.toLocaleString()}, Margin ${margin}%, Status: ${p.status}, AD: ${p.adStatus || "N/A"}`;
        }).join("\n");

        userPrompt = `Analyze project health and financial performance:

Active Projects (${projects.length} total):
${projectSummaries}

Key Questions:
1. Which projects are performing well and which need attention?
2. Are there any margin concerns or burn rate issues?
3. How does billing type (Fixed vs T&M) affect performance?
4. What recommendations do you have for project portfolio management?`;
      } else {
        const totalRevenue = kpis.reduce((s, k) => s + parseFloat(k.revenue || "0"), 0);
        const totalCost = kpis.reduce((s, k) => s + parseFloat(k.grossCost || "0"), 0);
        const avgMargin = kpis.length > 0
          ? (kpis.reduce((s, k) => s + parseFloat(k.marginPercent || "0"), 0) / kpis.length).toFixed(1)
          : "0";
        const avgUtil = kpis.length > 0
          ? (kpis.reduce((s, k) => s + parseFloat(k.utilization || "0"), 0) / kpis.length).toFixed(1)
          : "0";

        userPrompt = `Provide an executive overview of our financial position:

Overall KPIs:
- Total Revenue: $${totalRevenue.toLocaleString()}
- Total Cost: $${totalCost.toLocaleString()}
- Average Margin: ${avgMargin}%
- Average Utilization: ${avgUtil}%
- Active Projects: ${projects.filter(p => p.status === "active").length}
- Total Pipeline Opportunities: ${pipelineOpps.length}

Key Questions:
1. What is the overall financial health of the organization?
2. Are there trends we should be concerned about?
3. What are the top 3 strategic recommendations?
4. Risk assessment summary?`;
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        max_tokens: 2048,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("AI insights error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message || "AI analysis failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: error.message || "AI analysis failed" });
      }
    }
  });

  return httpServer;
}

function excelDateToString(val: any): string | null {
  if (!val) return null;
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  return String(val);
}

function toNum(val: any): string {
  if (val === null || val === undefined || val === "") return "0";
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(n) ? "0" : n.toFixed(2);
}

function toDecimal(val: any): string {
  if (val === null || val === undefined || val === "") return "0";
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(n) ? "0" : n.toFixed(4);
}

async function importJobStatus(ws: XLSX.WorkSheet): Promise<{ imported: number; errors: string[] }> {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, range: 1 }) as any[][];
  let imported = 0;
  const errors: string[] = [];

  const existingProjects = await storage.getProjects();
  const existingNames = new Set(existingProjects.map(p => p.name.toLowerCase()));
  let codeCounter = existingProjects.length + 1;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[3]) continue;
    try {
      const projectName = String(r[3]).trim();
      if (existingNames.has(projectName.toLowerCase())) {
        errors.push(`Row ${i + 2}: Skipped duplicate project "${projectName}"`);
        continue;
      }
      existingNames.add(projectName.toLowerCase());
      const clientCode = String(r[2] || "").trim();
      const projectCode = clientCode ? `${clientCode}-${String(codeCounter++).padStart(3, "0")}` : `IMP-${String(codeCounter++).padStart(3, "0")}`;
      const billingCat = String(r[9] || "").trim();

      const project = await storage.createProject({
        projectCode,
        name: projectName,
        client: clientCode,
        clientCode,
        clientManager: r[4] ? String(r[4]) : null,
        engagementManager: r[5] ? String(r[5]) : null,
        engagementSupport: r[6] ? String(r[6]) : null,
        contractType: billingCat === "Fixed" ? "fixed_price" : "time_materials",
        billingCategory: billingCat || null,
        workType: r[10] ? String(r[10]) : null,
        panel: r[11] ? String(r[11]) : null,
        recurring: r[12] ? String(r[12]) : null,
        vat: r[1] ? String(r[1]).trim() : null,
        pipelineStatus: "C",
        adStatus: r[0] ? String(r[0]).trim() : "Active",
        status: String(r[0] || "").toLowerCase().includes("closed") ? "completed" : "active",
        startDate: excelDateToString(r[7]),
        endDate: excelDateToString(r[8]),
        workOrderAmount: toNum(r[13]),
        budgetAmount: toNum(r[14]),
        actualAmount: toNum(r[15]),
        balanceAmount: toNum(r[16]),
        forecastedRevenue: toNum(r[18]),
        forecastedGrossCost: toNum(r[29]),
        contractValue: toNum(r[13]),
        varianceAtCompletion: toNum(r[19]),
        variancePercent: toDecimal(r[20]),
        varianceToContractPercent: toDecimal(r[21]),
        writeOff: toNum(r[22]),
        opsCommentary: r[23] ? String(r[23]) : null,
        soldGmPercent: toDecimal(r[31]),
        toDateGrossProfit: toNum(r[30]),
        toDateGmPercent: toDecimal(r[32]),
        gpAtCompletion: toNum(r[33]),
        forecastGmPercent: toDecimal(r[34]),
        description: null,
      });

      const monthCols = { revenue: [35,36,37,38,39,40,41,42,43,44,45,46], cost: [47,48,49,50,51,52,53,54,55,56,57,58], profit: [59,60,61,62,63,64,65,66,67,68,69,70] };
      const monthLabels = ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"];

      const startDateStr = excelDateToString(r[7]);
      let fyYear = "23-24";
      if (startDateStr) {
        const yr = parseInt(startDateStr.slice(0, 4));
        const mo = parseInt(startDateStr.slice(5, 7));
        const fyStart = mo >= 7 ? yr : yr - 1;
        fyYear = `${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;
      }

      for (let m = 0; m < 12; m++) {
        const rev = parseFloat(toNum(r[monthCols.revenue[m]]));
        const cost = parseFloat(toNum(r[monthCols.cost[m]]));
        const profit = parseFloat(toNum(r[monthCols.profit[m]]));
        if (rev !== 0 || cost !== 0 || profit !== 0) {
          await storage.createProjectMonthly({
            projectId: project.id,
            fyYear,
            month: m + 1,
            monthLabel: monthLabels[m],
            revenue: toNum(rev),
            cost: toNum(cost),
            profit: toNum(profit),
          });
        }
      }
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }
  return { imported, errors };
}

async function importStaffSOT(ws: XLSX.WorkSheet): Promise<{ imported: number; errors: string[] }> {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, range: 2 }) as any[][];
  let imported = 0;
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    try {
      const fullName = String(r[0]).trim();
      const parts = fullName.split(" ");
      const firstName = parts[0] || fullName;
      const lastName = parts.slice(1).join(" ") || "";
      const empCode = `EMP-${String(imported + 100).padStart(3, "0")}`;

      await storage.createEmployee({
        employeeCode: empCode,
        firstName,
        lastName,
        email: null,
        role: null,
        costBandLevel: r[1] ? String(r[1]) : null,
        staffType: r[2] ? String(r[2]) : null,
        grade: null,
        location: r[12] ? String(r[12]) : null,
        costCenter: null,
        securityClearance: null,
        payrollTax: String(r[3] || "").toLowerCase() === "yes",
        payrollTaxRate: null,
        baseCost: toNum(r[4]),
        grossCost: toNum(r[6]),
        baseSalary: null,
        status: String(r[5] || "active").toLowerCase() === "virtual bench" ? "bench" : "active",
        startDate: null,
        endDate: null,
        scheduleStart: excelDateToString(r[8]),
        scheduleEnd: excelDateToString(r[9]),
        resourceGroup: null,
        team: r[10] ? String(r[10]) : null,
        jid: r[7] ? String(r[7]) : null,
        onboardingStatus: "completed",
      });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 3}: ${err.message}`);
    }
  }
  return { imported, errors };
}

async function importPipelineRevenue(ws: XLSX.WorkSheet, hasVat: boolean, sheetName: string): Promise<{ imported: number; errors: string[] }> {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  let imported = 0;
  const errors: string[] = [];

  const fyMatch = sheetName.match(/FY(\d{2}-\d{2})/);
  const fyYear = fyMatch ? fyMatch[1] : "23-24";

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    try {
      const name = String(r[0]).trim();
      const classification = String(r[1] || "Q").trim();
      const monthStart = 2;
      const vatCol = hasVat ? 14 : -1;

      await storage.createPipelineOpportunity({
        name,
        classification,
        vat: vatCol >= 0 && r[vatCol] ? String(r[vatCol]).trim() : null,
        fyYear,
        revenueM1: toNum(r[monthStart]),
        revenueM2: toNum(r[monthStart + 1]),
        revenueM3: toNum(r[monthStart + 2]),
        revenueM4: toNum(r[monthStart + 3]),
        revenueM5: toNum(r[monthStart + 4]),
        revenueM6: toNum(r[monthStart + 5]),
        revenueM7: toNum(r[monthStart + 6]),
        revenueM8: toNum(r[monthStart + 7]),
        revenueM9: toNum(r[monthStart + 8]),
        revenueM10: toNum(r[monthStart + 9]),
        revenueM11: toNum(r[monthStart + 10]),
        revenueM12: toNum(r[monthStart + 11]),
        grossProfitM1: "0",
        grossProfitM2: "0",
        grossProfitM3: "0",
        grossProfitM4: "0",
        grossProfitM5: "0",
        grossProfitM6: "0",
        grossProfitM7: "0",
        grossProfitM8: "0",
        grossProfitM9: "0",
        grossProfitM10: "0",
        grossProfitM11: "0",
        grossProfitM12: "0",
      });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }
  return { imported, errors };
}

async function importGrossProfit(ws: XLSX.WorkSheet): Promise<{ imported: number; errors: string[] }> {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  let imported = 0;
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    try {
      const name = String(r[0]).trim();
      const classification = String(r[1] || "Q").trim();
      const vat = r[2] ? String(r[2]).trim() : null;

      await storage.createPipelineOpportunity({
        name: `${name} (GP)`,
        classification,
        vat,
        fyYear: "23-24",
        revenueM1: "0", revenueM2: "0", revenueM3: "0", revenueM4: "0",
        revenueM5: "0", revenueM6: "0", revenueM7: "0", revenueM8: "0",
        revenueM9: "0", revenueM10: "0", revenueM11: "0", revenueM12: "0",
        grossProfitM1: toNum(r[3]),
        grossProfitM2: toNum(r[4]),
        grossProfitM3: toNum(r[5]),
        grossProfitM4: toNum(r[6]),
        grossProfitM5: toNum(r[7]),
        grossProfitM6: toNum(r[8]),
        grossProfitM7: toNum(r[9]),
        grossProfitM8: toNum(r[10]),
        grossProfitM9: toNum(r[11]),
        grossProfitM10: toNum(r[12]),
        grossProfitM11: toNum(r[13]),
        grossProfitM12: toNum(r[14]),
      });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }
  return { imported, errors };
}

async function importPersonalHours(ws: XLSX.WorkSheet): Promise<{ imported: number; errors: string[] }> {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  let imported = 0;
  const errors: string[] = [];

  const allEmployees = await storage.getEmployees();
  const empMap = new Map<string, number>();
  for (const e of allEmployees) {
    empMap.set(`${e.firstName} ${e.lastName}`.toLowerCase(), e.id);
  }

  const allProjects = await storage.getProjects();
  const projMap = new Map<string, number>();
  for (const p of allProjects) {
    projMap.set(p.name.toLowerCase(), p.id);
    if (p.projectCode) projMap.set(p.projectCode.toLowerCase(), p.id);
  }

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    try {
      const firstName = r[10] ? String(r[10]).trim() : "";
      const lastName = r[11] ? String(r[11]).trim() : "";
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      const employeeId = empMap.get(fullName);
      if (!employeeId) {
        errors.push(`Row ${i + 1}: Employee "${firstName} ${lastName}" not found`);
        continue;
      }

      const weekEnding = excelDateToString(r[0]);
      if (!weekEnding) continue;

      const projName = r[4] ? String(r[4]).trim().toLowerCase() : "";
      const projectId = projName ? projMap.get(projName) : null;
      if (!projectId) {
        if (projName) errors.push(`Row ${i + 1}: Project "${r[4]}" not found`);
        continue;
      }

      await storage.createTimesheet({
        employeeId,
        projectId,
        weekEnding,
        hoursWorked: toNum(r[1]),
        saleValue: toNum(r[2]),
        costValue: toNum(r[3]),
        daysWorked: null,
        billable: String(r[16] || "").toLowerCase() !== "leave",
        activityType: r[16] ? String(r[16]) : null,
        source: "excel-import",
        status: "submitted",
        fyMonth: r[13] ? Number(r[13]) : null,
        fyYear: null,
      });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }
  return { imported, errors };
}

async function importProjectHours(ws: XLSX.WorkSheet): Promise<{ imported: number; errors: string[] }> {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  let imported = 0;
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[3]) continue;
    try {
      const projectDesc = String(r[3]).trim();
      const allProjects = await storage.getProjects();
      const match = allProjects.find(p => p.name === projectDesc || p.projectCode === projectDesc);
      if (!match) {
        errors.push(`Row ${i + 1}: Project "${projectDesc}" not found`);
        continue;
      }

      await storage.createKpi({
        projectId: match.id,
        month: new Date().toISOString().slice(0, 10),
        revenue: toNum(r[1]),
        contractRate: null,
        billedAmount: null,
        unbilledAmount: null,
        grossCost: toNum(r[2]),
        resourceCost: toNum(r[2]),
        rdCost: "0",
        margin: toNum(Number(r[1] || 0) - Number(r[2] || 0)),
        marginPercent: r[1] && Number(r[1]) > 0 ? toNum(((Number(r[1]) - Number(r[2] || 0)) / Number(r[1])) * 100) : "0",
        burnRate: toNum(r[2]),
        utilization: r[0] ? toNum((Number(r[0]) / 2080) * 100) : "0",
      });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }
  return { imported, errors };
}
