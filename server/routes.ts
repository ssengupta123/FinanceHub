import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "node:http";
import { storage } from "./storage";
import { db, isMSSQL } from "./db";

declare module "express-session" {
  interface SessionData {
    graphAccessToken?: string;
    graphTokenExpires?: number;
    msalAccountKey?: string;
  }
}
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
  insertVatReportSchema,
  insertVatRiskSchema,
  insertVatActionItemSchema,
  insertVatPlannerTaskSchema,
  insertVatTargetSchema,
  insertFeatureRequestSchema,
  VAT_NAMES,
  APP_ROLES,
} from "@shared/schema";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const role = req.session.role || "employee";
    if (role === "admin") return next();
    const perms = await storage.getPermissionsByRole(role);
    const allowed = perms.some(p => p.resource === resource && p.action === action && p.allowed);
    if (!allowed) {
      return res.status(403).json({ message: "You do not have permission to perform this action" });
    }
    next();
  };
}

function getOppMonthlyRevenues(opp: any): (string | null)[] {
  return [opp.revenueM1, opp.revenueM2, opp.revenueM3, opp.revenueM4, opp.revenueM5, opp.revenueM6,
    opp.revenueM7, opp.revenueM8, opp.revenueM9, opp.revenueM10, opp.revenueM11, opp.revenueM12];
}

function sumRevenues(monthRevs: (string | null)[]): number {
  return monthRevs.reduce((s: number, v) => s + Number.parseFloat(v || "0"), 0);
}

function buildPipelineInsightPrompt(pipelineOpps: any[], projects: any[]): string {
  const classGroups: Record<string, number> = {};
  let totalWeighted = 0;
  const oppDetails: string[] = [];
  const winRate: Record<string, number> = { C: 1, S: 0.8, DVF: 0.5, DF: 0.3, Q: 0.15, A: 0.05 };
  pipelineOpps.forEach(opp => {
    const cls = opp.classification || "Unknown";
    const monthRevs = getOppMonthlyRevenues(opp);
    const total = sumRevenues(monthRevs);
    classGroups[cls] = (classGroups[cls] || 0) + total;
    totalWeighted += total * (winRate[cls] || 0);
    const zeroMonths = monthRevs.filter(v => Number.parseFloat(v || "0") === 0).length;
    const h1 = sumRevenues(monthRevs.slice(0, 6));
    const h2 = sumRevenues(monthRevs.slice(6));
    oppDetails.push(`  - "${opp.name}" [${cls}] VAT:${opp.vat || "?"} Total:$${total.toLocaleString()} H1:$${h1.toLocaleString()} H2:$${h2.toLocaleString()} ZeroMonths:${zeroMonths}/12`);
  });
  const totalPipeline = Object.values(classGroups).reduce((s, v) => s + v, 0);
  const committedPct = totalPipeline > 0 ? ((classGroups["C"] || 0) / totalPipeline * 100).toFixed(1) : "0";
  const earlyPct = totalPipeline > 0 ? (((classGroups["Q"] || 0) + (classGroups["A"] || 0)) / totalPipeline * 100).toFixed(1) : "0";
  const classBreakdown = Object.entries(classGroups).map(([k, v]) => { const pct = totalPipeline > 0 ? (v / totalPipeline * 100).toFixed(1) : "0"; return `- ${k}: $${v.toLocaleString()} (${pct}%)`; }).join("\n");
  return `Identify ALL risks in our sales pipeline. Be specific - name each opportunity that has problems.

Pipeline Data (${pipelineOpps.length} opportunities, Total: $${totalPipeline.toLocaleString()}, Weighted: $${totalWeighted.toLocaleString()}):
Classification breakdown:
${classBreakdown}

Committed (C) as % of total: ${committedPct}%
Early-stage (Q+A) as % of total: ${earlyPct}%
Active projects that could absorb pipeline: ${projects.filter((p: any) => p.status === "active").length}

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
}

function buildProjectInsightPrompt(projects: any[], projectMonthly: any[]): string {
  const projectSummaries = projects.map((p: any) => {
    const monthly = projectMonthly.filter((m: any) => m.projectId === p.id);
    const totalRev = monthly.reduce((s: number, m: any) => s + Number.parseFloat(m.revenue || "0"), 0);
    const totalCost = monthly.reduce((s: number, m: any) => s + Number.parseFloat(m.cost || "0"), 0);
    const margin = totalRev > 0 ? ((totalRev - totalCost) / totalRev * 100).toFixed(1) : "0";
    const monthlyMargins = monthly.map((m: any) => {
      const r = Number.parseFloat(m.revenue || "0");
      const c = Number.parseFloat(m.cost || "0");
      return r > 0 ? ((r - c) / r * 100).toFixed(0) : "N/A";
    });
    const costTrend = monthly.slice(-3).map((m: any) => `$${Number.parseFloat(m.cost || "0").toLocaleString()}`).join(" -> ");
    const wo = Number.parseFloat(p.workOrderAmount || "0");
    const actual = Number.parseFloat(p.actualAmount || "0");
    const balance = Number.parseFloat(p.balanceAmount || "0");
    const burnPct = wo > 0 ? ((actual / wo) * 100).toFixed(0) : "N/A";
    return `  - "${p.name}" [${p.billingCategory || "?"}] VAT:${p.vat || "?"} Status:${p.status} AD:${p.adStatus || "?"}
    Revenue:$${totalRev.toLocaleString()} Cost:$${totalCost.toLocaleString()} Margin:${margin}%
    WorkOrder:$${wo.toLocaleString()} Actual:$${actual.toLocaleString()} Balance:$${balance.toLocaleString()} BurnRate:${burnPct}%
    MonthlyMargins:[${monthlyMargins.join(", ")}] RecentCostTrend:${costTrend}`;
  }).join("\n");
  return `Identify ALL risks across our project portfolio. Name each project that has issues.

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
}

function buildSpendingDataContext(projects: any[], projectMonthly: any[], pipelineOpps: any[], employees: any[], resourceCosts: any[]): string {
  const activeProjects = projects.filter((p: any) => p.status === "active" || p.adStatus === "Active");
  const permEmployees = employees.filter((e: any) => e.staffType === "Permanent");
  const monthlySpend: Record<string, { revenue: number; cost: number; profit: number }> = {};
  projectMonthly.forEach((m: any) => {
    const key = `${m.fyYear}-M${m.month}`;
    if (!monthlySpend[key]) monthlySpend[key] = { revenue: 0, cost: 0, profit: 0 };
    monthlySpend[key].revenue += Number.parseFloat(m.revenue || "0");
    monthlySpend[key].cost += Number.parseFloat(m.cost || "0");
    monthlySpend[key].profit += Number.parseFloat(m.revenue || "0") - Number.parseFloat(m.cost || "0");
  });
  const billingBreakdown: Record<string, { revenue: number; cost: number }> = {};
  projects.forEach((p: any) => {
    const cat = p.billingCategory || "Other";
    const pm = projectMonthly.filter((m: any) => m.projectId === p.id);
    const rev = pm.reduce((s: number, m: any) => s + Number.parseFloat(m.revenue || "0"), 0);
    const cost = pm.reduce((s: number, m: any) => s + Number.parseFloat(m.cost || "0"), 0);
    if (!billingBreakdown[cat]) billingBreakdown[cat] = { revenue: 0, cost: 0 };
    billingBreakdown[cat].revenue += rev;
    billingBreakdown[cat].cost += cost;
  });
  const topCostProjects = projects.map((p: any) => {
    const pm = projectMonthly.filter((m: any) => m.projectId === p.id);
    const totalCost = pm.reduce((s: number, m: any) => s + Number.parseFloat(m.cost || "0"), 0);
    const totalRev = pm.reduce((s: number, m: any) => s + Number.parseFloat(m.revenue || "0"), 0);
    const monthCosts = [...pm].sort((a: any, b: any) => (a.month ?? 0) - (b.month ?? 0)).map((m: any) => Number.parseFloat(m.cost || "0"));
    return { name: p.name, code: p.projectCode, billing: p.billingCategory, totalCost, totalRev, margin: totalRev > 0 ? ((totalRev - totalCost) / totalRev * 100).toFixed(1) : "0", monthCosts };
  }).sort((a, b) => b.totalCost - a.totalCost).slice(0, 20);
  const staffCostSummary = resourceCosts.map((rc: any) => ({
    name: rc.employee_name, staffType: rc.staff_type, phase: rc.cost_phase, total: Number.parseFloat(rc.total_cost || "0"),
  }));
  const totalStaffCost = staffCostSummary.reduce((s: number, r: any) => s + r.total, 0);
  const permCost = staffCostSummary.filter((r: any) => r.staffType === "Permanent").reduce((s: number, r: any) => s + r.total, 0);
  const contractorCost = staffCostSummary.filter((r: any) => r.staffType === "Contractor").reduce((s: number, r: any) => s + r.total, 0);
  const monthlySpendStr = Object.entries(monthlySpend).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${k}: Rev $${v.revenue.toLocaleString()} | Cost $${v.cost.toLocaleString()} | Profit $${v.profit.toLocaleString()}`).join("\n");
  const billingStr = Object.entries(billingBreakdown)
    .map(([k, v]) => { const marginPct = v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue * 100).toFixed(1) : "0"; return `  ${k}: Rev $${v.revenue.toLocaleString()} | Cost $${v.cost.toLocaleString()} | Margin ${marginPct}%`; }).join("\n");
  const topProjectsStr = topCostProjects.map(p => {
    const trendStr = p.monthCosts.map(c => `$${c.toLocaleString()}`).join(",");
    return `  "${p.name}" [${p.billing || "?"}]: Cost $${p.totalCost.toLocaleString()} Rev $${p.totalRev.toLocaleString()} Margin:${p.margin}% Trend:[${trendStr}]`;
  }).join("\n");
  return `Organization Financial Data:
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
}

function buildOverviewInsightPrompt(kpis: any[], projects: any[], pipelineOpps: any[], projectMonthly: any[]): string {
  const totalRevenue = kpis.reduce((s: number, k: any) => s + Number.parseFloat(k.revenue || "0"), 0);
  const totalCost = kpis.reduce((s: number, k: any) => s + Number.parseFloat(k.grossCost || "0"), 0);
  const avgMargin = kpis.length > 0
    ? (kpis.reduce((s: number, k: any) => s + Number.parseFloat(k.marginPercent || "0"), 0) / kpis.length).toFixed(1) : "0";
  const avgUtil = kpis.length > 0
    ? (kpis.reduce((s: number, k: any) => s + Number.parseFloat(k.utilization || "0"), 0) / kpis.length).toFixed(1) : "0";
  const classGroups: Record<string, number> = {};
  pipelineOpps.forEach((opp: any) => {
    const cls = opp.classification || "Unknown";
    const total = sumRevenues(getOppMonthlyRevenues(opp));
    classGroups[cls] = (classGroups[cls] || 0) + total;
  });
  const projectRisks = projects.map((p: any) => {
    const monthly = projectMonthly.filter((m: any) => m.projectId === p.id);
    const totalRev = monthly.reduce((s: number, m: any) => s + Number.parseFloat(m.revenue || "0"), 0);
    const totalProjectCost = monthly.reduce((s: number, m: any) => s + Number.parseFloat(m.cost || "0"), 0);
    const margin = totalRev > 0 ? ((totalRev - totalProjectCost) / totalRev * 100).toFixed(1) : "0";
    const balance = Number.parseFloat(p.balanceAmount || "0");
    return { name: p.name, margin: Number.parseFloat(margin), balance, totalRev, status: p.status };
  });
  const lowMarginProjects = projectRisks.filter(p => p.margin < 20).map(p => `${p.name} (${p.margin}%)`);
  const negativeBalance = projectRisks.filter(p => p.balance < 0).map(p => `${p.name} ($${p.balance.toLocaleString()})`);
  const topRevProject = [...projectRisks].sort((a, b) => b.totalRev - a.totalRev)[0];
  const revConcentration = topRevProject && totalRevenue > 0 ? (topRevProject.totalRev / totalRevenue * 100).toFixed(1) : "0";
  const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100).toFixed(1) : "0";
  return `Identify the top risks facing this organization RIGHT NOW. Be specific and blunt.

Financial Position:
- Total Revenue: $${totalRevenue.toLocaleString()}
- Total Cost: $${totalCost.toLocaleString()}
- Gross Margin: ${grossMargin}%
- Average Project Margin: ${avgMargin}%
- Average Utilization: ${avgUtil}%
- Active Projects: ${projects.filter((p: any) => p.status === "active").length} / ${projects.length} total

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

function getSpendingSystemPrompt(type: string): string {
  if (type === "spending_patterns") {
    return `You are a senior financial analyst specializing in spending pattern analysis for an Australian professional services firm. Use Australian Financial Year (Jul-Jun). Provide data-driven analysis with specific numbers.`;
  }
  if (type === "financial_advice") {
    return `You are a strategic financial advisor for an Australian professional services firm. Provide actionable, specific financial advice based on real data. Use Australian Financial Year (Jul-Jun). Be direct and practical — this is for senior leadership decision-making.`;
  }
  return `You are a financial forecasting expert for an Australian professional services firm. Use historical spending data to predict future trends. Use Australian Financial Year (Jul-Jun). Be specific with projections and clearly state your confidence level and assumptions.`;
}

function getSpendingUserPrompt(type: string, dataContext: string): string {
  if (type === "spending_patterns") {
    return `Analyze our spending patterns in detail. Identify trends, anomalies, and areas of concern.

${dataContext}

Provide analysis on:
1. **Monthly Spending Trends**: Are costs increasing, stable, or decreasing? Identify any spikes or dips and what might be driving them.
2. **Cost Concentration**: Which projects consume the most resources? Is there unhealthy concentration?
3. **Billing Type Economics**: How do Fixed vs T&M projects compare on cost efficiency and margins?
4. **Staff Cost Structure**: What's the permanent vs contractor cost mix? Is it optimal?
5. **Seasonal Patterns**: Are there predictable quarterly or monthly patterns in spend?
6. **Cost Anomalies**: Flag any unusual cost movements that warrant investigation.

Use specific project names and dollar amounts. Include month-over-month or quarter-over-quarter comparisons where relevant.`;
  }
  if (type === "financial_advice") {
    return `Based on our financial data, provide strategic financial advice and actionable recommendations.

${dataContext}

Provide advice across these areas:
1. **Margin Improvement**: Which projects or billing categories have the most margin improvement potential? What specific actions should we take?
2. **Cost Optimization**: Where can we reduce costs without impacting delivery? Are there projects where costs are out of proportion to revenue?
3. **Revenue Growth Opportunities**: Based on current project performance, where should we invest more? Which clients or work types are most profitable?
4. **Workforce Strategy**: Is our permanent/contractor mix optimal? Should we convert contractors to permanent or vice versa based on cost data?
5. **Cash Flow Management**: Based on spending patterns, are there cash flow risks we should plan for?
6. **Portfolio Rebalancing**: Should we shift focus between Fixed and T&M work based on margin performance?

For each recommendation, provide: the specific opportunity, estimated financial impact, and suggested timeline.`;
  }
  return `Based on our historical spending data, predict future spending trends and financial trajectory.

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

async function streamAIResponse(openai: OpenAI, systemPrompt: string, userPrompt: string, res: any): Promise<void> {
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
}

async function findOrCreateEmployeeForImport(
  empMap: Map<string, number>, empCodes: Set<string>, counterRef: { value: number },
  firstName: string, lastName: string, role: string | null,
): Promise<number> {
  const fullName = `${firstName} ${lastName}`.toLowerCase();
  const existing = empMap.get(fullName);
  if (existing) return existing;
  let empCode = `E${counterRef.value++}`;
  while (empCodes.has(empCode)) empCode = `E${counterRef.value++}`;
  empCodes.add(empCode);
  const newEmp = await storage.createEmployee({
    employeeCode: empCode, firstName, lastName,
    email: null, role: role || "Staff",
    costBandLevel: null, staffType: null, grade: null, location: null,
    costCenter: null, securityClearance: null, payrollTax: false, payrollTaxRate: null,
    baseCost: "0", grossCost: "0", baseSalary: null,
    status: "active", startDate: null, endDate: null,
    scheduleStart: null, scheduleEnd: null, resourceGroup: null,
    team: null, jid: null, onboardingStatus: "completed",
  });
  empMap.set(fullName, newEmp.id);
  return newEmp.id;
}

async function findOrCreateProjectForImport(
  projMap: Map<string, number>, projCodes: Set<string>, counterRef: { value: number },
  origName: string,
): Promise<number> {
  const projName = origName.trim().toLowerCase();
  const existing = projMap.get(projName);
  if (existing) return existing;
  const isInternal = /^\d+$/.test(origName) || /^Reason\s/i.test(origName);
  const codeParts = isInternal ? null : /^([A-Z]{2,6}\d{2,4}[-\s]?\d{0,3})\s(.*)$/i.exec(origName);
  let pCode = codeParts?.[1]?.replaceAll(/\s+/g, '') ?? `INT${counterRef.value++}`;
  while (projCodes.has(pCode)) pCode = `INT${counterRef.value++}`;
  projCodes.add(pCode);
  let clientName = "Unknown";
  if (codeParts) {
    clientName = codeParts[1].replaceAll(/[\d-]/g, '');
  } else if (isInternal) {
    clientName = "Internal";
  }
  const newProj = await storage.createProject({
    projectCode: pCode, name: origName.substring(0, 200), client: clientName,
    clientCode: null, clientManager: null, engagementManager: null, engagementSupport: null,
    contractType: "time_materials", billingCategory: null, workType: isInternal ? "Internal" : null, panel: null,
    recurring: null, vat: null, pipelineStatus: "C", adStatus: "Active", status: "active",
    startDate: null, endDate: null, workOrderAmount: "0", budgetAmount: "0", actualAmount: "0",
    balanceAmount: "0", forecastedRevenue: "0", forecastedGrossCost: "0", contractValue: "0",
    varianceAtCompletion: "0", variancePercent: "0", varianceToContractPercent: "0", writeOff: "0",
    opsCommentary: null, soldGmPercent: "0", toDateGrossProfit: "0", toDateGmPercent: "0",
    gpAtCompletion: "0", forecastGmPercent: "0", description: null,
  });
  projMap.set(projName, newProj.id);
  return newProj.id;
}

function fuzzyMatchProjectId(
  engagementName: string,
  projByName: Map<string, number>,
  projByBaseCode: Map<string, number>,
): number | null {
  const exactMatch = projByName.get(engagementName.toLowerCase());
  if (exactMatch) return exactMatch;
  const codePart = /^([A-Z]{2,6}\d{2,4})/i.exec(engagementName);
  if (codePart) {
    const baseMatch = projByBaseCode.get(codePart[1].toLowerCase());
    if (baseMatch) return baseMatch;
  }
  const entries = Array.from(projByName.entries());
  for (const [key, id] of entries) {
    if (engagementName.toLowerCase().includes(key) || key.includes(engagementName.toLowerCase())) {
      return id;
    }
  }
  return null;
}

function mapPlannerProgress(percentComplete: number): string {
  if (percentComplete === 100) return "Completed";
  if (percentComplete > 0) return "In progress";
  return "Not started";
}

function mapPlannerPriority(priority: number | undefined): string {
  if (priority === 1) return "Important";
  if (priority === 5) return "Low";
  return "Medium";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ─── Employees ───
  app.get("/api/employees", requirePermission("resources", "view"), async (_req, res) => {
    const data = await storage.getEmployees();
    res.json(data);
  });
  app.get("/api/employees/:id", requirePermission("resources", "view"), async (req, res) => {
    const data = await storage.getEmployee(Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.post("/api/employees", requirePermission("resources", "create"), async (req, res) => {
    const parsed = insertEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createEmployee(parsed.data);
    res.json(data);
  });
  app.patch("/api/employees/:id", requirePermission("resources", "edit"), async (req, res) => {
    const data = await storage.updateEmployee(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.delete("/api/employees/:id", requirePermission("resources", "delete"), async (req, res) => {
    await storage.deleteEmployee(Number(req.params.id));
    res.json({ success: true });
  });
  app.patch("/api/employees/:id/link-user", requirePermission("resources", "edit"), async (req, res) => {
    const employeeId = Number(req.params.id);
    const { userId } = req.body;
    if (userId !== null && userId !== undefined) {
      if (typeof userId !== "number" || Number.isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const userExists = await db("users").where("id", userId).first();
      if (!userExists) {
        return res.status(400).json({ message: "User not found" });
      }
      const existingLink = await db("employees").where("user_id", userId).whereNot("id", employeeId).first();
      if (existingLink) {
        return res.status(400).json({ message: "This user is already linked to another employee" });
      }
    }
    const data = await storage.updateEmployee(employeeId, { userId: userId ?? null });
    if (!data) return res.status(404).json({ message: "Employee not found" });
    res.json(data);
  });

  // ─── Projects ───
  app.get("/api/projects", requirePermission("projects", "view"), async (_req, res) => {
    const data = await storage.getProjects();
    res.json(data);
  });
  app.get("/api/projects/:id", requirePermission("projects", "view"), async (req, res) => {
    const data = await storage.getProject(Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.post("/api/projects", requirePermission("projects", "create"), async (req, res) => {
    const parsed = insertProjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createProject(parsed.data);
    res.json(data);
  });
  app.patch("/api/projects/:id", requirePermission("projects", "edit"), async (req, res) => {
    const data = await storage.updateProject(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.delete("/api/projects/:id", requirePermission("projects", "delete"), async (req, res) => {
    await storage.deleteProject(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Rate Cards ───
  app.get("/api/rate-cards", requirePermission("rate_cards", "view"), async (_req, res) => {
    const data = await storage.getRateCards();
    res.json(data);
  });
  app.post("/api/rate-cards", requirePermission("rate_cards", "create"), async (req, res) => {
    const parsed = insertRateCardSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createRateCard(parsed.data);
    res.json(data);
  });
  app.patch("/api/rate-cards/:id", requirePermission("rate_cards", "edit"), async (req, res) => {
    const data = await storage.updateRateCard(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.delete("/api/rate-cards/:id", requirePermission("rate_cards", "delete"), async (req, res) => {
    await storage.deleteRateCard(Number(req.params.id));
    res.json({ success: true });
  });

  app.get("/api/rate-cards/derived", requirePermission("rate_cards", "view"), async (_req, res) => {
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
  app.get("/api/resource-plans", requirePermission("resource_plans", "view"), async (req, res) => {
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
  app.post("/api/resource-plans", requirePermission("resource_plans", "create"), async (req, res) => {
    const parsed = insertResourcePlanSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createResourcePlan(parsed.data);
    res.json(data);
  });
  app.patch("/api/resource-plans/:id", requirePermission("resource_plans", "edit"), async (req, res) => {
    const data = await storage.updateResourcePlan(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.delete("/api/resource-plans/:id", requirePermission("resource_plans", "delete"), async (req, res) => {
    await storage.deleteResourcePlan(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Timesheets ───
  app.get("/api/timesheets/available-fys", requirePermission("timesheets", "view"), async (req, res) => {
    try {
      const rows = await db("timesheets")
        .select(db.raw("DISTINCT week_ending"))
        .orderBy("week_ending", "asc");
      const fySet = new Set<string>();
      for (const r of rows) {
        const d = r.week_ending instanceof Date ? r.week_ending : new Date(r.week_ending);
        if (Number.isNaN(d.getTime())) continue;
        const m = d.getMonth();
        const y = d.getFullYear();
        const fyStart = m >= 6 ? y : y - 1;
        fySet.add(String(fyStart).slice(2) + "-" + String(fyStart + 1).slice(2));
      }
      res.json(Array.from(fySet).sort((a, b) => a.localeCompare(b)));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/timesheets", requirePermission("timesheets", "view"), async (req, res) => {
    if (req.query.projectId) {
      const data = await storage.getTimesheetsByProject(Number(req.query.projectId));
      return res.json(data);
    }
    if (req.query.employeeId) {
      const data = await storage.getTimesheetsByEmployee(Number(req.query.employeeId));
      return res.json(data);
    }
    if (req.query.fy) {
      try {
        const fy = String(req.query.fy);
        const parts = fy.split("-");
        if (parts.length === 2) {
          const fyStartYear = 2000 + Number.parseInt(parts[0], 10);
          const startDate = `${fyStartYear}-07-01`;
          const endDate = `${fyStartYear + 1}-06-30`;
          const data = await db("timesheets")
            .where("week_ending", ">=", startDate)
            .where("week_ending", "<=", endDate)
            .orderBy("week_ending", "desc");
          const mapped = data.map((r: any) => ({
            id: r.id,
            employeeId: r.employee_id,
            projectId: r.project_id,
            weekEnding: r.week_ending instanceof Date ? r.week_ending.toISOString().split("T")[0] : String(r.week_ending).split("T")[0],
            hoursWorked: String(r.hours_worked ?? 0),
            billable: r.billable,
            costValue: String(r.cost_value ?? 0),
            saleValue: String(r.sale_value ?? 0),
          }));
          return res.json(mapped);
        }
      } catch (err: any) {
        return res.status(500).json({ message: err.message });
      }
    }
    const data = await storage.getTimesheets();
    res.json(data);
  });
  app.post("/api/timesheets", requirePermission("timesheets", "create"), async (req, res) => {
    const parsed = insertTimesheetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createTimesheet(parsed.data);
    res.json(data);
  });
  app.patch("/api/timesheets/:id", requirePermission("timesheets", "edit"), async (req, res) => {
    const data = await storage.updateTimesheet(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.delete("/api/timesheets/:id", requirePermission("timesheets", "delete"), async (req, res) => {
    await storage.deleteTimesheet(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Costs ───
  app.get("/api/costs", requirePermission("costs", "view"), async (req, res) => {
    if (req.query.projectId) {
      const data = await storage.getCostsByProject(Number(req.query.projectId));
      return res.json(data);
    }
    const data = await storage.getCosts();
    res.json(data);
  });
  app.post("/api/costs", requirePermission("costs", "create"), async (req, res) => {
    const parsed = insertCostSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createCost(parsed.data);
    res.json(data);
  });
  app.delete("/api/costs/:id", requirePermission("costs", "delete"), async (req, res) => {
    await storage.deleteCost(Number(req.params.id));
    res.json({ success: true });
  });

  app.get("/api/costs/summary", requirePermission("costs", "view"), async (req, res) => {
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

  app.get("/api/resource-allocations", requirePermission("utilization", "view"), async (req, res) => {
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

  app.get("/api/utilization/weekly", requirePermission("utilization", "view"), async (req, res) => {
    try {
      const nameExpr = isMSSQL
        ? `COALESCE(employees.first_name + ' ' + employees.last_name, 'Unknown')`
        : `COALESCE(employees.first_name || ' ' || employees.last_name, 'Unknown')`;
      const billableExpr = isMSSQL
        ? `CASE WHEN timesheets.billable = 1 THEN CAST(timesheets.hours_worked AS numeric) ELSE 0 END`
        : `CASE WHEN timesheets.billable = true THEN CAST(timesheets.hours_worked AS numeric) ELSE 0 END`;
      let query = db("timesheets")
        .select("timesheets.employee_id")
        .select(db.raw(`timesheets.week_ending`))
        .select(db.raw(`${nameExpr} as employee_name`))
        .select(db.raw(`COALESCE(employees.role, '') as employee_role`))
        .sum({ total_hours: db.raw("CAST(timesheets.hours_worked AS numeric)") })
        .sum({ billable_hours: db.raw(billableExpr) })
        .sum({ cost_value: db.raw("CAST(timesheets.cost_value AS numeric)") })
        .sum({ sale_value: db.raw("CAST(timesheets.sale_value AS numeric)") })
        .leftJoin("employees", "timesheets.employee_id", "employees.id");

      if (req.query.fy) {
        const fy = String(req.query.fy);
        const parts = fy.split("-");
        if (parts.length === 2) {
          const fyStartYear = 2000 + Number.parseInt(parts[0], 10);
          query = query
            .where("timesheets.week_ending", ">=", `${fyStartYear}-07-01`)
            .where("timesheets.week_ending", "<=", `${fyStartYear + 1}-06-30`);
        }
      }

      const rows = await query
        .groupBy("timesheets.employee_id", "timesheets.week_ending",
          "employees.first_name", "employees.last_name", "employees.role")
        .orderBy([{ column: "week_ending", order: "desc" }, { column: "total_hours", order: "desc" }]);
      const normalized = rows.map((r: any) => ({
        employee_id: Number(r.employee_id),
        week_ending: r.week_ending instanceof Date ? r.week_ending.toISOString().split("T")[0] : String(r.week_ending).split("T")[0],
        employee_name: r.employee_name || "Unknown",
        employee_role: r.employee_role || "",
        total_hours: String(r.total_hours ?? 0),
        billable_hours: String(r.billable_hours ?? 0),
        cost_value: String(r.cost_value ?? 0),
        sale_value: String(r.sale_value ?? 0),
      }));
      res.json(normalized);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── KPIs ───
  app.get("/api/kpis", requirePermission("dashboard", "view"), async (req, res) => {
    if (req.query.projectId) {
      const data = await storage.getKpisByProject(Number(req.query.projectId));
      return res.json(data);
    }
    const data = await storage.getKpis();
    res.json(data);
  });
  app.post("/api/kpis", requirePermission("dashboard", "create"), async (req, res) => {
    const parsed = insertKpiSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createKpi(parsed.data);
    res.json(data);
  });

  // ─── Forecasts ───
  app.get("/api/forecasts", requirePermission("forecasts", "view"), async (req, res) => {
    if (req.query.projectId) {
      const data = await storage.getForecastsByProject(Number(req.query.projectId));
      return res.json(data);
    }
    const data = await storage.getForecasts();
    res.json(data);
  });
  app.post("/api/forecasts", requirePermission("forecasts", "create"), async (req, res) => {
    const parsed = insertForecastSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createForecast(parsed.data);
    res.json(data);
  });

  // ─── Milestones ───
  app.get("/api/milestones", requirePermission("milestones", "view"), async (req, res) => {
    if (req.query.projectId) {
      const data = await storage.getMilestonesByProject(Number(req.query.projectId));
      return res.json(data);
    }
    const data = await storage.getMilestones();
    res.json(data);
  });
  app.post("/api/milestones", requirePermission("milestones", "create"), async (req, res) => {
    const parsed = insertMilestoneSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createMilestone(parsed.data);
    res.json(data);
  });
  app.patch("/api/milestones/:id", requirePermission("milestones", "edit"), async (req, res) => {
    const data = await storage.updateMilestone(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.delete("/api/milestones/:id", requirePermission("milestones", "delete"), async (req, res) => {
    await storage.deleteMilestone(Number(req.params.id));
    res.json({ success: true });
  });

  app.post("/api/milestones/seed", requirePermission("milestones", "create"), async (req, res) => {
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
  app.get("/api/data-sources", requirePermission("data_sources", "view"), async (_req, res) => {
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
  app.post("/api/data-sources", requirePermission("data_sources", "create"), async (req, res) => {
    const parsed = insertDataSourceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createDataSource(parsed.data);
    res.json(data);
  });
  app.patch("/api/data-sources/:id", requirePermission("data_sources", "edit"), async (req, res) => {
    const data = await storage.updateDataSource(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });

  app.post("/api/data-sources/:id/sync", requirePermission("data_sources", "sync"), async (req, res) => {
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

  app.post("/api/data-sources/seed", requirePermission("data_sources", "create"), async (req, res) => {
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
  app.get("/api/employees/:id/onboarding", requirePermission("resources", "view"), async (req, res) => {
    const data = await storage.getOnboardingStepsByEmployee(Number(req.params.id));
    res.json(data);
  });
  app.post("/api/employees/:id/onboarding", requirePermission("resources", "create"), async (req, res) => {
    const parsed = insertOnboardingStepSchema.safeParse({ ...req.body, employeeId: Number(req.params.id) });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createOnboardingStep(parsed.data);
    res.json(data);
  });
  app.patch("/api/onboarding-steps/:id", requirePermission("resources", "edit"), async (req, res) => {
    const data = await storage.updateOnboardingStep(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });

  // ─── Dashboard Aggregates ───
  app.get("/api/dashboard/summary", requirePermission("dashboard", "view"), async (_req, res) => {
    const data = await storage.getDashboardSummary();
    res.json(data);
  });
  app.get("/api/dashboard/finance", requirePermission("finance", "view"), async (_req, res) => {
    const data = await storage.getFinanceDashboard();
    res.json(data);
  });
  app.get("/api/dashboard/utilization", requirePermission("utilization", "view"), async (req, res) => {
    const fy = req.query.fy as string | undefined;
    if (fy) {
      const parts = fy.split("-");
      if (parts.length === 2) {
        const fyStartYear = 2000 + Number.parseInt(parts[0], 10);
        const fyStart = `${fyStartYear}-07-01`;
        const fyEnd = `${fyStartYear + 1}-07-01`;
        const result = await db.raw(`
          SELECT
            (SELECT COUNT(*) FROM employees
             WHERE staff_type = 'Permanent' AND status != 'inactive'
             AND first_name NOT LIKE 'Perm-%' AND first_name NOT LIKE 'Contractor-%' AND first_name != 'Contingency'
            ) as total_permanent,
            (SELECT COUNT(DISTINCT t.employee_id)
             FROM timesheets t
             JOIN employees e ON e.id = t.employee_id
             JOIN projects p ON p.id = t.project_id
             WHERE e.staff_type = 'Permanent' AND e.status != 'inactive'
             AND e.first_name NOT LIKE 'Perm-%' AND e.first_name NOT LIKE 'Contractor-%' AND e.first_name != 'Contingency'
             AND p.client != 'Internal' AND p.client != 'RGT'
             AND (p.status = 'active' OR p.ad_status = 'Active')
             AND t.week_ending >= ? AND t.week_ending < ?
            ) as allocated_permanent
        `, [fyStart, fyEnd]);
        const rows = result.rows || result;
        const row = rows[0];
        const total = Number.parseInt(row?.total_permanent || "0");
        const allocated = Number.parseInt(row?.allocated_permanent || "0");
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
  app.get("/api/projects/:id/summary", requirePermission("projects", "view"), async (req, res) => {
    const data = await storage.getProjectSummary(Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });

  // ─── Project Monthly ───
  app.get("/api/project-monthly", requirePermission("projects", "view"), async (req, res) => {
    if (req.query.projectId) {
      const data = await storage.getProjectMonthlyByProject(Number(req.query.projectId));
      return res.json(data);
    }
    const data = await storage.getProjectMonthly();
    res.json(data);
  });
  app.post("/api/project-monthly", requirePermission("projects", "create"), async (req, res) => {
    const parsed = insertProjectMonthlySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createProjectMonthly(parsed.data);
    res.json(data);
  });

  // ─── Pipeline Opportunities ───
  app.get("/api/pipeline-opportunities", requirePermission("pipeline", "view"), async (req, res) => {
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
  app.post("/api/pipeline-opportunities", requirePermission("pipeline", "create"), async (req, res) => {
    const parsed = insertPipelineOpportunitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createPipelineOpportunity(parsed.data);
    res.json(data);
  });
  app.delete("/api/pipeline-opportunities/:id", requirePermission("pipeline", "delete"), async (req, res) => {
    await storage.deletePipelineOpportunity(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Scenarios ───
  app.get("/api/scenarios", requirePermission("scenarios", "view"), async (_req, res) => {
    const data = await storage.getScenarios();
    res.json(data);
  });
  app.get("/api/scenarios/:id", requirePermission("scenarios", "view"), async (req, res) => {
    const data = await storage.getScenarioWithAdjustments(Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.post("/api/scenarios", requirePermission("scenarios", "create"), async (req, res) => {
    const parsed = insertScenarioSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createScenario(parsed.data);
    res.json(data);
  });
  app.delete("/api/scenarios/:id", requirePermission("scenarios", "delete"), async (req, res) => {
    await storage.deleteScenario(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Scenario Adjustments ───
  app.post("/api/scenarios/:id/adjustments", requirePermission("scenarios", "create"), async (req, res) => {
    const parsed = insertScenarioAdjustmentSchema.safeParse({ ...req.body, scenarioId: Number(req.params.id) });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createScenarioAdjustment(parsed.data);
    res.json(data);
  });
  app.delete("/api/scenario-adjustments/:id", requirePermission("scenarios", "delete"), async (req, res) => {
    await storage.deleteScenarioAdjustment(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Reference Data (Admin) ───
  app.get("/api/reference-data", requireAuth, async (req, res) => {
    if (req.query.category) {
      const data = await storage.getReferenceDataByCategory(String(req.query.category));
      return res.json(data);
    }
    const data = await storage.getReferenceData();
    res.json(data);
  });
  app.post("/api/reference-data", requirePermission("admin", "manage"), async (req, res) => {
    const parsed = insertReferenceDataSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createReferenceData(parsed.data);
    res.json(data);
  });
  app.patch("/api/reference-data/:id", requirePermission("admin", "manage"), async (req, res) => {
    const data = await storage.updateReferenceData(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.delete("/api/reference-data/:id", requirePermission("admin", "manage"), async (req, res) => {
    await storage.deleteReferenceData(Number(req.params.id));
    res.json({ success: true });
  });

  app.get("/api/financial-targets/:fy", requireAuth, async (req, res) => {
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
      result[key] = Number.parseFloat(match?.value ?? defaultVal);
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
      req.session.role = user.role || "user";
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

  // ─── Permissions ───
  app.get("/api/permissions", requireAuth, async (req, res) => {
    const role = req.session.role || "employee";
    if (role === "admin") {
      const { RESOURCE_ACTIONS } = await import("@shared/schema");
      const perms: Record<string, string[]> = {};
      for (const [resource, actions] of Object.entries(RESOURCE_ACTIONS)) {
        perms[resource] = actions;
      }
      return res.json({ role, permissions: perms });
    }
    const rows = await storage.getPermissionsByRole(role);
    const perms: Record<string, string[]> = {};
    for (const r of rows) {
      if (r.allowed) {
        if (!perms[r.resource]) perms[r.resource] = [];
        perms[r.resource].push(r.action);
      }
    }
    res.json({ role, permissions: perms });
  });

  app.get("/api/role-permissions", requireAuth, async (req, res) => {
    const role = req.session.role || "employee";
    if (role !== "admin") return res.status(403).json({ message: "Admin access required" });
    const all = await storage.getAllPermissions();
    res.json(all);
  });

  app.put("/api/role-permissions", requireAuth, async (req, res) => {
    const role = req.session.role || "employee";
    if (role !== "admin") return res.status(403).json({ message: "Admin access required" });
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) return res.status(400).json({ message: "permissions array required" });
    await storage.bulkUpdatePermissions(permissions);
    res.json({ success: true });
  });

  app.get("/api/users", requirePermission("resources", "edit"), async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.patch("/api/users/:id/role", requirePermission("admin", "manage"), async (req, res) => {
    const { role: newRole } = req.body;
    if (!APP_ROLES.includes(newRole)) return res.status(400).json({ message: "Invalid role" });
    const updated = await storage.updateUserRole(Number(req.params.id), newRole);
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json({ success: true, role: newRole });
  });

  app.post("/api/employees/:id/create-user", requirePermission("admin", "manage"), async (req, res) => {
    const employeeId = Number(req.params.id);
    const employee = await storage.getEmployee(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    if (employee.userId) return res.status(400).json({ message: "Employee already has a linked user" });

    const { username, role: userRole } = req.body;
    if (!username || typeof username !== "string" || username.trim().length === 0) {
      return res.status(400).json({ message: "Username is required" });
    }
    if (!APP_ROLES.includes(userRole)) return res.status(400).json({ message: "Invalid role" });

    const existing = await storage.getUserByUsername(username.trim());
    if (existing) return res.status(400).json({ message: "Username already exists" });

    const bcrypt = await import("bcryptjs");
    const crypto = await import("crypto");
    const randomPassword = crypto.randomBytes(16).toString("hex");
    const tempPassword = await bcrypt.hash(randomPassword, 10);
    const newUser = await storage.createUser({
      username: username.trim(),
      password: tempPassword,
      role: userRole,
      email: employee.email || undefined,
      displayName: `${employee.firstName} ${employee.lastName}`,
    });
    await storage.updateEmployee(employeeId, { userId: newUser.id });
    res.json({ success: true, userId: newUser.id });
  });

  // ─── Azure AD SSO ───
  const msalConfig = {
    auth: {
      clientId: process.env.AZURE_CLIENT_ID || "",
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || "common"}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET || "",
    },
  };

  let msalClient: any = null;
  async function getMsalClient() {
    if (!msalClient && msalConfig.auth.clientId) {
      const msal = await import("@azure/msal-node");
      msalClient = new msal.ConfidentialClientApplication(msalConfig);
    }
    return msalClient;
  }

  function getSsoRedirectUri(req: any): string {
    if (process.env.SSO_REDIRECT_URI) {
      return process.env.SSO_REDIRECT_URI;
    }
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
    const uri = `${proto}://${host}/api/auth/sso/callback`;
    console.log("[SSO] Computed redirect URI for callback");
    return uri;
  }

  app.get("/api/auth/sso/login", async (req, res) => {
    try {
      const client = await getMsalClient();
      if (!client) {
        return res.status(500).json({ message: "Azure AD SSO is not configured. Set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID." });
      }
      const redirectUri = getSsoRedirectUri(req);
      const authUrl = await client.getAuthCodeUrl({
        scopes: ["openid", "profile", "email", "User.Read", "User.ReadBasic.All", "Tasks.Read", "Group.Read.All"],
        redirectUri,
        prompt: "select_account",
      });
      res.json({ authUrl });
    } catch (error: any) {
      console.error("[SSO] Login redirect error:", error);
      res.status(500).json({ message: error.message || "SSO login failed" });
    }
  });

  app.get("/api/auth/sso/callback", async (req, res) => {
    try {
      const client = await getMsalClient();
      if (!client) {
        return res.redirect("/?sso_error=not_configured");
      }
      const code = req.query.code as string;
      if (!code) {
        return res.redirect("/?sso_error=no_code");
      }
      const redirectUri = getSsoRedirectUri(req);
      const tokenResponse = await client.acquireTokenByCode({
        code,
        scopes: ["openid", "profile", "email", "User.Read", "User.ReadBasic.All", "Tasks.Read", "Group.Read.All"],
        redirectUri,
      });

      const account = tokenResponse.account;
      const email = String(account?.username || tokenResponse.idTokenClaims?.preferred_username || tokenResponse.idTokenClaims?.email || "");
      const displayName = String(account?.name || tokenResponse.idTokenClaims?.name || email.split("@")[0]);

      if (!email) {
        return res.redirect("/?sso_error=no_email");
      }

      let user = await storage.getUserByEmail(email);
      if (!user) {
        const bcrypt = await import("bcryptjs");
        const randomPassword = await bcrypt.hash(Math.random().toString(36) + Date.now().toString(36), 10);
        user = await storage.createUser({
          username: email.split("@")[0].replaceAll(/[^a-zA-Z0-9]/g, "_"),
          password: randomPassword,
          email,
          displayName,
          role: "user",
        });
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role || "user";
      if (tokenResponse.accessToken) {
        req.session.graphAccessToken = tokenResponse.accessToken;
        req.session.graphTokenExpires = tokenResponse.expiresOn ? new Date(tokenResponse.expiresOn).getTime() : Date.now() + 3600000;
      }
      if (account) {
        req.session.msalAccountKey = account.homeAccountId;
      }

      res.redirect("/");
    } catch (error: any) {
      console.error("[SSO] Callback error:", error);
      res.redirect("/?sso_error=auth_failed");
    }
  });

  // ─── Delete All Data ───
  app.delete("/api/data/all", requirePermission("admin", "manage"), async (req, res) => {
    try {

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

  app.post("/api/upload/preview", requirePermission("upload", "upload"), upload.single("file"), async (req, res) => {
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

  app.post("/api/upload/import", requirePermission("upload", "upload"), upload.single("file"), async (req, res) => {
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
          results[sheetName] = await dispatchSheetImport(sheetName, ws);
        } catch (err: any) {
          results[sheetName] = { imported: 0, errors: [err.message || "Unknown import error"] };
        }
      }

      res.json({ results });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Import failed" });
    }
  });

  // ─── Standalone Sheet Uploads (Project Hours / Personal Hours) ───
  app.post("/api/upload/single-sheet", requirePermission("upload", "upload"), upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const sheetType = req.body.sheetType;
      if (!sheetType || !["Project Hours", "Personal Hours - inc non-projec"].includes(sheetType)) {
        return res.status(400).json({ message: "Invalid sheet type" });
      }

      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      let ws = wb.Sheets[sheetType];
      if (!ws) {
        ws = wb.Sheets[wb.SheetNames[0]];
      }
      if (!ws) return res.status(400).json({ message: "No sheet found in file" });

      let result: { imported: number; errors: string[] };
      if (sheetType === "Project Hours") {
        result = await importProjectHours(ws);
      } else {
        result = await importPersonalHours(ws);
      }

      res.json({ results: { [sheetType]: result } });
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
    console.error(e);
    console.log("OpenAI not configured - AI insights will be unavailable");
  }

  app.post("/api/ai/insights", requirePermission("ai_insights", "view"), async (req, res) => {
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
          const total = monthRevs.reduce((s, v) => s + Number.parseFloat(v || "0"), 0);
          classGroups[cls] = (classGroups[cls] || 0) + total;
          const winRate: Record<string, number> = { C: 1, S: 0.8, DVF: 0.5, DF: 0.3, Q: 0.15, A: 0.05 };
          totalWeighted += total * (winRate[cls] || 0);

          const zeroMonths = monthRevs.filter(v => Number.parseFloat(v || "0") === 0).length;
          const h1 = monthRevs.slice(0, 6).reduce((s, v) => s + Number.parseFloat(v || "0"), 0);
          const h2 = monthRevs.slice(6).reduce((s, v) => s + Number.parseFloat(v || "0"), 0);
          oppDetails.push(`  - "${opp.name}" [${cls}] VAT:${opp.vat || "?"} Total:$${total.toLocaleString()} H1:$${h1.toLocaleString()} H2:$${h2.toLocaleString()} ZeroMonths:${zeroMonths}/12`);
        });

        const totalPipeline = Object.values(classGroups).reduce((s, v) => s + v, 0);
        const committedPct = totalPipeline > 0 ? ((classGroups["C"] || 0) / totalPipeline * 100).toFixed(1) : "0";
        const earlyPct = totalPipeline > 0 ? (((classGroups["Q"] || 0) + (classGroups["A"] || 0)) / totalPipeline * 100).toFixed(1) : "0";

        userPrompt = `Identify ALL risks in our sales pipeline. Be specific - name each opportunity that has problems.

Pipeline Data (${pipelineOpps.length} opportunities, Total: $${totalPipeline.toLocaleString()}, Weighted: $${totalWeighted.toLocaleString()}):
Classification breakdown:
${Object.entries(classGroups).map(([k, v]) => { const pct = totalPipeline > 0 ? (v / totalPipeline * 100).toFixed(1) : "0"; return `- ${k}: $${v.toLocaleString()} (${pct}%)`; }).join("\n")}

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
          const totalRev = monthly.reduce((s, m) => s + Number.parseFloat(m.revenue || "0"), 0);
          const totalCost = monthly.reduce((s, m) => s + Number.parseFloat(m.cost || "0"), 0);
          const margin = totalRev > 0 ? ((totalRev - totalCost) / totalRev * 100).toFixed(1) : "0";
          const monthlyMargins = monthly.map(m => {
            const r = Number.parseFloat(m.revenue || "0");
            const c = Number.parseFloat(m.cost || "0");
            return r > 0 ? ((r - c) / r * 100).toFixed(0) : "N/A";
          });
          const costTrend = monthly.slice(-3).map(m => `$${Number.parseFloat(m.cost || "0").toLocaleString()}`).join(" -> ");
          const wo = Number.parseFloat(p.workOrderAmount || "0");
          const actual = Number.parseFloat(p.actualAmount || "0");
          const balance = Number.parseFloat(p.balanceAmount || "0");
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
        try { resourceCosts = await db("resource_costs").select("*"); } catch (e) { console.error(e); }

        const activeProjects = projects.filter(p => p.status === "active" || p.adStatus === "Active");
        const permEmployees = employees.filter(e => e.staffType === "Permanent");

        const monthlySpend: Record<string, { revenue: number; cost: number; profit: number }> = {};
        projectMonthly.forEach(m => {
          const key = `${m.fyYear}-M${m.month}`;
          if (!monthlySpend[key]) monthlySpend[key] = { revenue: 0, cost: 0, profit: 0 };
          monthlySpend[key].revenue += Number.parseFloat(m.revenue || "0");
          monthlySpend[key].cost += Number.parseFloat(m.cost || "0");
          monthlySpend[key].profit += Number.parseFloat(m.revenue || "0") - Number.parseFloat(m.cost || "0");
        });

        const billingBreakdown: Record<string, { revenue: number; cost: number }> = {};
        projects.forEach(p => {
          const cat = p.billingCategory || "Other";
          const pm = projectMonthly.filter(m => m.projectId === p.id);
          const rev = pm.reduce((s, m) => s + Number.parseFloat(m.revenue || "0"), 0);
          const cost = pm.reduce((s, m) => s + Number.parseFloat(m.cost || "0"), 0);
          if (!billingBreakdown[cat]) billingBreakdown[cat] = { revenue: 0, cost: 0 };
          billingBreakdown[cat].revenue += rev;
          billingBreakdown[cat].cost += cost;
        });

        const topCostProjects = projects.map(p => {
          const pm = projectMonthly.filter(m => m.projectId === p.id);
          const totalCost = pm.reduce((s, m) => s + Number.parseFloat(m.cost || "0"), 0);
          const totalRev = pm.reduce((s, m) => s + Number.parseFloat(m.revenue || "0"), 0);
          const monthCosts = [...pm].sort((a, b) => (a.month ?? 0) - (b.month ?? 0)).map(m => Number.parseFloat(m.cost || "0"));
          return { name: p.name, code: p.projectCode, billing: p.billingCategory, totalCost, totalRev, margin: totalRev > 0 ? ((totalRev - totalCost) / totalRev * 100).toFixed(1) : "0", monthCosts };
        }).sort((a, b) => b.totalCost - a.totalCost).slice(0, 20);

        const staffCostSummary = resourceCosts.map((rc: any) => ({
          name: rc.employee_name,
          staffType: rc.staff_type,
          phase: rc.cost_phase,
          total: Number.parseFloat(rc.total_cost || "0"),
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
          .map(p => {
            const trendStr = p.monthCosts.map(c => `$${c.toLocaleString()}`).join(",");
            return `  "${p.name}" [${p.billing || "?"}]: Cost $${p.totalCost.toLocaleString()} Rev $${p.totalRev.toLocaleString()} Margin:${p.margin}% Trend:[${trendStr}]`;
          })
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
        const totalRevenue = kpis.reduce((s, k) => s + Number.parseFloat(k.revenue || "0"), 0);
        const totalCost = kpis.reduce((s, k) => s + Number.parseFloat(k.grossCost || "0"), 0);
        const avgMargin = kpis.length > 0
          ? (kpis.reduce((s, k) => s + Number.parseFloat(k.marginPercent || "0"), 0) / kpis.length).toFixed(1)
          : "0";
        const avgUtil = kpis.length > 0
          ? (kpis.reduce((s, k) => s + Number.parseFloat(k.utilization || "0"), 0) / kpis.length).toFixed(1)
          : "0";

        const classGroups: Record<string, number> = {};
        pipelineOpps.forEach(opp => {
          const cls = opp.classification || "Unknown";
          const total = [opp.revenueM1, opp.revenueM2, opp.revenueM3, opp.revenueM4, opp.revenueM5, opp.revenueM6,
            opp.revenueM7, opp.revenueM8, opp.revenueM9, opp.revenueM10, opp.revenueM11, opp.revenueM12]
            .reduce((s, v) => s + Number.parseFloat(v || "0"), 0);
          classGroups[cls] = (classGroups[cls] || 0) + total;
        });

        const projectRisks = projects.map(p => {
          const monthly = projectMonthly.filter(m => m.projectId === p.id);
          const totalRev = monthly.reduce((s, m) => s + Number.parseFloat(m.revenue || "0"), 0);
          const totalCost = monthly.reduce((s, m) => s + Number.parseFloat(m.cost || "0"), 0);
          const margin = totalRev > 0 ? ((totalRev - totalCost) / totalRev * 100).toFixed(1) : "0";
          const balance = Number.parseFloat(p.balanceAmount || "0");
          return { name: p.name, margin: Number.parseFloat(margin), balance, totalRev, status: p.status };
        });

        const lowMarginProjects = projectRisks.filter(p => p.margin < 20).map(p => `${p.name} (${p.margin}%)`);
        const negativeBalance = projectRisks.filter(p => p.balance < 0).map(p => `${p.name} ($${p.balance.toLocaleString()})`);
        const topRevProject = [...projectRisks].sort((a, b) => b.totalRev - a.totalRev)[0];
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

  // ─── VAT PPTX Upload ───
  const { parsePptxFile } = await import("./pptx-parser");

  app.post("/api/upload/vat-pptx/debug", requirePermission("upload", "upload"), upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const { debugPptxSlides } = await import("./pptx-parser");
      const result = debugPptxSlides(req.file.buffer);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/upload/vat-pptx/preview", requirePermission("upload", "upload"), upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const result = parsePptxFile(req.file.buffer);
      res.json({
        fileName: req.file.originalname,
        reports: result.reports.map(r => ({
          vatName: r.vatName,
          reportDate: r.reportDate,
          overallStatus: r.overallStatus,
          statusSummaryPreview: (r.statusSummary || "").substring(0, 200),
          openOppsStatus: r.openOppsStatus,
          bigPlaysStatus: r.bigPlaysStatus,
          accountGoalsStatus: r.accountGoalsStatus,
          relationshipsStatus: r.relationshipsStatus,
          researchStatus: r.researchStatus,
          risksCount: r.risks.length,
          plannerTasksCount: r.plannerTasks.length,
          hasOpenOpps: !!r.openOppsSummary,
          hasBigPlays: !!r.bigPlays,
          hasApproach: !!r.approachToShortfall,
          hasOtherActivities: !!r.otherActivities,
        })),
        summary: result.summary,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to parse PPTX file" });
    }
  });

  app.post("/api/upload/vat-pptx/import", requirePermission("upload", "upload"), upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const selectedVats: string[] = JSON.parse(req.body.selectedVats || "[]");
      const reportDate: string = req.body.reportDate || "";
      const username = req.session?.username || "pptx-import";

      const { reports } = parsePptxFile(req.file.buffer);
      if (reports.length === 0) {
        return res.status(400).json({ message: "No VAT reports found in the PPTX file. Make sure it follows the VAT SC Report template." });
      }

      const refVats = await db("reference_data").where({ category: "vat_category", active: true });
      const validVatNames = new Set(refVats.length > 0 ? refVats.map((r: any) => r.key) : [...VAT_NAMES]);
      const toImport = (selectedVats.length > 0
        ? reports.filter(r => selectedVats.includes(r.vatName))
        : reports
      ).filter(r => validVatNames.has(r.vatName));

      if (toImport.length === 0) {
        return res.status(400).json({ message: "No valid VAT reports selected for import." });
      }

      const results: Record<string, { imported: boolean; reportId: number; risksImported: number; plannerTasksImported: number; errors: string[] }> = {};

      for (const report of toImport) {
        const vatResult = { imported: false, reportId: 0, risksImported: 0, plannerTasksImported: 0, errors: [] as string[] };
        try {
          const created = await storage.createVatReport({
            vatName: report.vatName,
            reportDate: reportDate || report.reportDate,
            overallStatus: report.overallStatus || null,
            statusSummary: report.statusSummary || null,
            openOppsSummary: report.openOppsSummary || null,
            bigPlays: report.bigPlays || null,
            accountGoals: report.accountGoals || null,
            relationships: report.relationships || null,
            research: report.research || null,
            approachToShortfall: report.approachToShortfall || null,
            otherActivities: report.otherActivities || null,
            openOppsStatus: report.openOppsStatus || null,
            bigPlaysStatus: report.bigPlaysStatus || null,
            accountGoalsStatus: report.accountGoalsStatus || null,
            relationshipsStatus: report.relationshipsStatus || null,
            researchStatus: report.researchStatus || null,
            createdBy: username,
            updatedBy: username,
          });

          vatResult.imported = true;
          vatResult.reportId = created.id;

          for (const risk of report.risks) {
            try {
              await storage.createVatRisk({
                vatReportId: created.id,
                raisedBy: risk.raisedBy || null,
                description: risk.description,
                impact: risk.impact || null,
                dateBecomesIssue: risk.dateBecomesIssue || null,
                status: risk.status || null,
                owner: risk.owner || null,
                impactRating: risk.impactRating || null,
                likelihood: risk.likelihood || null,
                mitigation: risk.mitigation || null,
                comments: risk.comments || null,
                riskRating: risk.riskRating || null,
                riskType: risk.riskType || "risk",
              });
              vatResult.risksImported++;
            } catch (e: any) {
              vatResult.errors.push(`Risk "${risk.description.substring(0, 50)}": ${e.message}`);
            }
          }

          for (const task of report.plannerTasks) {
            try {
              await storage.createVatPlannerTask({
                vatReportId: created.id,
                bucketName: task.bucketName,
                taskName: task.taskName,
                progress: task.progress || null,
                dueDate: task.dueDate || null,
                priority: task.priority || null,
                assignedTo: task.assignedTo || null,
                labels: task.labels || null,
              });
              vatResult.plannerTasksImported++;
            } catch (e: any) {
              vatResult.errors.push(`Planner task "${task.taskName.substring(0, 50)}": ${e.message}`);
            }
          }

          await storage.createVatChangeLog({
            vatReportId: created.id,
            fieldName: "pptx_import",
            oldValue: null,
            newValue: `Imported from PPTX: ${report.risks.length} risks, ${report.plannerTasks.length} planner tasks`,
            changedBy: username,
          });

        } catch (e: any) {
          vatResult.errors.push(`Failed to create report: ${e.message}`);
        }

        results[report.vatName] = vatResult;
      }

      res.json({ results });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to import PPTX file" });
    }
  });

  // ─── VAT Reports ───
  app.get("/api/vat-reports", requirePermission("vat_reports", "view"), async (_req, res) => {
    const data = await storage.getVatReports();
    res.json(data);
  });
  app.get("/api/vat-reports/latest", requirePermission("vat_reports", "view"), async (_req, res) => {
    const data = await storage.getLatestVatReports();
    res.json(data);
  });
  app.get("/api/vat-reports/vat/:vatName", requirePermission("vat_reports", "view"), async (req, res) => {
    const data = await storage.getVatReportsByVat(req.params.vatName);
    res.json(data);
  });
  app.get("/api/vat-reports/:id", requirePermission("vat_reports", "view"), async (req, res) => {
    const data = await storage.getVatReport(Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });
  app.post("/api/vat-reports", requirePermission("vat_reports", "create"), async (req, res) => {
    const parsed = insertVatReportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createVatReport(parsed.data);
    res.json(data);
  });
  app.patch("/api/vat-reports/:id", requirePermission("vat_reports", "edit"), async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getVatReport(id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const changedBy = req.body._changedBy || null;
    delete req.body._changedBy;
    const changes: { field: string; old: string | null; new_: string | null }[] = [];
    for (const [key, value] of Object.entries(req.body)) {
      const oldVal = (existing as any)[key];
      if (oldVal !== value) {
        changes.push({ field: key, old: oldVal ?? null, new_: (value ?? null) as string | null });
      }
    }
    const updated = await storage.updateVatReport(id, req.body);
    for (const c of changes) {
      await storage.createVatChangeLog({
        vatReportId: id,
        fieldName: c.field,
        oldValue: c.old,
        newValue: c.new_,
        changedBy,
        entityType: "report",
        entityId: id,
      });
    }
    res.json(updated);
  });
  app.delete("/api/vat-reports", requirePermission("vat_reports", "delete"), async (req, res) => {
    const deleted = await storage.deleteAllVatReports();
    res.json({ success: true, deleted });
  });

  app.delete("/api/vat-reports/:id", requirePermission("vat_reports", "delete"), async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getVatReport(id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const changedBy = req.body?._changedBy || null;
    await storage.createVatChangeLog({
      vatReportId: id,
      fieldName: "report_deleted",
      oldValue: `${existing.vatName} report dated ${existing.reportDate}`,
      newValue: null,
      changedBy,
      entityType: "report",
      entityId: id,
    });
    await storage.deleteVatReport(id);
    res.json({ success: true });
  });

  // ─── VAT Risks ───
  app.get("/api/vat-reports/:reportId/risks", requirePermission("vat_reports", "view"), async (req, res) => {
    const data = await storage.getVatRisks(Number(req.params.reportId));
    res.json(data);
  });
  app.post("/api/vat-reports/:reportId/risks", requirePermission("vat_reports", "create"), async (req, res) => {
    const parsed = insertVatRiskSchema.safeParse({ ...req.body, vatReportId: Number(req.params.reportId) });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createVatRisk(parsed.data);
    await storage.createVatChangeLog({
      vatReportId: Number(req.params.reportId),
      fieldName: "risk_added",
      newValue: data.description,
      changedBy: req.body._changedBy || null,
      entityType: "risk",
      entityId: data.id,
    });
    res.json(data);
  });
  app.patch("/api/vat-risks/:id", requirePermission("vat_reports", "edit"), async (req, res) => {
    const changedBy = req.body._changedBy || null;
    delete req.body._changedBy;
    const updated = await storage.updateVatRisk(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    await storage.createVatChangeLog({
      vatReportId: updated.vatReportId,
      fieldName: "risk_updated",
      newValue: updated.description,
      changedBy,
      entityType: "risk",
      entityId: updated.id,
    });
    res.json(updated);
  });
  app.delete("/api/vat-risks/:id", requirePermission("vat_reports", "delete"), async (req, res) => {
    await storage.deleteVatRisk(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── VAT Action Items ───
  app.get("/api/vat-reports/:reportId/actions", requirePermission("vat_reports", "view"), async (req, res) => {
    const data = await storage.getVatActionItems(Number(req.params.reportId));
    res.json(data);
  });
  app.post("/api/vat-reports/:reportId/actions", requirePermission("vat_reports", "create"), async (req, res) => {
    const parsed = insertVatActionItemSchema.safeParse({ ...req.body, vatReportId: Number(req.params.reportId) });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createVatActionItem(parsed.data);
    await storage.createVatChangeLog({
      vatReportId: Number(req.params.reportId),
      fieldName: "action_added",
      newValue: `${data.section}: ${data.description}`,
      changedBy: req.body._changedBy || null,
      entityType: "action",
      entityId: data.id,
    });
    res.json(data);
  });
  app.patch("/api/vat-actions/:id", requirePermission("vat_reports", "edit"), async (req, res) => {
    const changedBy = req.body._changedBy || null;
    delete req.body._changedBy;
    const updated = await storage.updateVatActionItem(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    await storage.createVatChangeLog({
      vatReportId: updated.vatReportId,
      fieldName: "action_updated",
      newValue: `${updated.section}: ${updated.description}`,
      changedBy,
      entityType: "action",
      entityId: updated.id,
    });
    res.json(updated);
  });
  app.delete("/api/vat-actions/:id", requirePermission("vat_reports", "delete"), async (req, res) => {
    await storage.deleteVatActionItem(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── VAT Planner Tasks ───
  app.get("/api/vat-reports/:reportId/planner", requirePermission("vat_reports", "view"), async (req, res) => {
    const data = await storage.getVatPlannerTasks(Number(req.params.reportId));
    res.json(data);
  });
  app.post("/api/vat-reports/:reportId/planner", requirePermission("vat_reports", "create"), async (req, res) => {
    const parsed = insertVatPlannerTaskSchema.safeParse({ ...req.body, vatReportId: Number(req.params.reportId) });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = await storage.createVatPlannerTask(parsed.data);
    await storage.createVatChangeLog({
      vatReportId: Number(req.params.reportId),
      fieldName: "planner_task_added",
      newValue: `${data.bucketName}: ${data.taskName}`,
      changedBy: req.body._changedBy || null,
      entityType: "planner",
      entityId: data.id,
    });
    res.json(data);
  });
  app.patch("/api/vat-planner/:id", requirePermission("vat_reports", "edit"), async (req, res) => {
    const changedBy = req.body._changedBy || null;
    delete req.body._changedBy;
    const updated = await storage.updateVatPlannerTask(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    await storage.createVatChangeLog({
      vatReportId: updated.vatReportId,
      fieldName: "planner_task_updated",
      newValue: `${updated.bucketName}: ${updated.taskName} (${updated.progress})`,
      changedBy,
      entityType: "planner",
      entityId: updated.id,
    });
    res.json(updated);
  });
  app.delete("/api/vat-planner/:id", requirePermission("vat_reports", "delete"), async (req, res) => {
    await storage.deleteVatPlannerTask(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Microsoft Planner Sync ───
  app.post("/api/vat-reports/:reportId/planner/sync", requirePermission("vat_reports", "edit"), async (req, res) => {
    try {
      const reportId = Number(req.params.reportId);
      const { planId } = req.body;
      if (!planId || typeof planId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(planId)) {
        return res.status(400).json({ message: "planId is required and must be alphanumeric" });
      }

      let graphToken: string | null = null;

      const sessionToken = req.session.graphAccessToken;
      const tokenExpires = req.session.graphTokenExpires;
      if (sessionToken && tokenExpires && Date.now() < tokenExpires) {
        graphToken = sessionToken;
        console.log("[Planner Sync] Using delegated user token from session");
      }

      if (!graphToken) {
        const accountKey = req.session.msalAccountKey;
        if (accountKey) {
          try {
            const client = await getMsalClient();
            if (client) {
              const accounts = await client.getTokenCache().getAllAccounts();
              const account = accounts.find((a: any) => a.homeAccountId === accountKey);
              if (account) {
                const silentResult = await client.acquireTokenSilent({
                  account,
                  scopes: ["Tasks.Read", "Group.Read.All", "User.Read", "User.ReadBasic.All"],
                });
                if (silentResult?.accessToken) {
                  graphToken = silentResult.accessToken;
                  req.session.graphAccessToken = silentResult.accessToken;
                  req.session.graphTokenExpires = silentResult.expiresOn ? new Date(silentResult.expiresOn).getTime() : Date.now() + 3600000;
                  console.log("[Planner Sync] Refreshed delegated token via MSAL silent flow");
                }
              }
            }
          } catch (silentErr: any) {
            console.warn("[Planner Sync] Silent token refresh failed:", silentErr.message);
          }
        }
      }

      if (!graphToken) {
        return res.status(401).json({
          message: "Planner sync requires a delegated user token. Please log out and log back in via Azure AD SSO to grant Planner permissions, then try again."
        });
      }

      const tokenData = { access_token: graphToken };

      const graphRes = await fetch(`https://graph.microsoft.com/v1.0/planner/plans/${planId}/tasks`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!graphRes.ok) {
        const err = await graphRes.text();
        console.error("[Planner Sync] Graph error:", err);
        return res.status(502).json({ message: `Failed to fetch planner tasks. Verify Plan ID and permissions. Status: ${graphRes.status}` });
      }
      const graphData = await graphRes.json() as { value: any[] };
      const plannerTasks = graphData.value || [];

      const bucketNameCache = new Map<string, string>();
      try {
        const bucketsRes = await fetch(`https://graph.microsoft.com/v1.0/planner/plans/${planId}/buckets`, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (bucketsRes.ok) {
          const bucketsData = await bucketsRes.json() as { value: { id: string; name: string }[] };
          for (const b of bucketsData.value || []) {
            bucketNameCache.set(b.id, b.name);
          }
          console.log(`[Planner Sync] Resolved ${bucketNameCache.size} bucket names`);
        }
      } catch (bucketErr: any) {
        console.warn("[Planner Sync] Could not fetch bucket names:", bucketErr.message);
      }

      const existingTasks = await storage.getVatPlannerTasks(reportId);
      const existingByExtId = new Map<string, any>();
      const existingWithoutExtId: any[] = [];
      for (const t of existingTasks) {
        if (t.externalId) {
          existingByExtId.set(t.externalId, t);
        } else {
          existingWithoutExtId.push(t);
        }
      }
      const seenExtIds = new Set<string>();

      const insights: string[] = [];
      let synced = 0;
      let newCount = 0;
      let newlyCompletedCount = 0;
      let updatedCount = 0;

      const newTasks: { title: string; dueDate: string }[] = [];
      const updatedTasks: { title: string; changes: string[] }[] = [];
      const newlyCompletedTasks: { title: string; completedBy: string; completedDate: string }[] = [];
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const userIdCache = new Map<string, string>();
      for (const pt of plannerTasks) {
        if (pt.completedBy?.user?.id && pt.completedBy?.user?.displayName) {
          userIdCache.set(pt.completedBy.user.id, pt.completedBy.user.displayName);
        }
      }

      try {
        const planRes = await fetch(`https://graph.microsoft.com/v1.0/planner/plans/${planId}`, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (planRes.ok) {
          const planData = await planRes.json() as { owner?: string };
          if (planData.owner) {
            const membersRes = await fetch(`https://graph.microsoft.com/v1.0/groups/${planData.owner}/members?$select=id,displayName,mail&$top=999`, {
              headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });
            if (membersRes.ok) {
              const membersData = await membersRes.json() as { value: { id: string; displayName?: string; mail?: string }[] };
              for (const m of membersData.value || []) {
                if (m.id && m.displayName) {
                  userIdCache.set(m.id, m.displayName);
                }
              }
              console.log(`[Planner Sync] Resolved ${membersData.value?.length || 0} group members for user name lookups`);
            } else {
              console.warn(`[Planner Sync] Could not fetch group members (status ${membersRes.status}), falling back to individual lookups`);
            }
          }
        }
      } catch (groupErr: any) {
        console.warn("[Planner Sync] Group members lookup failed:", groupErr.message);
      }

      const allUserIds = new Set<string>();
      for (const pt of plannerTasks) {
        if (pt.assignments) {
          for (const uid of Object.keys(pt.assignments)) {
            if (uid) allUserIds.add(uid);
          }
        }
        if (pt.completedBy?.user?.id) {
          allUserIds.add(pt.completedBy.user.id);
        }
      }
      const unresolvedIds = Array.from(allUserIds).filter(id => !userIdCache.has(id));
      if (unresolvedIds.length > 0) {
        console.log(`[Planner Sync] ${unresolvedIds.length} user IDs still unresolved after group members lookup, trying individual lookups...`);
        const BATCH_SIZE = 20;
        for (let i = 0; i < unresolvedIds.length; i += BATCH_SIZE) {
          const batch = unresolvedIds.slice(i, i + BATCH_SIZE);
          const results = await Promise.allSettled(
            batch.map(async (uid) => {
              try {
                const userRes = await fetch(`https://graph.microsoft.com/v1.0/users/${uid}?$select=displayName,mail`, {
                  headers: { Authorization: `Bearer ${tokenData.access_token}` },
                });
                if (userRes.ok) {
                  const userData = await userRes.json() as { displayName?: string; mail?: string };
                  return { uid, name: userData.displayName || uid };
                } else {
                  console.warn(`[Planner Sync] User lookup failed for ${uid}: status ${userRes.status}`);
                }
              } catch (e) {
                console.warn(`[Planner Sync] User lookup error for ${uid}:`, (e as Error).message);
              }
              return { uid, name: uid };
            })
          );
          for (const result of results) {
            if (result.status === "fulfilled" && result.value.name !== result.value.uid) {
              userIdCache.set(result.value.uid, result.value.name);
            }
          }
        }
      }

      const allEmployees = await storage.getEmployees();
      const employeeByName = new Map<string, string>();
      for (const emp of allEmployees) {
        const fullName = `${emp.firstName} ${emp.lastName}`.trim();
        if (fullName) employeeByName.set(fullName.toLowerCase(), fullName);
      }

      const resolveUserName = (userId: string): string => {
        if (!userId) return "Unknown";
        const cached = userIdCache.get(userId);
        if (cached && cached !== userId) {
          const empMatch = employeeByName.get(cached.toLowerCase());
          return empMatch || cached;
        }
        return cached || userId;
      };

      for (const pt of plannerTasks) {
        const extId = pt.id;
        const taskName = pt.title || "Untitled";
        const bucketName = (pt.bucketId ? bucketNameCache.get(pt.bucketId) : "") || "";
        const percentComplete = pt.percentComplete || 0;
        let progress: string;
        if (percentComplete === 100) progress = "Completed";
        else if (percentComplete > 0) progress = "In progress";
        else progress = "Not started";
        const dueDate = pt.dueDateTime?.split("T")[0] ?? "";
        let priority: string;
        if (pt.priority === 1) priority = "Important";
        else if (pt.priority === 5) priority = "Low";
        else priority = "Medium";
        const assignedToIds = pt.assignments ? Object.keys(pt.assignments) : [];
        const assignedTo = assignedToIds.map(uid => resolveUserName(uid)).join(", ");
        seenExtIds.add(extId);

        let existing = existingByExtId.get(extId);
        if (!existing) {
          const nameMatch = existingWithoutExtId.find(t => t.taskName === taskName);
          if (nameMatch) {
            existing = nameMatch;
            existingWithoutExtId.splice(existingWithoutExtId.indexOf(nameMatch), 1);
          }
        }

        if (existing) {
          const wasCompleted = existing.progress !== "Completed" && progress === "Completed";
          const changes: string[] = [];
          if (existing.progress !== progress) changes.push(`progress: "${existing.progress}" → "${progress}"`);
          if (existing.dueDate !== dueDate && dueDate) changes.push(`due date: "${existing.dueDate || "none"}" → "${dueDate}"`);
          if (existing.priority !== priority) changes.push(`priority: "${existing.priority}" → "${priority}"`);
          if (existing.taskName !== taskName) changes.push(`title: "${existing.taskName}" → "${taskName}"`);

          if (wasCompleted) {
            newlyCompletedCount++;
            let completedByName = "Unknown";
            if (pt.completedBy?.user?.id) {
              completedByName = resolveUserName(pt.completedBy.user.id);
            } else if (pt.completedBy?.user?.displayName) {
              completedByName = pt.completedBy.user.displayName;
            }
            const completedDate = pt.completedDateTime?.split("T")[0] ?? new Date().toISOString().split("T")[0];
            newlyCompletedTasks.push({ title: taskName, completedBy: completedByName, completedDate });
          }
          const needsBucketUpdate = existing.bucketName !== bucketName && bucketName;
          const needsAssigneeUpdate = existing.assignedTo !== assignedTo && assignedTo;
          if (changes.length > 0 || !existing.externalId || needsBucketUpdate || needsAssigneeUpdate) {
            await storage.updateVatPlannerTask(existing.id, { progress, dueDate, priority, assignedTo, taskName, bucketName, externalId: extId });
            if (changes.length > 0) {
              updatedCount++;
              updatedTasks.push({ title: taskName, changes });
            }
          }
        } else {
          await storage.createVatPlannerTask({
            vatReportId: reportId,
            bucketName,
            taskName,
            progress,
            dueDate,
            priority,
            assignedTo,
            labels: progress === "Completed" ? "GREEN" : "AMBER",
            sortOrder: synced,
            externalId: extId,
          });
          newCount++;
          newTasks.push({ title: taskName, dueDate });
        }
        synced++;
      }

      const recentCompletedInLast4Weeks: { title: string; completedBy: string; completedDate: string }[] = [];
      for (const pt of plannerTasks) {
        if (pt.percentComplete !== 100) continue;
        if (!pt.completedDateTime) continue;
        if (new Date(pt.completedDateTime) < fourWeeksAgo) continue;
        let completedByName = "Unknown";
        if (pt.completedBy?.user?.id) {
          completedByName = resolveUserName(pt.completedBy.user.id);
        } else if (pt.completedBy?.user?.displayName) {
          completedByName = pt.completedBy.user.displayName;
        }
        recentCompletedInLast4Weeks.push({
          title: pt.title || "Untitled",
          completedBy: completedByName,
          completedDate: pt.completedDateTime.split("T")[0],
        });
      }

      let removedCount = 0;
      const removedTasks: string[] = [];
      for (const [extId, task] of Array.from(existingByExtId.entries())) {
        if (!seenExtIds.has(extId)) {
          removedTasks.push(task.taskName || "Untitled");
          await storage.deleteVatPlannerTask(task.id);
          removedCount++;
        }
      }

      if (newlyCompletedCount > 0) insights.push(`${newlyCompletedCount} task${newlyCompletedCount > 1 ? "s" : ""} newly completed this sync`);
      if (newCount > 0) insights.push(`${newCount} new task${newCount > 1 ? "s" : ""} added from Planner`);
      if (updatedCount > 0) insights.push(`${updatedCount} task${updatedCount > 1 ? "s" : ""} updated`);
      if (removedCount > 0) insights.push(`${removedCount} task${removedCount > 1 ? "s" : ""} removed (no longer in Planner)`);
      if (recentCompletedInLast4Weeks.length > 0) insights.push(`${recentCompletedInLast4Weeks.length} task${recentCompletedInLast4Weeks.length > 1 ? "s" : ""} completed in last 4 weeks`);
      if (insights.length === 0) insights.push("All tasks are up to date");

      let aiSummary = "";
      if (openai && (newCount > 0 || updatedCount > 0 || newlyCompletedCount > 0 || removedCount > 0 || recentCompletedInLast4Weeks.length > 0)) {
        try {
          const bucketGroups: Record<string, string[]> = {};
          for (const pt of plannerTasks) {
            const bName = (pt.bucketId ? bucketNameCache.get(pt.bucketId) : "Other") || "Other";
            if (!bucketGroups[bName]) bucketGroups[bName] = [];
            const pct = pt.percentComplete || 0;
            let status = "Not Started";
            if (pct === 100) status = "Completed";
            else if (pct > 0) status = "In Progress";
            const assignees = pt.assignments ? Object.keys(pt.assignments).map(uid => resolveUserName(uid)).join(", ") : "";
            const titleStatus = `${pt.title} [${status}]`;
            const taskEntry = assignees ? `${titleStatus} (${assignees})` : titleStatus;
            bucketGroups[bName].push(taskEntry);
          }

          const syncDataForAI = {
            totalTasksInPlan: synced,
            bucketOverview: bucketGroups,
            newTasksCreated: newTasks,
            updatedTaskCount: updatedCount,
            updatedTaskSamples: updatedTasks.slice(0, 10),
            newlyCompletedThisSync: newlyCompletedTasks,
            completedTasksLast4Weeks: recentCompletedInLast4Weeks,
            removedTasks,
          };
          const aiRes = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 800,
            messages: [
              {
                role: "system",
                content: `You are a senior executive advisor writing a concise executive update on VAT team activity based on Microsoft Planner task data. Your audience is leadership who need strategic insight, not a raw changelog.

Write a brief executive summary (3-5 short paragraphs) covering:

1. **Overall Status**: How many total tasks, how many are completed vs in-progress vs not started. Give a high-level health assessment.
2. **Key Achievements**: What meaningful work was completed recently? Group by theme/category rather than listing every task. Mention who delivered results where known.
3. **Active Focus Areas**: What are the main workstreams currently in progress? Highlight any urgent items or approaching deadlines.
4. **New Initiatives**: Any newly created tasks that signal new strategic direction or priorities.
5. **Risks & Attention Items**: Tasks removed, overdue items, or areas with no progress that need attention.

Rules:
- Write in professional business English suitable for a leadership audience
- Be concise — no more than 200 words total
- Group related items together rather than listing individual tasks
- Focus on business impact and strategic themes, not individual field changes like "due date changed"
- Skip any section that has nothing meaningful to report
- Do NOT use markdown headers or bullet point formatting — write in flowing paragraphs
- Reference people by name where relevant`
              },
              {
                role: "user",
                content: `Generate an executive update based on this Planner sync data:\n${JSON.stringify(syncDataForAI, null, 2)}`
              }
            ],
          });
          aiSummary = aiRes.choices?.[0]?.message?.content || "";
        } catch (aiErr: any) {
          console.error("[Planner Sync] AI summary error:", aiErr.message);
          aiSummary = "";
        }
      }

      await storage.createVatChangeLog({
        vatReportId: reportId,
        fieldName: "planner_sync",
        oldValue: null,
        newValue: (aiSummary || insights.join("; ")).slice(0, 2000),
        changedBy: req.session?.username || "system",
        entityType: "planner",
        entityId: null,
      });

      res.json({
        synced,
        newCount,
        newlyCompletedCount,
        updatedCount,
        removedCount,
        insights,
        aiSummary,
        details: {
          newTasks,
          updatedTasks,
          newlyCompletedTasks,
          removedTasks,
          recentCompletedInLast4Weeks,
        },
      });
    } catch (error: any) {
      console.error("[Planner Sync] Error:", error);
      res.status(500).json({ message: error.message || "Planner sync failed" });
    }
  });

  // ─── VAT Change Logs ───
  app.get("/api/vat-reports/:reportId/changelog", requirePermission("vat_reports", "view"), async (req, res) => {
    const data = await storage.getVatChangeLogs(Number(req.params.reportId));
    res.json(data);
  });

  // ─── VAT Full Report (report + risks + actions + planner) ───
  app.get("/api/vat-reports/:id/full", requirePermission("vat_reports", "view"), async (req, res) => {
    const id = Number(req.params.id);
    const report = await storage.getVatReport(id);
    if (!report) return res.status(404).json({ message: "Not found" });
    const [risks, actions, plannerTasks, changeLogs] = await Promise.all([
      storage.getVatRisks(id),
      storage.getVatActionItems(id),
      storage.getVatPlannerTasks(id),
      storage.getVatChangeLogs(id),
    ]);
    res.json({ report, risks, actions, plannerTasks, changeLogs });
  });

  // ─── VAT AI Chat Assistant ───
  app.post("/api/vat-reports/ai-chat", requirePermission("ai_insights", "view"), async (req, res) => {
    try {
      const { vatName, messages: chatMessages, reportId } = req.body;
      if (!vatName || typeof vatName !== "string") return res.status(400).json({ message: "vatName is required" });
      if (chatMessages && (!Array.isArray(chatMessages) || chatMessages.some((m: any) => !m.role || !m.content))) {
        return res.status(400).json({ message: "Invalid message format" });
      }

      const pipelineOpps = await storage.getPipelineByVat(vatName);
      let existingReport: any = null;
      let risks: any[] = [];
      if (reportId) {
        existingReport = await storage.getVatReport(reportId);
        risks = await storage.getVatRisks(reportId);
      }

      const pipelineSummary = pipelineOpps.map(o => {
        const totalRev = [o.revenueM1, o.revenueM2, o.revenueM3, o.revenueM4, o.revenueM5, o.revenueM6,
          o.revenueM7, o.revenueM8, o.revenueM9, o.revenueM10, o.revenueM11, o.revenueM12]
          .reduce((s, v) => s + Number.parseFloat(v || "0"), 0);
        return `- ${o.name} (${o.classification}, $${totalRev.toLocaleString()}, status: ${o.status || "open"})`;
      }).join("\n");

      const riskSummary = risks.map(r =>
        `- ${r.description} (Impact: ${r.impactRating}, Likelihood: ${r.likelihood}, Owner: ${r.owner})`
      ).join("\n");

      if (!openai) {
        return res.status(503).json({ message: "AI assistant not available. Configure OPENAI_API_KEY." });
      }

      const systemPrompt = `You are an AI assistant helping create and manage VAT (Virtual Account Team) Sales Committee reports for an Australian professional services firm. You have access to the ${vatName} VAT's pipeline and risk data.

PIPELINE DATA for ${vatName}:
${pipelineSummary || "No pipeline data available"}

${riskSummary ? `CURRENT RISKS:\n${riskSummary}` : ""}
${existingReport ? `CURRENT REPORT:\n- Status: ${existingReport.overallStatus || "Not set"}\n- Summary: ${existingReport.statusSummary || "Empty"}\n- Open Opps: ${existingReport.openOppsSummary || "Empty"}\n- Big Plays: ${existingReport.bigPlays || "Empty"}\n- Approach to Shortfall: ${existingReport.approachToShortfall || "Empty"}` : ""}

Your role:
- Help draft report content (status summaries, open opps analysis, big plays, approach to shortfall)
- Provide strategic suggestions based on the pipeline data
- Answer questions about the VAT's pipeline performance
- When asked to draft content, provide it in bullet point format ready to paste into the report
- Use Australian Financial Year (Jul-Jun) and reference actual opportunity names and dollar values
- Be concise and actionable`;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const apiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
      ];
      if (chatMessages && Array.isArray(chatMessages)) {
        for (const m of chatMessages) {
          apiMessages.push({ role: m.role, content: m.content });
        }
      }

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: apiMessages,
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
      console.error("VAT AI chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message || "AI chat failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: error.message || "AI chat failed" });
      }
    }
  });

  // ─── VAT AI Structured Suggestions (per-field) ───
  app.post("/api/vat-reports/ai-suggest-fields", requirePermission("ai_insights", "view"), async (req, res) => {
    try {
      const { vatName, reportId, userRisks, userActionNotes } = req.body;
      if (!vatName || typeof vatName !== "string") return res.status(400).json({ message: "vatName is required" });

      const pipelineOpps = await storage.getPipelineByVat(vatName);
      let existingReport: any = null;
      let risks: any[] = [];
      let actionItems: any[] = [];
      let plannerTasks: any[] = [];
      if (reportId) {
        existingReport = await storage.getVatReport(reportId);
        risks = await storage.getVatRisks(reportId);
        actionItems = await storage.getVatActionItems(reportId);
        plannerTasks = await storage.getVatPlannerTasks(reportId);
      }

      const pipelineSummary = pipelineOpps.map(o => {
        const totalRev = [o.revenueM1, o.revenueM2, o.revenueM3, o.revenueM4, o.revenueM5, o.revenueM6,
          o.revenueM7, o.revenueM8, o.revenueM9, o.revenueM10, o.revenueM11, o.revenueM12]
          .reduce((s, v) => s + Number.parseFloat(v || "0"), 0);
        return `- ${o.name} (${o.classification}, $${totalRev.toLocaleString()}, status: ${o.status || "open"})`;
      }).join("\n");

      const riskSummary = (userRisks && Array.isArray(userRisks) && userRisks.length > 0)
        ? userRisks.map((r: any) =>
            `- ${r.description} (Impact: ${r.impactRating || "N/A"}, Likelihood: ${r.likelihood || "N/A"}, Status: ${r.status || "Open"}, Owner: ${r.owner || "Unassigned"})`
          ).join("\n")
        : risks.map(r =>
            `- ${r.description} (Impact: ${r.impactRating}, Likelihood: ${r.likelihood}, Status: ${r.status || "Open"}, Owner: ${r.owner})`
          ).join("\n");

      const completedActions = actionItems.filter((a: any) => a.status === "Completed" || a.status === "Done" || a.status === "Closed");
      const openActions = actionItems.filter((a: any) => a.status !== "Completed" && a.status !== "Done" && a.status !== "Closed");
      const completedActionsSummary = completedActions.map((a: any) =>
        `- ${a.description} (Owner: ${a.owner || "N/A"}, Section: ${a.section || "General"})`
      ).join("\n");
      const openActionsSummary = openActions.map((a: any) =>
        `- ${a.description} (Owner: ${a.owner || "N/A"}, Status: ${a.status || "Open"}, Due: ${a.dueDate || "N/A"})`
      ).join("\n");

      const completedTasks = plannerTasks.filter((t: any) => t.progress === "100%" || t.progress === "Complete" || t.progress === "Done");
      const inProgressTasks = plannerTasks.filter((t: any) => t.progress !== "100%" && t.progress !== "Complete" && t.progress !== "Done" && t.progress !== "0%" && t.progress !== "Not Started");
      const plannerParts: string[] = [];
      if (completedTasks.length > 0) {
        const lines = completedTasks.map((t: any) => "  - " + t.taskName + " (Bucket: " + (t.bucketName || "N/A") + ")").join("\n");
        plannerParts.push("Completed:\n" + lines);
      }
      if (inProgressTasks.length > 0) {
        const lines = inProgressTasks.map((t: any) => "  - " + t.taskName + " (" + (t.progress || "N/A") + ", Due: " + (t.dueDate || "N/A") + ")").join("\n");
        plannerParts.push("In Progress:\n" + lines);
      }
      const plannerSummary = plannerParts.join("\n");

      if (!openai) {
        return res.status(503).json({ message: "AI assistant not available. Configure OPENAI_API_KEY." });
      }

      const systemPrompt = `You are an AI assistant generating structured report content for a VAT (Virtual Account Team) Sales Committee report for an Australian professional services firm.

PIPELINE DATA for ${vatName}:
${pipelineSummary || "No pipeline data available"}

${riskSummary ? `CURRENT RISKS & ISSUES (reviewed by user):\n${riskSummary}` : "No risks currently recorded."}

${completedActionsSummary ? `RECENTLY COMPLETED ACTIONS:\n${completedActionsSummary}` : "No completed action items."}

${openActionsSummary ? `OPEN ACTION ITEMS:\n${openActionsSummary}` : ""}

${plannerSummary ? `PLANNER TASK STATUS:\n${plannerSummary}` : ""}

${existingReport ? `PREVIOUS REPORT CONTENT:\n- Status: ${existingReport.overallStatus || "Not set"}\n- Summary: ${existingReport.statusSummary || "Empty"}\n- Open Opps: ${existingReport.openOppsSummary || "Empty"}\n- Big Plays: ${existingReport.bigPlays || "Empty"}\n- Approach to Shortfall: ${existingReport.approachToShortfall || "Empty"}` : ""}

${userActionNotes ? `USER NOTES ON WHAT CHANGED:\n${userActionNotes}` : ""}

IMPORTANT INSTRUCTIONS:
- Reference SPECIFIC opportunity names, dollar values, risk descriptions, and completed actions from the data above.
- Do NOT generate generic or templated content. Every bullet point must reference real data provided.
- Highlight completed actions as achievements in the status summary.
- Address open risks directly in relevant sections.
- If no data is available for a field, say "No data available - please update manually" rather than making up content.

Generate content for EACH of the following report fields. Return ONLY valid JSON with no markdown formatting. Each field should contain bullet-point content (one bullet per line using "- " prefix). Use Australian Financial Year (Jul-Jun).

Return this exact JSON structure:
{
  "statusSummary": "bullet points summarising overall VAT status including completed actions as achievements, key wins, pipeline health, and current risk posture",
  "openOppsSummary": "bullet points about specific open opportunities from the pipeline data with their values and classification",
  "bigPlays": "bullet points about the largest strategic opportunities being pursued with dollar values",
  "approachToShortfall": "bullet points on strategies to address revenue gaps, referencing specific pipeline opportunities that could close",
  "accountGoals": "bullet points on key account objectives based on pipeline and open actions",
  "relationships": "bullet points on key stakeholder relationships referencing risk owners and action item owners",
  "research": "bullet points on market positioning based on pipeline classifications and opportunity types",
  "otherActivities": "bullet points on completed planner tasks, in-progress activities, and upcoming milestones"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a complete structured report draft for the ${vatName} VAT. Use the specific risks, completed actions, planner tasks, and pipeline data provided. Do NOT repeat or restate the previous report content—generate fresh, updated content that reflects what has changed.` },
        ],
        max_tokens: 3000,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content || "{}";
      try {
        const parsed = JSON.parse(content);
        res.json({ fields: parsed });
      } catch (e) {
        console.error("AI returned invalid JSON:", (e as Error).message);
        res.status(500).json({ message: "AI returned invalid JSON" });
      }
    } catch (error: any) {
      console.error("VAT AI suggest-fields error:", error);
      res.status(500).json({ message: error.message || "AI suggestion failed" });
    }
  });

  // ─── VAT Targets ───
  app.get("/api/vat-targets", requireAuth, async (req, res) => {
    const fyYear = (req.query.fy as string) || "";
    if (!fyYear) return res.status(400).json({ message: "fy query parameter required" });
    const data = await storage.getVatTargetsByFy(fyYear);
    res.json(data);
  });

  app.get("/api/vat-targets/:vatName", requireAuth, async (req, res) => {
    const fyYear = (req.query.fy as string) || "";
    if (!fyYear) return res.status(400).json({ message: "fy query parameter required" });
    const data = await storage.getVatTargets(req.params.vatName, fyYear);
    res.json(data);
  });

  app.post("/api/vat-targets", requirePermission("admin", "manage"), async (req, res) => {
    try {
      const parsed = insertVatTargetSchema.parse(req.body);
      const result = await storage.upsertVatTarget(parsed);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/vat-targets/:id", requirePermission("admin", "manage"), async (req, res) => {
    await storage.deleteVatTarget(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── VAT Overview ───
  app.get("/api/vat-overview", requirePermission("vat_overview", "view"), async (req, res) => {
    try {
      const fyYear = (req.query.fy as string) || "";
      if (!fyYear) return res.status(400).json({ message: "fy query parameter required" });
      const elapsedMonths = req.query.elapsedMonths ? Number(req.query.elapsedMonths) : undefined;
      const data = await storage.getVatOverviewData(fyYear, elapsedMonths);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to load overview" });
    }
  });

  // ─── VAT List (from reference data) ───
  app.get("/api/vats", requireAuth, async (_req, res) => {
    const refVats = await db("reference_data")
      .where({ category: "vat_category", active: true })
      .orderBy("display_order", "asc");
    if (refVats.length > 0) {
      res.json(refVats.map((r: any) => ({ name: r.key, displayName: r.value, order: r.display_order })));
    } else {
      res.json(VAT_NAMES.map((name, i) => ({ name, displayName: name, order: i + 1 })));
    }
  });

  // ─── Feature Requests ───
  app.get("/api/feature-requests", requirePermission("feature_requests", "view"), async (_req, res) => {
    try {
      const requests = await storage.getFeatureRequests();
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to load feature requests" });
    }
  });

  app.post("/api/feature-requests", requirePermission("feature_requests", "create"), async (req, res) => {
    try {
      const userId = req.session.userId;
      const data = insertFeatureRequestSchema.parse({ ...req.body, submittedBy: userId });
      const result = await storage.createFeatureRequest(data);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to create feature request" });
    }
  });

  app.patch("/api/feature-requests/:id", requirePermission("feature_requests", "edit"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const userId = req.session.userId;
      const { status, notes, githubBranch } = req.body;
      const updateData: any = {};
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (githubBranch !== undefined) updateData.githubBranch = githubBranch;
      if (status === "under_review" || status === "in_progress") {
        updateData.reviewedBy = userId;
      }
      const result = await storage.updateFeatureRequest(id, updateData);
      if (!result) return res.status(404).json({ message: "Feature request not found" });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to update feature request" });
    }
  });

  app.post("/api/feature-requests/:id/create-branch", requirePermission("feature_requests", "edit"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const fr = await storage.getFeatureRequest(id);
      if (!fr) return res.status(404).json({ message: "Feature request not found" });

      const branchName = `feature/fr-${id}-${fr.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').slice(0, 40)}`;

      const pat = process.env.GITHUB_PAT;
      if (!pat) return res.status(500).json({ message: "GitHub PAT not configured" });

      const owner = "ssengupta123";
      const repo = "FinanceHub";
      const headers = {
        "Authorization": `token ${pat}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      };

      const mainRef = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`, { headers });
      if (!mainRef.ok) return res.status(500).json({ message: "Failed to get main branch ref" });
      const mainData: any = await mainRef.json();
      const sha = mainData.object.sha;

      const createRef = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha }),
      });

      if (!createRef.ok) {
        const errData: any = await createRef.json();
        if (errData.message?.includes("Reference already exists")) {
          await storage.updateFeatureRequest(id, { status: "in_progress", githubBranch: branchName, reviewedBy: req.session.userId });
          const updated = await storage.getFeatureRequest(id);
          return res.json({ ...updated, message: "Branch already exists, linked to this request" });
        }
        return res.status(500).json({ message: `Failed to create branch: ${errData.message}` });
      }

      await storage.updateFeatureRequest(id, { status: "in_progress", githubBranch: branchName, reviewedBy: req.session.userId });
      const updated = await storage.getFeatureRequest(id);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to create GitHub branch" });
    }
  });

  return httpServer;
}

function deriveFyYear(startDateStr: string | null): string {
  if (!startDateStr) return "23-24";
  const yr = Number.parseInt(startDateStr.slice(0, 4));
  const mo = Number.parseInt(startDateStr.slice(5, 7));
  const fyStart = mo >= 7 ? yr : yr - 1;
  return `${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;
}

async function createJobStatusMonthlyData(
  project: { id: number },
  r: any[],
  fyYear: string,
): Promise<void> {
  const monthCols = {
    revenue: [35,36,37,38,39,40,41,42,43,44,45,46],
    cost: [47,48,49,50,51,52,53,54,55,56,57,58],
    profit: [59,60,61,62,63,64,65,66,67,68,69,70],
  };
  const monthLabels = ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"];
  for (let m = 0; m < 12; m++) {
    const rev = Number.parseFloat(toNum(r[monthCols.revenue[m]]));
    const cost = Number.parseFloat(toNum(r[monthCols.cost[m]]));
    const profit = Number.parseFloat(toNum(r[monthCols.profit[m]]));
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
}

function parseMonthlyCosts(r: any[], startCol: number, endCol: number): { costs: string[]; total: number } {
  let total = 0;
  const costs: string[] = [];
  for (let ci = startCol; ci <= endCol; ci++) {
    const v = Number(r[ci] || 0);
    costs.push(Number.isNaN(v) ? "0" : v.toFixed(2));
    total += Number.isNaN(v) ? 0 : v;
  }
  return { costs, total };
}

function cleanVatValue(raw: string | null): string | null {
  if (!raw) return null;
  let vat = raw.replaceAll(";#", "").replace(/\|.*$/, "").trim();
  if (vat.toLowerCase() === "growth") vat = "GROWTH";
  return vat;
}

function parseOptionalNumericField(raw: any): string | null {
  if (raw === "" || raw == null) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : String(num.toFixed(2));
}

function parseOptionalMarginField(raw: any): string | null {
  if (raw === "" || raw == null) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : String(num.toFixed(3));
}

async function dispatchSheetImport(sheetName: string, ws: XLSX.WorkSheet): Promise<{ imported: number; errors: string[] }> {
  if (sheetName === "Job Status") return importJobStatus(ws);
  if (sheetName === "Staff SOT") return importStaffSOT(ws);
  if (sheetName === "Resource Plan Opps" || sheetName === "Resource Plan Opps FY25-26") {
    return importPipelineRevenue(ws, sheetName === "Resource Plan Opps", sheetName);
  }
  if (sheetName === "GrossProfit") return importGrossProfit(ws);
  if (sheetName === "Personal Hours - inc non-projec") return importPersonalHours(ws);
  if (sheetName === "Project Hours") return importProjectHours(ws);
  if (sheetName === "CX Master List") return importCxMasterList(ws);
  if (sheetName === "Project Resource Cost") return importProjectResourceCost(ws);
  if (sheetName === "Project Resource Cost A&F") return importProjectResourceCostAF(ws);
  if (sheetName === "query" || sheetName.toLowerCase().startsWith("open op")) return importOpenOpps(ws);
  return { imported: 0, errors: ["Import not supported for this sheet"] };
}

function parseExcelNumericDate(val: number): string | null {
  const d = XLSX.SSF.parse_date_code(val);
  if (!d?.y) return null;
  return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
}

function isValidYear(yr: number): boolean {
  return yr >= 1900 && yr <= 2100;
}

function parseStringDate(s: string): string | null {
  if (!s || s.toLowerCase() === "n/a" || s === "-") return null;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const yr = parsed.getFullYear();
    if (!isValidYear(yr)) return null;
    return `${yr}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  return parseISOOrAUDate(s);
}

function parseISOOrAUDate(s: string): string | null {
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (isoMatch) {
    const yr = Number.parseInt(isoMatch[1]);
    if (!isValidYear(yr)) return null;
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }
  const auMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (auMatch) {
    const yr = auMatch[3].length === 2 ? 2000 + Number.parseInt(auMatch[3]) : Number.parseInt(auMatch[3]);
    if (!isValidYear(yr)) return null;
    return `${yr}-${auMatch[2].padStart(2, "0")}-${auMatch[1].padStart(2, "0")}`;
  }
  return null;
}

export function excelDateToString(val: any): string | null {
  if (!val) return null;
  if (typeof val === "number") return parseExcelNumericDate(val);
  return parseStringDate(String(val).trim());
}

export function toNum(val: any): string {
  if (val === null || val === undefined || val === "") return "0";
  const n = typeof val === "number" ? val : Number.parseFloat(String(val));
  return Number.isNaN(n) ? "0" : n.toFixed(2);
}

export function toDecimal(val: any): string {
  if (val === null || val === undefined || val === "") return "0";
  const n = typeof val === "number" ? val : Number.parseFloat(String(val));
  return Number.isNaN(n) ? "0" : n.toFixed(4);
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
        const yr = Number.parseInt(startDateStr.slice(0, 4));
        const mo = Number.parseInt(startDateStr.slice(5, 7));
        const fyStart = mo >= 7 ? yr : yr - 1;
        fyYear = `${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;
      }

      for (let m = 0; m < 12; m++) {
        const rev = Number.parseFloat(toNum(r[monthCols.revenue[m]]));
        const cost = Number.parseFloat(toNum(r[monthCols.cost[m]]));
        const profit = Number.parseFloat(toNum(r[monthCols.profit[m]]));
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

  const fyMatch = /FY(\d{2}-\d{2})/.exec(sheetName);
  const fyYear = fyMatch?.[1] ?? "23-24";

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
        const codeParts = isInternal ? null : /^([A-Z]{2,6}\d{2,4}[-\s]?\d{0,3})\s(.*)$/i.exec(origName);
        let pCode = codeParts?.[1]?.replaceAll(/\s+/g, '') ?? `INT${projCounter++}`;
        while (projCodes.has(pCode)) pCode = `INT${projCounter++}`;
        projCodes.add(pCode);
        let clientName = "Unknown";
        if (codeParts) {
          clientName = codeParts[1].replaceAll(/[\d-]/g, '');
        } else if (isInternal) {
          clientName = "Internal";
        }
        const newProj = await storage.createProject({
          projectCode: pCode, name: origName.substring(0, 200), client: clientName,
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
        const codeParts = isInternal ? null : /^([A-Z]{2,6}\d{2,4}[-\s]?\d{0,3})\s(.*)$/i.exec(projectDesc);
        let pCode = codeParts?.[1]?.replaceAll(/\s+/g, '') ?? `INT${projCounter++}`;
        while (projCodes.has(pCode)) pCode = `INT${projCounter++}`;
        projCodes.add(pCode);
        let clientName2 = "Unknown";
        if (codeParts) {
          clientName2 = codeParts[1].replaceAll(/[\d-]/g, '');
        } else if (isInternal) {
          clientName2 = "Internal";
        }
        match = await storage.createProject({
          projectCode: pCode, name: projectDesc.substring(0, 200), client: clientName2,
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
    const baseMatch = /^([A-Z]{2,6}\d{2,4})/i.exec(p.name);
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
        const codePart = /^([A-Z]{2,6}\d{2,4})/i.exec(engagementName);
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
        cxRating: cxRating === null || Number.isNaN(cxRating) ? null : cxRating,
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
        monthlyCosts.push(Number.isNaN(v) ? "0" : v.toFixed(2));
        total += Number.isNaN(v) ? 0 : v;
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
        costC.push(Number.isNaN(v) ? "0" : v.toFixed(2));
        totalC += Number.isNaN(v) ? 0 : v;
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
          costDVF.push(Number.isNaN(v) ? "0" : v.toFixed(2));
          totalDVF += Number.isNaN(v) ? 0 : v;
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

export function excelDateToISOString(serial: any): string | null {
  if (!serial || serial === "") return null;
  const num = Number(serial);
  if (Number.isNaN(num)) {
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
      const numRawValue = Number(rawValue);
      const value = rawValue !== "" && rawValue != null && !Number.isNaN(numRawValue) ? String(numRawValue.toFixed(2)) : null;
      const rawMargin = r[4];
      const numRawMargin = Number(rawMargin);
      const marginPercent = rawMargin !== "" && rawMargin != null && !Number.isNaN(numRawMargin) ? String(numRawMargin.toFixed(3)) : null;
      const workType = r[5] ? String(r[5]).trim() : null;
      const startDate = excelDateToISOString(r[6]);
      const expiryDate = excelDateToISOString(r[7]);

      let vat = r[8] ? String(r[8]).trim() : null;
      if (vat) {
        vat = vat.replaceAll(";#", "").replace(/\|.*$/, "").trim();
        if (vat.toLowerCase() === "growth") vat = "GROWTH";
      }

      const status = r[9] ? String(r[9]).trim() : null;
      const comment = r[10] ? String(r[10]).trim() : null;
      const casLead = r[11] ? String(r[11]).trim() : null;
      const csdLead = r[12] ? String(r[12]).replaceAll(/;#\d+;#/g, "; ").replaceAll(";#", "; ").trim() : null;
      const category = r[13] ? String(r[13]).replaceAll(";#", ", ").trim() : null;
      const partner = r[14] ? String(r[14]).replaceAll(";#", ", ").trim() : null;
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
