import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db, isMSSQL } from "./db";
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

  app.get("/api/rate-cards/derived", async (_req, res) => {
    try {
      const result = await db.raw(`
        SELECT
          COALESCE(NULLIF(e.role, ''), 'Unassigned') as role,
          COALESCE(NULLIF(e.grade, ''), '') as grade,
          COALESCE(NULLIF(e.location, ''), '') as location,
          COALESCE(NULLIF(e.cost_band_level, ''), '') as cost_band,
          COUNT(DISTINCT e.id) as employee_count,
          ROUND(SUM(CAST(t.hours_worked AS NUMERIC)), 0) as total_hours,
          CASE WHEN SUM(CAST(t.hours_worked AS NUMERIC)) > 0
            THEN ROUND(SUM(CAST(t.cost_value AS NUMERIC)) / SUM(CAST(t.hours_worked AS NUMERIC)), 2)
            ELSE 0 END as avg_cost_rate,
          CASE WHEN SUM(CAST(t.hours_worked AS NUMERIC)) > 0
            THEN ROUND(SUM(CAST(t.sale_value AS NUMERIC)) / SUM(CAST(t.hours_worked AS NUMERIC)), 2)
            ELSE 0 END as avg_sell_rate,
          CASE WHEN SUM(CAST(t.sale_value AS NUMERIC)) > 0
            THEN ROUND((SUM(CAST(t.sale_value AS NUMERIC)) - SUM(CAST(t.cost_value AS NUMERIC))) / SUM(CAST(t.sale_value AS NUMERIC)) * 100, 1)
            ELSE 0 END as margin_pct
        FROM employees e
        JOIN timesheets t ON t.employee_id = e.id
        WHERE CAST(t.hours_worked AS NUMERIC) > 0
        GROUP BY e.role, e.grade, e.location, e.cost_band_level
        ORDER BY avg_sell_rate DESC
      `);
      const rows = result.rows || result;
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
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

  app.get("/api/costs/summary", async (req, res) => {
    try {
      const monthExpr = isMSSQL
        ? `FORMAT(timesheets.week_ending, 'yyyy-MM')`
        : `to_char(timesheets.week_ending, 'YYYY-MM')`;
      const rows = await db("timesheets")
        .select("timesheets.project_id")
        .select(db.raw(`${monthExpr} as month`))
        .select(db.raw(`COALESCE(projects.name, 'Unknown') as project_name`))
        .sum({ total_cost: db.raw("CAST(timesheets.cost_value AS numeric)") })
        .sum({ total_revenue: db.raw("CAST(timesheets.sale_value AS numeric)") })
        .sum({ total_hours: db.raw("CAST(timesheets.hours_worked AS numeric)") })
        .count({ entry_count: "*" })
        .leftJoin("projects", "timesheets.project_id", "projects.id")
        .groupBy("timesheets.project_id", db.raw(monthExpr), "projects.name")
        .orderBy([{ column: "month", order: "desc" }, { column: "total_cost", order: "desc" }]);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/resource-allocations", async (req, res) => {
    try {
      const monthExpr = isMSSQL
        ? `FORMAT(timesheets.week_ending, 'yyyy-MM')`
        : `to_char(timesheets.week_ending, 'YYYY-MM')`;
      const nameExpr = isMSSQL
        ? `COALESCE(employees.first_name + ' ' + employees.last_name, 'Unknown')`
        : `COALESCE(employees.first_name || ' ' || employees.last_name, 'Unknown')`;
      const rows = await db("timesheets")
        .select("timesheets.employee_id", "timesheets.project_id")
        .select(db.raw(`${monthExpr} as month`))
        .select(db.raw(`COALESCE(projects.name, 'Unknown') as project_name`))
        .select(db.raw(`${nameExpr} as employee_name`))
        .sum({ total_hours: db.raw("CAST(timesheets.hours_worked AS numeric)") })
        .sum({ total_cost: db.raw("CAST(timesheets.cost_value AS numeric)") })
        .sum({ total_revenue: db.raw("CAST(timesheets.sale_value AS numeric)") })
        .count({ entry_count: "*" })
        .leftJoin("projects", "timesheets.project_id", "projects.id")
        .leftJoin("employees", "timesheets.employee_id", "employees.id")
        .groupBy("timesheets.employee_id", "timesheets.project_id",
          db.raw(monthExpr),
          "projects.name", "employees.first_name", "employees.last_name")
        .orderBy([{ column: "month", order: "desc" }, { column: "total_hours", order: "desc" }]);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/utilization/weekly", async (req, res) => {
    try {
      const nameExpr = isMSSQL
        ? `COALESCE(employees.first_name + ' ' + employees.last_name, 'Unknown')`
        : `COALESCE(employees.first_name || ' ' || employees.last_name, 'Unknown')`;
      const billableExpr = isMSSQL
        ? `CASE WHEN timesheets.billable = 1 THEN CAST(timesheets.hours_worked AS numeric) ELSE 0 END`
        : `CASE WHEN timesheets.billable = true THEN CAST(timesheets.hours_worked AS numeric) ELSE 0 END`;
      const rows = await db("timesheets")
        .select("timesheets.employee_id")
        .select(db.raw(`timesheets.week_ending`))
        .select(db.raw(`${nameExpr} as employee_name`))
        .select(db.raw(`COALESCE(employees.role, '') as employee_role`))
        .sum({ total_hours: db.raw("CAST(timesheets.hours_worked AS numeric)") })
        .sum({ billable_hours: db.raw(billableExpr) })
        .sum({ cost_value: db.raw("CAST(timesheets.cost_value AS numeric)") })
        .sum({ sale_value: db.raw("CAST(timesheets.sale_value AS numeric)") })
        .leftJoin("employees", "timesheets.employee_id", "employees.id")
        .groupBy("timesheets.employee_id", "timesheets.week_ending",
          "employees.first_name", "employees.last_name", "employees.role")
        .orderBy([{ column: "week_ending", order: "desc" }, { column: "total_hours", order: "desc" }]);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
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

  app.post("/api/milestones/seed", async (req, res) => {
    if (!(req.session as any)?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const existing = await storage.getMilestones();
    if (existing.length > 0) {
      return res.json({ message: "Milestones already exist", count: existing.length });
    }
    const projects = await storage.getProjects();
    const projectLookup: Record<string, number> = {};
    projects.forEach(p => { projectLookup[p.name] = p.id; });

    function findProject(partial: string): number | null {
      for (const name of Object.keys(projectLookup)) {
        if (name.includes(partial)) return projectLookup[name];
      }
      return null;
    }

    const seedData: { projectPartial: string; milestones: { name: string; dueDate: string; status: string; amount: number; milestoneType: string; invoiceStatus: string | null }[] }[] = [
      {
        projectPartial: "AGD001 Case Management",
        milestones: [
          { name: "Phase 1 - Requirements & Design", dueDate: "2025-08-15", status: "completed", amount: 85000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Phase 1 Invoice - Design Deliverables", dueDate: "2025-08-31", status: "completed", amount: 85000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "Phase 2 - Development Sprint 1-3", dueDate: "2025-11-30", status: "completed", amount: 120000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Phase 2 Invoice - Development", dueDate: "2025-12-15", status: "completed", amount: 120000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "Phase 3 - UAT & Go-Live", dueDate: "2026-03-31", status: "pending", amount: 95000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Phase 3 Invoice - UAT & Go-Live", dueDate: "2026-04-15", status: "pending", amount: 95000, milestoneType: "payment", invoiceStatus: "draft" },
        ],
      },
      {
        projectPartial: "DAF079-02",
        milestones: [
          { name: "Q3 FY25 Delivery Report", dueDate: "2025-09-30", status: "completed", amount: 45000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Q3 FY25 Invoice", dueDate: "2025-10-15", status: "completed", amount: 45000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "Q4 FY25 Delivery Report", dueDate: "2025-12-31", status: "completed", amount: 45000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Q4 FY25 Invoice", dueDate: "2026-01-15", status: "completed", amount: 45000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "Q1 FY26 Delivery Report", dueDate: "2026-03-31", status: "pending", amount: 48000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Q1 FY26 Invoice", dueDate: "2026-04-15", status: "pending", amount: 48000, milestoneType: "payment", invoiceStatus: "draft" },
        ],
      },
      {
        projectPartial: "DAF079-03",
        milestones: [
          { name: "Strategic Roadmap Delivery", dueDate: "2025-10-31", status: "completed", amount: 65000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Strategic Roadmap Invoice", dueDate: "2025-11-15", status: "completed", amount: 65000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "Quarterly Advisory Report - Q1", dueDate: "2026-03-31", status: "pending", amount: 32000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Quarterly Advisory Invoice - Q1", dueDate: "2026-04-15", status: "pending", amount: 32000, milestoneType: "payment", invoiceStatus: "sent" },
        ],
      },
      {
        projectPartial: "FWO001 Digital Transformation",
        milestones: [
          { name: "Discovery Phase Completion", dueDate: "2025-09-30", status: "completed", amount: 55000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Discovery Phase Invoice", dueDate: "2025-10-15", status: "completed", amount: 55000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "CPBC Draft Submission", dueDate: "2026-01-31", status: "completed", amount: 78000, milestoneType: "delivery", invoiceStatus: null },
          { name: "CPBC Draft Invoice", dueDate: "2026-02-15", status: "pending", amount: 78000, milestoneType: "payment", invoiceStatus: "sent" },
          { name: "Final CPBC Delivery", dueDate: "2026-04-30", status: "pending", amount: 92000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Final CPBC Invoice", dueDate: "2026-05-15", status: "pending", amount: 92000, milestoneType: "payment", invoiceStatus: "draft" },
        ],
      },
      {
        projectPartial: "EUS001 AFP Roadmap",
        milestones: [
          { name: "Current State Assessment", dueDate: "2025-11-30", status: "completed", amount: 38000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Current State Invoice", dueDate: "2025-12-15", status: "completed", amount: 38000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "Target Architecture & Roadmap", dueDate: "2026-02-28", status: "overdue", amount: 52000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Target Architecture Invoice", dueDate: "2026-03-15", status: "pending", amount: 52000, milestoneType: "payment", invoiceStatus: "draft" },
        ],
      },
      {
        projectPartial: "IND005 ServiceNow",
        milestones: [
          { name: "Sprint 1-2 Deliverables", dueDate: "2025-10-31", status: "completed", amount: 42000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Sprint 1-2 Invoice", dueDate: "2025-11-15", status: "completed", amount: 42000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "Sprint 3-4 Deliverables", dueDate: "2026-01-31", status: "completed", amount: 42000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Sprint 3-4 Invoice", dueDate: "2026-02-15", status: "completed", amount: 42000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "Sprint 5-6 & UAT", dueDate: "2026-03-31", status: "pending", amount: 46000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Sprint 5-6 Invoice", dueDate: "2026-04-15", status: "pending", amount: 46000, milestoneType: "payment", invoiceStatus: "draft" },
          { name: "Go-Live & Hypercare", dueDate: "2026-05-31", status: "pending", amount: 35000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Go-Live Invoice", dueDate: "2026-06-15", status: "pending", amount: 35000, milestoneType: "payment", invoiceStatus: "draft" },
        ],
      },
      {
        projectPartial: "DCC001-05",
        milestones: [
          { name: "Monthly Delivery - Oct 2025", dueDate: "2025-10-31", status: "completed", amount: 22000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Invoice - Oct 2025", dueDate: "2025-11-15", status: "completed", amount: 22000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "Monthly Delivery - Nov 2025", dueDate: "2025-11-30", status: "completed", amount: 22000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Invoice - Nov 2025", dueDate: "2025-12-15", status: "completed", amount: 22000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "Monthly Delivery - Dec 2025", dueDate: "2025-12-31", status: "completed", amount: 22000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Invoice - Dec 2025", dueDate: "2026-01-15", status: "completed", amount: 22000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "Monthly Delivery - Jan 2026", dueDate: "2026-01-31", status: "completed", amount: 22000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Invoice - Jan 2026", dueDate: "2026-02-15", status: "completed", amount: 22000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "Monthly Delivery - Feb 2026", dueDate: "2026-02-28", status: "pending", amount: 22000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Invoice - Feb 2026", dueDate: "2026-03-15", status: "pending", amount: 22000, milestoneType: "payment", invoiceStatus: "draft" },
        ],
      },
      {
        projectPartial: "DHA002-01",
        milestones: [
          { name: "Module 1 - Claims Processing", dueDate: "2025-12-31", status: "completed", amount: 36000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Module 1 Invoice", dueDate: "2026-01-15", status: "completed", amount: 36000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "Module 2 - Workflow Automation", dueDate: "2026-03-31", status: "pending", amount: 38000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Module 2 Invoice", dueDate: "2026-04-15", status: "pending", amount: 38000, milestoneType: "payment", invoiceStatus: "draft" },
        ],
      },
      {
        projectPartial: "ISY010",
        milestones: [
          { name: "T3 Deliverable Pack", dueDate: "2026-02-28", status: "overdue", amount: 72000, milestoneType: "delivery", invoiceStatus: null },
          { name: "T3 Invoice", dueDate: "2026-03-15", status: "pending", amount: 72000, milestoneType: "payment", invoiceStatus: "draft" },
        ],
      },
      {
        projectPartial: "IND004 Portfolio",
        milestones: [
          { name: "Portfolio Framework Design", dueDate: "2025-11-30", status: "completed", amount: 28000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Framework Invoice", dueDate: "2025-12-15", status: "completed", amount: 28000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "Implementation & Training", dueDate: "2026-03-31", status: "pending", amount: 34000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Implementation Invoice", dueDate: "2026-04-15", status: "pending", amount: 34000, milestoneType: "payment", invoiceStatus: "sent" },
        ],
      },
      {
        projectPartial: "SAU045-03",
        milestones: [
          { name: "Architecture Review Phase 1", dueDate: "2025-12-31", status: "completed", amount: 44000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Phase 1 Invoice", dueDate: "2026-01-15", status: "completed", amount: 44000, milestoneType: "payment", invoiceStatus: "paid" },
          { name: "Architecture Review Phase 2", dueDate: "2026-03-31", status: "pending", amount: 44000, milestoneType: "delivery", invoiceStatus: null },
          { name: "Phase 2 Invoice", dueDate: "2026-04-15", status: "pending", amount: 44000, milestoneType: "payment", invoiceStatus: "sent" },
        ],
      },
    ];

    let created = 0;
    let skipped = 0;
    for (const group of seedData) {
      const projectId = findProject(group.projectPartial);
      if (!projectId) {
        skipped += group.milestones.length;
        continue;
      }
      for (const ms of group.milestones) {
        await storage.createMilestone({
          projectId,
          name: ms.name,
          dueDate: ms.dueDate,
          status: ms.status,
          amount: String(ms.amount),
          milestoneType: ms.milestoneType,
          invoiceStatus: ms.invoiceStatus,
        });
        created++;
      }
    }

    res.json({ message: "Milestones seeded", created, skipped });
  });

  // ─── Data Sources ───
  app.get("/api/data-sources", async (_req, res) => {
    let data = await storage.getDataSources();
    if (data.length === 0) {
      const defaultSources = [
        {
          name: "Open Opps (SharePoint)",
          type: "SharePoint API",
          connectionInfo: JSON.stringify({
            description: "SharePoint pipeline export — opportunities with value, margin, work type, RAG status, leads",
            endpoint: "https://{tenant}.sharepoint.com/sites/{site}/_api/web/lists/getbytitle('Open Opps')/items",
            authMethod: "Azure AD OAuth2 (Client Credentials)",
            requiredSecrets: ["AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "AZURE_TENANT_ID"],
            sheetName: "query",
            syncTarget: "pipeline_opportunities",
            frequency: "Hourly",
          }),
          status: "configured",
          recordsProcessed: 300,
          syncFrequency: "hourly",
        },
        {
          name: "iTimesheets",
          type: "REST API",
          connectionInfo: JSON.stringify({
            description: "Employee timesheet entries — hours worked per project, leave, and internal operations",
            endpoint: "https://api.itimesheets.com.au/v1/timesheets",
            authMethod: "API Key",
            requiredSecrets: ["ITIMESHEETS_API_KEY"],
            syncTarget: "timesheets",
            frequency: "Daily",
          }),
          status: "configured",
          recordsProcessed: 0,
          syncFrequency: "daily",
        },
        {
          name: "Employment Hero",
          type: "REST API",
          connectionInfo: JSON.stringify({
            description: "Employee records — staff details, cost bands, schedules, and contact information",
            endpoint: "https://api.employmenthero.com/api/v1/organisations/{org_id}/employees",
            authMethod: "OAuth2 Bearer Token",
            requiredSecrets: ["EMPLOYMENT_HERO_API_KEY"],
            syncTarget: "employees",
            frequency: "Daily",
          }),
          status: "configured",
          recordsProcessed: 0,
          syncFrequency: "daily",
        },
      ];
      for (const src of defaultSources) {
        await storage.createDataSource(src as any);
      }
      data = await storage.getDataSources();
    }
    res.json(data);
  });
  app.post("/api/data-sources", async (req, res) => {
    const parsed = insertDataSourceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createDataSource(parsed.data);
    res.json(data);
  });
  app.patch("/api/data-sources/:id", async (req, res) => {
    if (!(req.session as any)?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const data = await storage.updateDataSource(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });

  app.post("/api/data-sources/:id/sync", async (req, res) => {
    if (!(req.session as any)?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const id = Number(req.params.id);
    const ds = await storage.getDataSource(id);
    if (!ds) return res.status(404).json({ message: "Data source not found" });

    

    try {
      let result: { imported: number; errors: string[]; message: string };

      const connInfo = ds.connectionInfo ? JSON.parse(ds.connectionInfo) : {};
      const syncTarget = connInfo.syncTarget || "";

      if (syncTarget === "pipeline_opportunities" || ds.name?.includes("SharePoint") || ds.name?.includes("Open Opps")) {
        const { syncSharePointOpenOpps } = await import("./sharepoint-sync");
        result = await syncSharePointOpenOpps();
      } else {
        await storage.updateDataSource(id, { status: "configured" });
        return res.json({
          message: `Sync for "${ds.name}" is not yet implemented. Configure the API connection first.`,
          status: "configured",
        });
      }

      await storage.updateDataSource(id, {
        status: result.errors.length > 0 ? "error" : "active",
        recordsProcessed: result.imported,
        lastSyncAt: new Date().toISOString(),
      });

      res.json(result);
    } catch (err: any) {
      await storage.updateDataSource(id, {
        status: "error",
        lastSyncAt: new Date().toISOString(),
      });
      res.status(500).json({ message: err.message, status: "error" });
    }
  });

  app.post("/api/data-sources/seed", async (req, res) => {
    if (!(req.session as any)?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const existing = await storage.getDataSources();
    if (existing.length > 0) {
      return res.json({ message: "Data sources already exist", count: existing.length });
    }
    const sources = [
      {
        name: "Open Opps (SharePoint)",
        type: "SharePoint API",
        connectionInfo: JSON.stringify({
          description: "SharePoint pipeline export — opportunities with value, margin, work type, RAG status, leads",
          endpoint: "https://{tenant}.sharepoint.com/sites/{site}/_api/web/lists/getbytitle('Open Opps')/items",
          authMethod: "Azure AD OAuth2 (Client Credentials)",
          requiredSecrets: ["AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "AZURE_TENANT_ID"],
          sheetName: "query",
          syncTarget: "pipeline_opportunities",
          frequency: "Hourly",
        }),
        status: "configured",
        recordsProcessed: 300,
        syncFrequency: "hourly",
      },
      {
        name: "iTimesheets",
        type: "REST API",
        connectionInfo: JSON.stringify({
          description: "Employee timesheet entries — hours worked per project, leave, and internal operations",
          endpoint: "https://api.itimesheets.com.au/v1/timesheets",
          authMethod: "API Key",
          requiredSecrets: ["ITIMESHEETS_API_KEY"],
          syncTarget: "timesheets",
          frequency: "Daily",
        }),
        status: "configured",
        recordsProcessed: 0,
        syncFrequency: "daily",
      },
      {
        name: "Employment Hero",
        type: "REST API",
        connectionInfo: JSON.stringify({
          description: "Employee records — staff details, cost bands, schedules, and contact information",
          endpoint: "https://api.employmenthero.com/api/v1/organisations/{org_id}/employees",
          authMethod: "OAuth2 Bearer Token",
          requiredSecrets: ["EMPLOYMENT_HERO_API_KEY"],
          syncTarget: "employees",
          frequency: "Daily",
        }),
        status: "configured",
        recordsProcessed: 0,
        syncFrequency: "daily",
      },
    ];
    const created = [];
    for (const src of sources) {
      const ds = await storage.createDataSource(src as any);
      created.push(ds);
    }
    res.json({ message: "Data sources created", count: created.length, sources: created });
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
  app.get("/api/dashboard/utilization", async (req, res) => {
    const fy = req.query.fy as string | undefined;
    if (fy) {
      const parts = fy.split("-");
      if (parts.length === 2) {
        const fyStartYear = 2000 + parseInt(parts[0], 10);
        const fyStart = `${fyStartYear}-07-01`;
        const fyEnd = `${fyStartYear + 1}-07-01`;
        const result = await db.raw(`
          SELECT
            (SELECT COUNT(*) FROM employees WHERE staff_type = 'Permanent' AND status = 'active') as total_permanent,
            (SELECT COUNT(DISTINCT t.employee_id)
             FROM timesheets t
             JOIN employees e ON e.id = t.employee_id
             JOIN projects p ON p.id = t.project_id
             WHERE e.staff_type = 'Permanent' AND e.status = 'active'
             AND p.client != 'Internal'
             AND (p.status = 'active' OR p.ad_status = 'Active')
             AND t.week_ending >= ? AND t.week_ending < ?
            ) as allocated_permanent
        `, [fyStart, fyEnd]);
        const rows = result.rows || result;
        const row = rows[0];
        const total = parseInt(row?.total_permanent || "0");
        const allocated = parseInt(row?.allocated_permanent || "0");
        return res.json({
          totalPermanent: total,
          allocatedPermanent: allocated,
          utilization: total > 0 ? allocated / total : 0,
        });
      }
    }
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

  app.get("/api/financial-targets/:fy", async (req, res) => {
    const fy = req.params.fy;
    const allTargets = await storage.getReferenceDataByCategory("financial_target");
    const fyTargets = allTargets.filter(t => t.fyYear === fy && t.active !== false);
    const defaults: Record<string, string> = {
      revenue_target: "5000000",
      margin_target: "0.20",
      utilisation_target: "0.85",
    };
    const result: Record<string, number> = {};
    for (const [key, defaultVal] of Object.entries(defaults)) {
      const match = fyTargets.find(t => t.key === key);
      result[key] = parseFloat(match?.value ?? defaultVal);
    }
    res.json(result);
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

  // ─── Delete All Data ───
  app.delete("/api/data/all", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      if (req.session.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const deletionOrder = [
        "messages",
        "conversations",
        "onboarding_steps",
        "cx_ratings",
        "resource_costs",
        "scenario_adjustments",
        "scenarios",
        "kpis",
        "forecasts",
        "resource_plans",
        "milestones",
        "costs",
        "timesheets",
        "data_sources",
        "rate_cards",
        "pipeline_opportunities",
        "project_monthly",
        "projects",
        "employees",
        "reference_data",
      ];

      const counts: Record<string, number> = {};
      await db.transaction(async (trx) => {
        for (const table of deletionOrder) {
          const result = await trx(table).del();
          counts[table] = result;
        }
      });

      const totalDeleted = Object.values(counts).reduce((sum, c) => sum + c, 0);
      res.json({ message: `Deleted ${totalDeleted} records across ${deletionOrder.length} tables`, counts });
    } catch (err: any) {
      console.error("Delete all data error:", err);
      res.status(500).json({ message: err.message || "Failed to delete data" });
    }
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
          } else if (sheetName === "query" || sheetName.toLowerCase().startsWith("open op")) {
            results[sheetName] = await importOpenOpps(ws);
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
      if (!type || !["pipeline", "projects", "overview", "spending_patterns", "financial_advice", "spending_forecast"].includes(type)) {
        return res.status(400).json({ message: "Invalid type." });
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
      } else if (type === "spending_patterns" || type === "financial_advice" || type === "spending_forecast") {
        const employees = await storage.getEmployees();
        let resourceCosts: any[] = [];
        try { resourceCosts = await db("resource_costs").select("*"); } catch (e) { /* table may not exist */ }

        const activeProjects = projects.filter(p => p.status === "active" || (p as any).adStatus === "Active");
        const permEmployees = employees.filter(e => (e as any).staffType === "Permanent");

        const monthlySpend: Record<string, { revenue: number; cost: number; profit: number }> = {};
        projectMonthly.forEach(m => {
          const key = `${m.fyYear}-M${m.month}`;
          if (!monthlySpend[key]) monthlySpend[key] = { revenue: 0, cost: 0, profit: 0 };
          monthlySpend[key].revenue += parseFloat(m.revenue || "0");
          monthlySpend[key].cost += parseFloat(m.cost || "0");
          monthlySpend[key].profit += parseFloat(m.revenue || "0") - parseFloat(m.cost || "0");
        });

        const billingBreakdown: Record<string, { revenue: number; cost: number }> = {};
        projects.forEach(p => {
          const cat = (p as any).billingCategory || "Other";
          const pm = projectMonthly.filter(m => m.projectId === p.id);
          const rev = pm.reduce((s, m) => s + parseFloat(m.revenue || "0"), 0);
          const cost = pm.reduce((s, m) => s + parseFloat(m.cost || "0"), 0);
          if (!billingBreakdown[cat]) billingBreakdown[cat] = { revenue: 0, cost: 0 };
          billingBreakdown[cat].revenue += rev;
          billingBreakdown[cat].cost += cost;
        });

        const topCostProjects = projects.map(p => {
          const pm = projectMonthly.filter(m => m.projectId === p.id);
          const totalCost = pm.reduce((s, m) => s + parseFloat(m.cost || "0"), 0);
          const totalRev = pm.reduce((s, m) => s + parseFloat(m.revenue || "0"), 0);
          const monthCosts = pm.sort((a, b) => (a.month ?? 0) - (b.month ?? 0)).map(m => parseFloat(m.cost || "0"));
          return { name: p.name, code: (p as any).projectCode, billing: (p as any).billingCategory, totalCost, totalRev, margin: totalRev > 0 ? ((totalRev - totalCost) / totalRev * 100).toFixed(1) : "0", monthCosts };
        }).sort((a, b) => b.totalCost - a.totalCost).slice(0, 20);

        const staffCostSummary = resourceCosts.map((rc: any) => ({
          name: rc.employee_name,
          staffType: rc.staff_type,
          phase: rc.cost_phase,
          total: parseFloat(rc.total_cost || "0"),
        }));
        const totalStaffCost = staffCostSummary.reduce((s: number, r: any) => s + r.total, 0);
        const permCost = staffCostSummary.filter((r: any) => r.staffType === "Permanent").reduce((s: number, r: any) => s + r.total, 0);
        const contractorCost = staffCostSummary.filter((r: any) => r.staffType === "Contractor").reduce((s: number, r: any) => s + r.total, 0);

        const monthlySpendStr = Object.entries(monthlySpend)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `  ${k}: Rev $${v.revenue.toLocaleString()} | Cost $${v.cost.toLocaleString()} | Profit $${v.profit.toLocaleString()}`)
          .join("\n");

        const billingStr = Object.entries(billingBreakdown)
          .map(([k, v]) => `  ${k}: Rev $${v.revenue.toLocaleString()} | Cost $${v.cost.toLocaleString()} | Margin ${v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue * 100).toFixed(1) : 0}%`)
          .join("\n");

        const topProjectsStr = topCostProjects
          .map(p => `  "${p.name}" [${p.billing || "?"}]: Cost $${p.totalCost.toLocaleString()} Rev $${p.totalRev.toLocaleString()} Margin:${p.margin}% Trend:[${p.monthCosts.map(c => `$${c.toLocaleString()}`).join(",")}]`)
          .join("\n");

        const dataContext = `Organization Financial Data:
- Active Projects: ${activeProjects.length} / ${projects.length} total
- Permanent Employees: ${permEmployees.length} / ${employees.length} total
- Total Staff Cost (resource_costs): $${totalStaffCost.toLocaleString()} (Permanent: $${permCost.toLocaleString()}, Contractor: $${contractorCost.toLocaleString()})
- Pipeline Opportunities: ${pipelineOpps.length}

Monthly Spend Pattern (by FY-Month):
${monthlySpendStr}

Billing Category Breakdown:
${billingStr}

Top 20 Projects by Cost:
${topProjectsStr}`;

        if (type === "spending_patterns") {
          systemPrompt = `You are a senior financial analyst specializing in spending pattern analysis for an Australian professional services firm. Use Australian Financial Year (Jul-Jun). Provide data-driven analysis with specific numbers.`;
          userPrompt = `Analyze our spending patterns in detail. Identify trends, anomalies, and areas of concern.

${dataContext}

Provide analysis on:
1. **Monthly Spending Trends**: Are costs increasing, stable, or decreasing? Identify any spikes or dips and what might be driving them.
2. **Cost Concentration**: Which projects consume the most resources? Is there unhealthy concentration?
3. **Billing Type Economics**: How do Fixed vs T&M projects compare on cost efficiency and margins?
4. **Staff Cost Structure**: What's the permanent vs contractor cost mix? Is it optimal?
5. **Seasonal Patterns**: Are there predictable quarterly or monthly patterns in spend?
6. **Cost Anomalies**: Flag any unusual cost movements that warrant investigation.

Use specific project names and dollar amounts. Include month-over-month or quarter-over-quarter comparisons where relevant.`;
        } else if (type === "financial_advice") {
          systemPrompt = `You are a strategic financial advisor for an Australian professional services firm. Provide actionable, specific financial advice based on real data. Use Australian Financial Year (Jul-Jun). Be direct and practical — this is for senior leadership decision-making.`;
          userPrompt = `Based on our financial data, provide strategic financial advice and actionable recommendations.

${dataContext}

Provide advice across these areas:
1. **Margin Improvement**: Which projects or billing categories have the most margin improvement potential? What specific actions should we take?
2. **Cost Optimization**: Where can we reduce costs without impacting delivery? Are there projects where costs are out of proportion to revenue?
3. **Revenue Growth Opportunities**: Based on current project performance, where should we invest more? Which clients or work types are most profitable?
4. **Workforce Strategy**: Is our permanent/contractor mix optimal? Should we convert contractors to permanent or vice versa based on cost data?
5. **Cash Flow Management**: Based on spending patterns, are there cash flow risks we should plan for?
6. **Portfolio Rebalancing**: Should we shift focus between Fixed and T&M work based on margin performance?

For each recommendation, provide: the specific opportunity, estimated financial impact, and suggested timeline.`;
        } else {
          systemPrompt = `You are a financial forecasting expert for an Australian professional services firm. Use historical spending data to predict future trends. Use Australian Financial Year (Jul-Jun). Be specific with projections and clearly state your confidence level and assumptions.`;
          userPrompt = `Based on our historical spending data, predict future spending trends and financial trajectory.

${dataContext}

Provide forecasts and predictions on:
1. **Revenue Trajectory**: Based on monthly trends, project the next 3-6 months of revenue. Are we on track to meet targets?
2. **Cost Trajectory**: Where are costs heading? Project next quarter costs based on recent trends.
3. **Margin Forecast**: Will margins improve or deteriorate? Which factors will drive this?
4. **Resource Cost Projections**: Based on staff cost data, what's the expected cost base going forward?
5. **Project Completion Risk**: Based on burn rates and remaining budgets, which projects are at risk of cost overrun in the coming months?
6. **Pipeline Revenue Timing**: When will current pipeline opportunities likely convert to revenue? What's the expected revenue ramp?
7. **Seasonal Adjustments**: Account for any seasonal patterns (e.g., Q4 slowdown, new FY ramp-up) in your forecasts.

For each prediction, state your confidence level (High/Medium/Low) and the key assumptions. Include best-case and worst-case scenarios where appropriate.`;
        }
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
    if (!d || !d.y) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(val).trim();
  if (!s || s.toLowerCase() === "n/a" || s === "-" || s === "") return null;
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const yr = parsed.getFullYear();
    if (yr < 1900 || yr > 2100) return null;
    return `${yr}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const yr = parseInt(isoMatch[1]);
    if (yr < 1900 || yr > 2100) return null;
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }
  const auMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (auMatch) {
    const yr = auMatch[3].length === 2 ? 2000 + parseInt(auMatch[3]) : parseInt(auMatch[3]);
    if (yr < 1900 || yr > 2100) return null;
    return `${yr}-${auMatch[2].padStart(2, "0")}-${auMatch[1].padStart(2, "0")}`;
  }
  return null;
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

      const empData = {
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
      };
      await storage.createEmployee(empData);
      imported++;
    } catch (err: any) {
      console.error(`StaffSOT Row ${i + 3} raw:`, JSON.stringify(r.slice(0, 15)));
      console.error(`StaffSOT Row ${i + 3} scheduleStart raw=${r[8]} type=${typeof r[8]}, scheduleEnd raw=${r[9]} type=${typeof r[9]}`);
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

function excelDateToISOString(serial: any): string | null {
  if (!serial || serial === "") return null;
  const num = Number(serial);
  if (isNaN(num)) {
    if (typeof serial === "string" && serial.includes("-")) return serial;
    return null;
  }
  const utcDays = Math.floor(num - 25569);
  const date = new Date(utcDays * 86400000);
  return date.toISOString().split("T")[0];
}

async function importOpenOpps(ws: XLSX.WorkSheet): Promise<{ imported: number; errors: string[] }> {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
  let imported = 0;
  const errors: string[] = [];

  await db("pipeline_opportunities").where("fy_year", "open_opps").del();

  const phaseToClassification: Record<string, string> = {
    "1.A - Activity": "A",
    "2.Q - Qualified": "Q",
    "3.DF - Submitted": "DF",
    "4.DVF - Shortlisted": "DVF",
    "5.S - Selected": "S",
  };

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;

    const name = String(r[0]).trim();
    const phase = String(r[1] || "").trim();
    const itemType = String(r[21] || "").trim();

    if (itemType !== "Folder") continue;
    if (!phase || !phaseToClassification[phase]) continue;

    try {
      const classification = phaseToClassification[phase];
      const rawValue = r[3];
      const value = rawValue !== "" && rawValue != null && !isNaN(Number(rawValue)) ? String(Number(rawValue).toFixed(2)) : null;
      const rawMargin = r[4];
      const marginPercent = rawMargin !== "" && rawMargin != null && !isNaN(Number(rawMargin)) ? String(Number(rawMargin).toFixed(3)) : null;
      const workType = r[5] ? String(r[5]).trim() : null;
      const startDate = excelDateToISOString(r[6]);
      const expiryDate = excelDateToISOString(r[7]);

      let vat = r[8] ? String(r[8]).trim() : null;
      if (vat) {
        vat = vat.replace(/;#/g, "").replace(/\|.*$/, "").trim();
        if (vat.toLowerCase() === "growth") vat = "GROWTH";
      }

      const status = r[9] ? String(r[9]).trim() : null;
      const comment = r[10] ? String(r[10]).trim() : null;
      const casLead = r[11] ? String(r[11]).trim() : null;
      const csdLead = r[12] ? String(r[12]).replace(/;#\d+;#/g, "; ").replace(/;#/g, "; ").trim() : null;
      const category = r[13] ? String(r[13]).replace(/;#/g, ", ").trim() : null;
      const partner = r[14] ? String(r[14]).replace(/;#/g, ", ").trim() : null;
      const clientContact = r[15] ? String(r[15]).trim() : null;
      const clientCode = r[16] ? String(r[16]).trim() : null;
      const dueDate = excelDateToISOString(r[2]);

      await storage.createPipelineOpportunity({
        name,
        classification,
        vat,
        fyYear: "open_opps",
        value,
        marginPercent,
        workType,
        status,
        dueDate,
        startDate,
        expiryDate,
        comment,
        casLead,
        csdLead,
        category,
        partner,
        clientContact,
        clientCode,
      });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 1} (${name}): ${err.message}`);
    }
  }
  return { imported, errors };
}
