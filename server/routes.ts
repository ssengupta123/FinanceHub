import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import XLSX from "xlsx";
import OpenAI from "openai";
import type { Project } from "@shared/schema";
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
  insertReferenceDataSchema,
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

  // ─── Reference Data (Admin) ───
  app.get("/api/reference-data", async (req, res) => {
    if (req.query.category) {
      const data = await storage.getReferenceDataByCategory(String(req.query.category));
      return res.json(data);
    }
    const data = await storage.getReferenceData();
    res.json(data);
  });
  app.post("/api/reference-data", async (req, res) => {
    const parsed = insertReferenceDataSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createReferenceData(parsed.data);
    res.json(data);
  });
  app.patch("/api/reference-data/:id", async (req, res) => {
    const data = await storage.updateReferenceData(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.delete("/api/reference-data/:id", async (req, res) => {
    await storage.deleteReferenceData(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Auth ───
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const bcrypt = await import("bcryptjs");
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = (user as any).role || "user";
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, email, displayName } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Username already exists" });
      }
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        displayName: displayName || null,
        role: "user",
      });
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = "user";
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
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

      const sheetOrder = ["Job Status", "Staff SOT"];
      const orderedSheets = [
        ...sheetOrder.filter(s => selectedSheets.includes(s)),
        ...selectedSheets.filter(s => !sheetOrder.includes(s)),
      ];

      for (const sheetName of orderedSheets) {
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
          } else if (sheetName === "CX Master List") {
            results[sheetName] = await importCxMasterList(ws);
          } else if (sheetName === "Project Resource Cost") {
            results[sheetName] = await importProjectResourceCost(ws);
          } else if (sheetName === "Project Resource Cost A&F") {
            results[sheetName] = await importProjectResourceCostAF(ws);
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
  let openai: OpenAI | null = null;
  try {
    if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
      openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
    }
  } catch (e) {
    console.log("OpenAI not configured - AI insights will be unavailable");
  }

  app.post("/api/ai/insights", async (req, res) => {
    try {
      const { type } = req.body;
      if (!openai) {
        return res.status(503).json({ message: "AI insights are not available. Configure OPENAI_API_KEY in environment variables." });
      }
      if (!type || !["pipeline", "projects", "overview"].includes(type)) {
        return res.status(400).json({ message: "Invalid type. Use: pipeline, projects, or overview" });
      }

      const projects = await storage.getProjects();
      const kpis = await storage.getKpis();
      const pipelineOpps = await storage.getPipelineOpportunities();
      const projectMonthly = await storage.getProjectMonthly();

      let systemPrompt = `You are a risk-focused financial analyst for an Australian project management firm. Your job is to identify SPECIFIC RISKS, RED FLAGS, and WARNING SIGNS in the data provided. Do NOT give generic advice or summaries.

Rules:
- Australian Financial Year (Jul-Jun, e.g. FY25-26)
- Pipeline classifications: C(100% Committed), S(80% Sold), DVF(50%), DF(30%), Q(15% Qualified), A(5% Awareness)
- Use markdown with clear risk severity labels: **CRITICAL**, **HIGH**, **MEDIUM**, **LOW**
- Name specific projects, opportunities, or numbers when flagging risks
- For each risk, state: what the risk is, why it matters, and what to do about it
- Be direct and blunt. The reader is a senior manager who needs to know what could go wrong.`;

      let userPrompt = "";

      if (type === "pipeline") {
        const classGroups: Record<string, number> = {};
        let totalWeighted = 0;
        const oppDetails: string[] = [];
        pipelineOpps.forEach(opp => {
          const cls = opp.classification || "Unknown";
          const monthRevs = [opp.revenueM1, opp.revenueM2, opp.revenueM3, opp.revenueM4, opp.revenueM5, opp.revenueM6,
            opp.revenueM7, opp.revenueM8, opp.revenueM9, opp.revenueM10, opp.revenueM11, opp.revenueM12];
          const total = monthRevs.reduce((s, v) => s + parseFloat(v || "0"), 0);
          classGroups[cls] = (classGroups[cls] || 0) + total;
          const winRate: Record<string, number> = { C: 1, S: 0.8, DVF: 0.5, DF: 0.3, Q: 0.15, A: 0.05 };
          totalWeighted += total * (winRate[cls] || 0);

          const zeroMonths = monthRevs.filter(v => parseFloat(v || "0") === 0).length;
          const h1 = monthRevs.slice(0, 6).reduce((s, v) => s + parseFloat(v || "0"), 0);
          const h2 = monthRevs.slice(6).reduce((s, v) => s + parseFloat(v || "0"), 0);
          oppDetails.push(`  - "${opp.name}" [${cls}] VAT:${opp.vat || "?"} Total:$${total.toLocaleString()} H1:$${h1.toLocaleString()} H2:$${h2.toLocaleString()} ZeroMonths:${zeroMonths}/12`);
        });

        const totalPipeline = Object.values(classGroups).reduce((s, v) => s + v, 0);
        const committedPct = totalPipeline > 0 ? ((classGroups["C"] || 0) / totalPipeline * 100).toFixed(1) : "0";
        const earlyPct = totalPipeline > 0 ? (((classGroups["Q"] || 0) + (classGroups["A"] || 0)) / totalPipeline * 100).toFixed(1) : "0";

        userPrompt = `Identify ALL risks in our sales pipeline. Be specific - name each opportunity that has problems.

Pipeline Data (${pipelineOpps.length} opportunities, Total: $${totalPipeline.toLocaleString()}, Weighted: $${totalWeighted.toLocaleString()}):
Classification breakdown:
${Object.entries(classGroups).map(([k, v]) => `- ${k}: $${v.toLocaleString()} (${totalPipeline > 0 ? (v / totalPipeline * 100).toFixed(1) : 0}%)`).join("\n")}

Committed (C) as % of total: ${committedPct}%
Early-stage (Q+A) as % of total: ${earlyPct}%
Active projects that could absorb pipeline: ${projects.filter(p => p.status === "active").length}

Individual Opportunities:
${oppDetails.join("\n")}

Identify risks including:
- Concentration risk: too much revenue dependent on few opportunities or one classification
- Conversion risk: opportunities stuck in early stages with large values
- Revenue gap risk: months with zero or very low revenue across opportunities
- Client/VAT concentration: over-reliance on specific VAT categories
- H1 vs H2 imbalance: is revenue front-loaded or back-loaded?
- Pipeline coverage ratio: is weighted pipeline sufficient vs target revenue?
- Stale opportunities: large deals in low-probability stages (Q/A)`;
      } else if (type === "projects") {
        const projectSummaries = projects.map(p => {
          const monthly = projectMonthly.filter(m => m.projectId === p.id);
          const totalRev = monthly.reduce((s, m) => s + parseFloat(m.revenue || "0"), 0);
          const totalCost = monthly.reduce((s, m) => s + parseFloat(m.cost || "0"), 0);
          const margin = totalRev > 0 ? ((totalRev - totalCost) / totalRev * 100).toFixed(1) : "0";
          const monthlyMargins = monthly.map(m => {
            const r = parseFloat(m.revenue || "0");
            const c = parseFloat(m.cost || "0");
            return r > 0 ? ((r - c) / r * 100).toFixed(0) : "N/A";
          });
          const costTrend = monthly.slice(-3).map(m => `$${parseFloat(m.cost || "0").toLocaleString()}`).join(" -> ");
          const wo = parseFloat(p.workOrderAmount || "0");
          const actual = parseFloat(p.actualAmount || "0");
          const balance = parseFloat(p.balanceAmount || "0");
          const burnPct = wo > 0 ? ((actual / wo) * 100).toFixed(0) : "N/A";
          return `  - "${p.name}" [${p.billingCategory || "?"}] VAT:${p.vat || "?"} Status:${p.status} AD:${p.adStatus || "?"}
    Revenue:$${totalRev.toLocaleString()} Cost:$${totalCost.toLocaleString()} Margin:${margin}%
    WorkOrder:$${wo.toLocaleString()} Actual:$${actual.toLocaleString()} Balance:$${balance.toLocaleString()} BurnRate:${burnPct}%
    MonthlyMargins:[${monthlyMargins.join(", ")}] RecentCostTrend:${costTrend}`;
        }).join("\n");

        userPrompt = `Identify ALL risks across our project portfolio. Name each project that has issues.

Project Data (${projects.length} total):
${projectSummaries}

Identify risks including:
- Margin erosion: projects where margin is below 20% or trending downward month-over-month
- Budget overrun: projects where actual spend exceeds work order amount or balance is negative
- Cost blowout: projects where costs are increasing month-over-month without matching revenue growth
- Fixed-price risk: Fixed projects with low margins (cost overruns can't be recovered)
- Stalled projects: projects with "pending" or unusual AD status
- Revenue concentration: too much revenue from one or two projects
- T&M leakage: T&M projects where billable rates may not cover costs
- Forecast vs actual gaps: projects where forecasted revenue differs significantly from actual trajectory`;
      } else {
        const totalRevenue = kpis.reduce((s, k) => s + parseFloat(k.revenue || "0"), 0);
        const totalCost = kpis.reduce((s, k) => s + parseFloat(k.grossCost || "0"), 0);
        const avgMargin = kpis.length > 0
          ? (kpis.reduce((s, k) => s + parseFloat(k.marginPercent || "0"), 0) / kpis.length).toFixed(1)
          : "0";
        const avgUtil = kpis.length > 0
          ? (kpis.reduce((s, k) => s + parseFloat(k.utilization || "0"), 0) / kpis.length).toFixed(1)
          : "0";

        const classGroups: Record<string, number> = {};
        pipelineOpps.forEach(opp => {
          const cls = opp.classification || "Unknown";
          const total = [opp.revenueM1, opp.revenueM2, opp.revenueM3, opp.revenueM4, opp.revenueM5, opp.revenueM6,
            opp.revenueM7, opp.revenueM8, opp.revenueM9, opp.revenueM10, opp.revenueM11, opp.revenueM12]
            .reduce((s, v) => s + parseFloat(v || "0"), 0);
          classGroups[cls] = (classGroups[cls] || 0) + total;
        });

        const projectRisks = projects.map(p => {
          const monthly = projectMonthly.filter(m => m.projectId === p.id);
          const totalRev = monthly.reduce((s, m) => s + parseFloat(m.revenue || "0"), 0);
          const totalCost = monthly.reduce((s, m) => s + parseFloat(m.cost || "0"), 0);
          const margin = totalRev > 0 ? ((totalRev - totalCost) / totalRev * 100).toFixed(1) : "0";
          const balance = parseFloat(p.balanceAmount || "0");
          return { name: p.name, margin: parseFloat(margin), balance, totalRev, status: p.status };
        });

        const lowMarginProjects = projectRisks.filter(p => p.margin < 20).map(p => `${p.name} (${p.margin}%)`);
        const negativeBalance = projectRisks.filter(p => p.balance < 0).map(p => `${p.name} ($${p.balance.toLocaleString()})`);
        const topRevProject = projectRisks.sort((a, b) => b.totalRev - a.totalRev)[0];
        const revConcentration = topRevProject && totalRevenue > 0 ? (topRevProject.totalRev / totalRevenue * 100).toFixed(1) : "0";

        userPrompt = `Identify the top risks facing this organization RIGHT NOW. Be specific and blunt.

Financial Position:
- Total Revenue: $${totalRevenue.toLocaleString()}
- Total Cost: $${totalCost.toLocaleString()}
- Gross Margin: ${totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100).toFixed(1) : 0}%
- Average Project Margin: ${avgMargin}%
- Average Utilization: ${avgUtil}%
- Active Projects: ${projects.filter(p => p.status === "active").length} / ${projects.length} total

Pipeline Coverage:
${Object.entries(classGroups).map(([k, v]) => `- ${k}: $${v.toLocaleString()}`).join("\n")}

Red Flag Data:
- Projects with margin below 20%: ${lowMarginProjects.length > 0 ? lowMarginProjects.join(", ") : "None"}
- Projects with negative balance: ${negativeBalance.length > 0 ? negativeBalance.join(", ") : "None"}
- Largest project is ${revConcentration}% of total revenue (${topRevProject?.name || "N/A"})
- Pipeline opportunities: ${pipelineOpps.length}

Produce a RISK REGISTER with:
1. Each risk rated CRITICAL / HIGH / MEDIUM / LOW
2. The specific data point that triggered the risk
3. What happens if we do nothing (impact)
4. Recommended immediate action
Focus on risks that could materially hurt revenue, margin, or cash flow in the next 6 months.`;
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

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[3]) continue;
    try {
      const projectName = String(r[3]).trim();
      if (!projectName || projectName.toLowerCase() === "project" || projectName.toLowerCase() === "project name" || projectName.toLowerCase() === "name") continue;
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

  const existingEmployees = await storage.getEmployees();
  const existingNames = new Set(existingEmployees.map(e => `${e.firstName} ${e.lastName}`.toLowerCase()));
  const existingCodes = new Set(existingEmployees.map(e => e.employeeCode));
  let codeCounter = Date.now() % 100000;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    try {
      const fullName = String(r[0]).trim();
      if (!fullName || fullName.toLowerCase() === "name") continue;
      const parts = fullName.split(" ");
      const firstName = parts[0] || fullName;
      const lastName = parts.slice(1).join(" ") || "";

      if (existingNames.has(fullName.toLowerCase())) {
        continue;
      }

      let empCode = `E${codeCounter++}`;
      while (existingCodes.has(empCode)) {
        empCode = `E${codeCounter++}`;
      }
      existingCodes.add(empCode);
      existingNames.add(fullName.toLowerCase());

      await storage.createEmployee({
        employeeCode: empCode,
        firstName,
        lastName,
        email: null,
        role: null,
        costBandLevel: r[1] ? String(r[1]).substring(0, 50) : null,
        staffType: r[2] ? String(r[2]).substring(0, 50) : null,
        grade: null,
        location: r[12] ? String(r[12]).substring(0, 100) : null,
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
        team: r[10] ? String(r[10]).substring(0, 100) : null,
        jid: r[7] ? String(r[7]).substring(0, 50) : null,
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
  const empCodes = new Set<string>();
  for (const e of allEmployees) {
    empMap.set(`${e.firstName} ${e.lastName}`.toLowerCase(), e.id);
    empCodes.add(e.employeeCode);
  }
  let empCounter = Date.now() % 100000;

  const allProjects = await storage.getProjects();
  const projMap = new Map<string, number>();
  const projCodes = new Set<string>();
  for (const p of allProjects) {
    projMap.set(p.name.toLowerCase(), p.id);
    if (p.projectCode) {
      projMap.set(p.projectCode.toLowerCase(), p.id);
      projCodes.add(p.projectCode);
    }
  }
  let projCounter = Date.now() % 100000;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    try {
      const firstName = r[10] ? String(r[10]).trim().substring(0, 100) : "";
      const lastName = r[11] ? String(r[11]).trim().substring(0, 100) : "";
      if (!firstName && !lastName) continue;
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      let employeeId = empMap.get(fullName);
      if (!employeeId) {
        let empCode = `E${empCounter++}`;
        while (empCodes.has(empCode)) empCode = `E${empCounter++}`;
        empCodes.add(empCode);
        const newEmp = await storage.createEmployee({
          employeeCode: empCode, firstName, lastName,
          email: null, role: r[12] ? String(r[12]).substring(0, 100) : "Staff",
          costBandLevel: null, staffType: null, grade: null, location: null,
          costCenter: null, securityClearance: null, payrollTax: false, payrollTaxRate: null,
          baseCost: "0", grossCost: "0", baseSalary: null,
          status: "active", startDate: null, endDate: null,
          scheduleStart: null, scheduleEnd: null, resourceGroup: null,
          team: null, jid: null, onboardingStatus: "completed",
        });
        employeeId = newEmp.id;
        empMap.set(fullName, employeeId);
      }

      const weekEnding = excelDateToString(r[0]);
      if (!weekEnding) continue;

      const projName = r[9] ? String(r[9]).trim().toLowerCase() : "";
      let projectId = projName ? projMap.get(projName) : null;
      if (!projectId && projName) {
        const origName = String(r[9]).trim();

        const isInternal = /^\d+$/.test(origName) || /^Reason\s/i.test(origName);
        const codeParts = isInternal ? null : origName.match(/^([A-Z]{2,6}\d{2,4}[-\s]?\d{0,3})\s+(.+)$/i);
        let pCode = codeParts ? codeParts[1].replace(/\s+/g, '') : `INT${projCounter++}`;
        while (projCodes.has(pCode)) pCode = `INT${projCounter++}`;
        projCodes.add(pCode);
        const newProj = await storage.createProject({
          projectCode: pCode, name: origName.substring(0, 200), client: codeParts ? codeParts[1].replace(/[\d\-]/g, '') : (isInternal ? "Internal" : "Unknown"),
          clientCode: null, clientManager: null, engagementManager: null, engagementSupport: null,
          contractType: "time_materials", billingCategory: null, workType: isInternal ? "Internal" : null, panel: null,
          recurring: null, vat: null, pipelineStatus: "C", adStatus: "Active", status: "active",
          startDate: null, endDate: null, workOrderAmount: "0", budgetAmount: "0", actualAmount: "0",
          balanceAmount: "0", forecastedRevenue: "0", forecastedGrossCost: "0", contractValue: "0",
          varianceAtCompletion: "0", variancePercent: "0", varianceToContractPercent: "0", writeOff: "0",
          opsCommentary: null, soldGmPercent: "0", toDateGrossProfit: "0", toDateGmPercent: "0",
          gpAtCompletion: "0", forecastGmPercent: "0", description: null,
        });
        projectId = newProj.id;
        projMap.set(projName, projectId);
      }
      if (!projectId) continue;

      await storage.createTimesheet({
        employeeId,
        projectId,
        weekEnding,
        hoursWorked: toNum(r[1]),
        saleValue: toNum(r[2]),
        costValue: toNum(r[3]),
        daysWorked: null,
        billable: String(r[16] || "").toLowerCase() !== "leave",
        activityType: r[16] ? String(r[16]).substring(0, 100) : null,
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

  const allProjects = await storage.getProjects();
  const projMap = new Map<string, Project>();
  const projCodes = new Set<string>();
  for (const p of allProjects) {
    projMap.set(p.name.toLowerCase(), p);
    if (p.projectCode) {
      projMap.set(p.projectCode.toLowerCase(), p);
      projCodes.add(p.projectCode);
    }
  }
  let projCounter = Date.now() % 100000;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[3]) continue;
    try {
      const projectDesc = String(r[3]).trim();
      const isInternal = /^\d+$/.test(projectDesc) || /^Reason\s/i.test(projectDesc);

      let match = projMap.get(projectDesc.toLowerCase());
      if (!match) {
        const codeParts = isInternal ? null : projectDesc.match(/^([A-Z]{2,6}\d{2,4}[-\s]?\d{0,3})\s+(.+)$/i);
        let pCode = codeParts ? codeParts[1].replace(/\s+/g, '') : `INT${projCounter++}`;
        while (projCodes.has(pCode)) pCode = `INT${projCounter++}`;
        projCodes.add(pCode);
        match = await storage.createProject({
          projectCode: pCode, name: projectDesc.substring(0, 200), client: codeParts ? codeParts[1].replace(/[\d\-]/g, '') : (isInternal ? "Internal" : "Unknown"),
          clientCode: null, clientManager: null, engagementManager: null, engagementSupport: null,
          contractType: "time_materials", billingCategory: null, workType: isInternal ? "Internal" : null, panel: null,
          recurring: null, vat: null, pipelineStatus: "C", adStatus: "Active", status: "active",
          startDate: null, endDate: null, workOrderAmount: "0", budgetAmount: "0", actualAmount: "0",
          balanceAmount: "0", forecastedRevenue: "0", forecastedGrossCost: "0", contractValue: "0",
          varianceAtCompletion: "0", variancePercent: "0", varianceToContractPercent: "0", writeOff: "0",
          opsCommentary: null, soldGmPercent: "0", toDateGrossProfit: "0", toDateGmPercent: "0",
          gpAtCompletion: "0", forecastGmPercent: "0", description: null,
        });
        projMap.set(projectDesc.toLowerCase(), match);
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

async function importCxMasterList(ws: XLSX.WorkSheet): Promise<{ imported: number; errors: string[] }> {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  let imported = 0;
  const errors: string[] = [];

  const allProjects = await storage.getProjects();
  const projByName = new Map<string, number>();
  const projByBaseCode = new Map<string, number>();
  for (const p of allProjects) {
    projByName.set(p.name.toLowerCase(), p.id);
    if (p.projectCode) projByName.set(p.projectCode.toLowerCase(), p.id);
    const baseMatch = p.name.match(/^([A-Z]{2,6}\d{2,4})/i);
    if (baseMatch) {
      const baseCode = baseMatch[1].toLowerCase();
      if (!projByBaseCode.has(baseCode)) projByBaseCode.set(baseCode, p.id);
    }
  }

  const allEmployees = await storage.getEmployees();
  const empMap = new Map<string, number>();
  for (const e of allEmployees) {
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase().trim();
    empMap.set(fullName, e.id);
    if (e.lastName) empMap.set(e.lastName.toLowerCase(), e.id);
  }

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    try {
      const engagementName = String(r[0]).trim();
      if (!engagementName || engagementName.toLowerCase() === "engagement name") continue;

      let projectId: number | null = null;
      const exactMatch = projByName.get(engagementName.toLowerCase());
      if (exactMatch) {
        projectId = exactMatch;
      }
      if (!projectId) {
        const codePart = engagementName.match(/^([A-Z]{2,6}\d{2,4})/i);
        if (codePart) {
          projectId = projByBaseCode.get(codePart[1].toLowerCase()) || null;
        }
      }
      if (!projectId) {
        const entries = Array.from(projByName.entries());
        for (const [key, id] of entries) {
          if (engagementName.toLowerCase().includes(key) || key.includes(engagementName.toLowerCase())) {
            projectId = id;
            break;
          }
        }
      }

      const resourceName = r[3] ? String(r[3]).trim() : null;
      let employeeId: number | null = null;
      if (resourceName) {
        employeeId = empMap.get(resourceName.toLowerCase()) || null;
      }

      const checkPointDate = excelDateToString(r[1]);
      const cxRating = r[2] !== null && r[2] !== undefined ? Number(r[2]) : null;

      await storage.createCxRating({
        projectId,
        employeeId,
        engagementName,
        checkPointDate,
        cxRating: isNaN(cxRating as number) ? null : cxRating,
        resourceName,
        isClientManager: String(r[4] || "").toUpperCase() === "Y",
        isDeliveryManager: String(r[5] || "").toUpperCase() === "Y",
        rationale: r[6] ? String(r[6]).trim() : null,
      });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }
  return { imported, errors };
}

async function importProjectResourceCost(ws: XLSX.WorkSheet): Promise<{ imported: number; errors: string[] }> {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  let imported = 0;
  const errors: string[] = [];

  const allEmployees = await storage.getEmployees();
  const empMap = new Map<string, number>();
  for (const e of allEmployees) {
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase().trim();
    empMap.set(fullName, e.id);
  }

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    const name = String(r[0]).trim();
    if (!name || name.toLowerCase() === "name") continue;
    try {
      const employeeId = empMap.get(name.toLowerCase()) || null;
      const staffType = r[1] ? String(r[1]).trim() : null;

      let total = 0;
      const monthlyCosts: string[] = [];
      for (let ci = 2; ci <= 13; ci++) {
        const v = Number(r[ci] || 0);
        monthlyCosts.push(isNaN(v) ? "0" : v.toFixed(2));
        total += isNaN(v) ? 0 : v;
      }

      await storage.createResourceCost({
        employeeId,
        employeeName: name,
        staffType,
        costPhase: "Total",
        fyYear: "FY23-24",
        costM1: monthlyCosts[0], costM2: monthlyCosts[1], costM3: monthlyCosts[2], costM4: monthlyCosts[3],
        costM5: monthlyCosts[4], costM6: monthlyCosts[5], costM7: monthlyCosts[6], costM8: monthlyCosts[7],
        costM9: monthlyCosts[8], costM10: monthlyCosts[9], costM11: monthlyCosts[10], costM12: monthlyCosts[11],
        totalCost: total.toFixed(2),
        source: "Project Resource Cost",
      });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }
  return { imported, errors };
}

async function importProjectResourceCostAF(ws: XLSX.WorkSheet): Promise<{ imported: number; errors: string[] }> {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  let imported = 0;
  const errors: string[] = [];

  const allEmployees = await storage.getEmployees();
  const empMap = new Map<string, number>();
  for (const e of allEmployees) {
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase().trim();
    empMap.set(fullName, e.id);
  }

  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    const name = String(r[0]).trim();
    if (!name || name.toLowerCase() === "name") continue;
    try {
      const employeeId = empMap.get(name.toLowerCase()) || null;
      const staffType = r[1] ? String(r[1]).trim() : null;

      let totalC = 0;
      const costC: string[] = [];
      for (let ci = 2; ci <= 13; ci++) {
        const v = Number(r[ci] || 0);
        costC.push(isNaN(v) ? "0" : v.toFixed(2));
        totalC += isNaN(v) ? 0 : v;
      }

      await storage.createResourceCost({
        employeeId,
        employeeName: name,
        staffType,
        costPhase: "Phase C",
        fyYear: "FY23-24",
        costM1: costC[0], costM2: costC[1], costM3: costC[2], costM4: costC[3],
        costM5: costC[4], costM6: costC[5], costM7: costC[6], costM8: costC[7],
        costM9: costC[8], costM10: costC[9], costM11: costC[10], costM12: costC[11],
        totalCost: totalC.toFixed(2),
        source: "Project Resource Cost A&F",
      });
      imported++;

      const dvfNameCol = 17;
      const dvfName = r[dvfNameCol] ? String(r[dvfNameCol]).trim() : null;
      if (dvfName && dvfName.toLowerCase() !== "name") {
        const dvfEmployeeId = empMap.get(dvfName.toLowerCase()) || null;
        const dvfStaffType = r[dvfNameCol + 1] ? String(r[dvfNameCol + 1]).trim() : null;
        let totalDVF = 0;
        const costDVF: string[] = [];
        for (let ci = 19; ci <= 30; ci++) {
          const v = Number(r[ci] || 0);
          costDVF.push(isNaN(v) ? "0" : v.toFixed(2));
          totalDVF += isNaN(v) ? 0 : v;
        }

        await storage.createResourceCost({
          employeeId: dvfEmployeeId,
          employeeName: dvfName,
          staffType: dvfStaffType,
          costPhase: "Phase DVF",
          fyYear: "FY23-24",
          costM1: costDVF[0], costM2: costDVF[1], costM3: costDVF[2], costM4: costDVF[3],
          costM5: costDVF[4], costM6: costDVF[5], costM7: costDVF[6], costM8: costDVF[7],
          costM9: costDVF[8], costM10: costDVF[9], costM11: costDVF[10], costM12: costDVF[11],
          totalCost: totalDVF.toFixed(2),
          source: "Project Resource Cost A&F",
        });
        imported++;
      }
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }
  return { imported, errors };
}
