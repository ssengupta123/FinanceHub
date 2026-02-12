import { db } from "./db";
import { eq, desc, and, sql, sum, count } from "drizzle-orm";
import {
  employees,
  projects,
  rateCards,
  resourcePlans,
  timesheets,
  costs,
  kpis,
  forecasts,
  milestones,
  dataSources,
  onboardingSteps,
  users,
  projectMonthly,
  pipelineOpportunities,
  scenarios,
  scenarioAdjustments,
  type Employee,
  type InsertEmployee,
  type Project,
  type InsertProject,
  type RateCard,
  type InsertRateCard,
  type ResourcePlan,
  type InsertResourcePlan,
  type Timesheet,
  type InsertTimesheet,
  type Cost,
  type InsertCost,
  type Kpi,
  type InsertKpi,
  type Forecast,
  type InsertForecast,
  type Milestone,
  type InsertMilestone,
  type DataSource,
  type InsertDataSource,
  type OnboardingStep,
  type InsertOnboardingStep,
  type User,
  type InsertUser,
  type ProjectMonthly,
  type InsertProjectMonthly,
  type PipelineOpportunity,
  type InsertPipelineOpportunity,
  type Scenario,
  type InsertScenario,
  type ScenarioAdjustment,
  type InsertScenarioAdjustment,
} from "@shared/schema";

export interface IStorage {
  // Employees
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeesByStatus(status: string): Promise<Employee[]>;
  createEmployee(data: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<void>;

  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByStatus(status: string): Promise<Project[]>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;

  // Rate Cards
  getRateCards(): Promise<RateCard[]>;
  getRateCard(id: number): Promise<RateCard | undefined>;
  getRateCardsByRole(role: string): Promise<RateCard[]>;
  getRateCardsByGrade(grade: string): Promise<RateCard[]>;
  createRateCard(data: InsertRateCard): Promise<RateCard>;
  updateRateCard(id: number, data: Partial<InsertRateCard>): Promise<RateCard | undefined>;
  deleteRateCard(id: number): Promise<void>;

  // Resource Plans
  getResourcePlans(): Promise<ResourcePlan[]>;
  getResourcePlan(id: number): Promise<ResourcePlan | undefined>;
  getResourcePlansByProject(projectId: number): Promise<ResourcePlan[]>;
  getResourcePlansByEmployee(employeeId: number): Promise<ResourcePlan[]>;
  createResourcePlan(data: InsertResourcePlan): Promise<ResourcePlan>;
  updateResourcePlan(id: number, data: Partial<InsertResourcePlan>): Promise<ResourcePlan | undefined>;
  deleteResourcePlan(id: number): Promise<void>;

  // Timesheets
  getTimesheets(): Promise<Timesheet[]>;
  getTimesheet(id: number): Promise<Timesheet | undefined>;
  getTimesheetsByProject(projectId: number): Promise<Timesheet[]>;
  getTimesheetsByEmployee(employeeId: number): Promise<Timesheet[]>;
  createTimesheet(data: InsertTimesheet): Promise<Timesheet>;
  updateTimesheet(id: number, data: Partial<InsertTimesheet>): Promise<Timesheet | undefined>;
  deleteTimesheet(id: number): Promise<void>;

  // Costs
  getCosts(): Promise<Cost[]>;
  getCost(id: number): Promise<Cost | undefined>;
  getCostsByProject(projectId: number): Promise<Cost[]>;
  getCostsByCategory(category: string): Promise<Cost[]>;
  createCost(data: InsertCost): Promise<Cost>;
  updateCost(id: number, data: Partial<InsertCost>): Promise<Cost | undefined>;
  deleteCost(id: number): Promise<void>;

  // KPIs
  getKpis(): Promise<Kpi[]>;
  getKpi(id: number): Promise<Kpi | undefined>;
  getKpisByProject(projectId: number): Promise<Kpi[]>;
  createKpi(data: InsertKpi): Promise<Kpi>;
  updateKpi(id: number, data: Partial<InsertKpi>): Promise<Kpi | undefined>;
  deleteKpi(id: number): Promise<void>;

  // Forecasts
  getForecasts(): Promise<Forecast[]>;
  getForecast(id: number): Promise<Forecast | undefined>;
  getForecastsByProject(projectId: number): Promise<Forecast[]>;
  createForecast(data: InsertForecast): Promise<Forecast>;
  updateForecast(id: number, data: Partial<InsertForecast>): Promise<Forecast | undefined>;
  deleteForecast(id: number): Promise<void>;

  // Milestones
  getMilestones(): Promise<Milestone[]>;
  getMilestone(id: number): Promise<Milestone | undefined>;
  getMilestonesByProject(projectId: number): Promise<Milestone[]>;
  createMilestone(data: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: number, data: Partial<InsertMilestone>): Promise<Milestone | undefined>;
  deleteMilestone(id: number): Promise<void>;

  // Data Sources
  getDataSources(): Promise<DataSource[]>;
  getDataSource(id: number): Promise<DataSource | undefined>;
  createDataSource(data: InsertDataSource): Promise<DataSource>;
  updateDataSource(id: number, data: Partial<InsertDataSource>): Promise<DataSource | undefined>;
  deleteDataSource(id: number): Promise<void>;

  // Onboarding Steps
  getOnboardingSteps(): Promise<OnboardingStep[]>;
  getOnboardingStep(id: number): Promise<OnboardingStep | undefined>;
  getOnboardingStepsByEmployee(employeeId: number): Promise<OnboardingStep[]>;
  createOnboardingStep(data: InsertOnboardingStep): Promise<OnboardingStep>;
  updateOnboardingStep(id: number, data: Partial<InsertOnboardingStep>): Promise<OnboardingStep | undefined>;
  deleteOnboardingStep(id: number): Promise<void>;

  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;

  // Project Monthly
  getProjectMonthly(): Promise<ProjectMonthly[]>;
  getProjectMonthlyByProject(projectId: number): Promise<ProjectMonthly[]>;
  createProjectMonthly(data: InsertProjectMonthly): Promise<ProjectMonthly>;
  deleteProjectMonthly(id: number): Promise<void>;

  // Pipeline Opportunities
  getPipelineOpportunities(): Promise<PipelineOpportunity[]>;
  getPipelineOpportunity(id: number): Promise<PipelineOpportunity | undefined>;
  getPipelineByClassification(classification: string): Promise<PipelineOpportunity[]>;
  getPipelineByVat(vat: string): Promise<PipelineOpportunity[]>;
  createPipelineOpportunity(data: InsertPipelineOpportunity): Promise<PipelineOpportunity>;
  deletePipelineOpportunity(id: number): Promise<void>;

  // Scenarios
  getScenarios(): Promise<Scenario[]>;
  getScenario(id: number): Promise<Scenario | undefined>;
  getScenarioWithAdjustments(id: number): Promise<{ scenario: Scenario; adjustments: ScenarioAdjustment[] } | undefined>;
  createScenario(data: InsertScenario): Promise<Scenario>;
  deleteScenario(id: number): Promise<void>;

  // Scenario Adjustments
  getScenarioAdjustments(scenarioId: number): Promise<ScenarioAdjustment[]>;
  createScenarioAdjustment(data: InsertScenarioAdjustment): Promise<ScenarioAdjustment>;
  deleteScenarioAdjustment(id: number): Promise<void>;

  // Dashboard / Aggregates
  getDashboardSummary(): Promise<{
    totalProjects: number;
    totalEmployees: number;
    totalRevenue: number;
    totalCosts: number;
  }>;
  getProjectSummary(projectId: number): Promise<{
    project: Project;
    totalRevenue: number;
    totalCosts: number;
    avgMarginPercent: number;
    avgUtilization: number;
  } | undefined>;
  getFinanceDashboard(): Promise<{
    month: string;
    revenue: number;
    cost: number;
  }[]>;
  getUtilizationSummary(): Promise<{
    employeeId: number;
    totalPlannedHours: number;
    totalActualHours: number;
    utilization: number;
  }[]>;
}

export class DatabaseStorage implements IStorage {
  // Employees
  async getEmployees(): Promise<Employee[]> {
    return db.select().from(employees);
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const result = await db.select().from(employees).where(eq(employees.id, id));
    return result[0];
  }

  async getEmployeesByStatus(status: string): Promise<Employee[]> {
    return db.select().from(employees).where(eq(employees.status, status));
  }

  async createEmployee(data: InsertEmployee): Promise<Employee> {
    const result = await db.insert(employees).values(data).returning();
    return result[0];
  }

  async updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const result = await db.update(employees).set(data).where(eq(employees.id, id)).returning();
    return result[0];
  }

  async deleteEmployee(id: number): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return db.select().from(projects);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    return result[0];
  }

  async getProjectsByStatus(status: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.status, status));
  }

  async createProject(data: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values(data).returning();
    return result[0];
  }

  async updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined> {
    const result = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return result[0];
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Rate Cards
  async getRateCards(): Promise<RateCard[]> {
    return db.select().from(rateCards);
  }

  async getRateCard(id: number): Promise<RateCard | undefined> {
    const result = await db.select().from(rateCards).where(eq(rateCards.id, id));
    return result[0];
  }

  async getRateCardsByRole(role: string): Promise<RateCard[]> {
    return db.select().from(rateCards).where(eq(rateCards.role, role));
  }

  async getRateCardsByGrade(grade: string): Promise<RateCard[]> {
    return db.select().from(rateCards).where(eq(rateCards.grade, grade));
  }

  async createRateCard(data: InsertRateCard): Promise<RateCard> {
    const result = await db.insert(rateCards).values(data).returning();
    return result[0];
  }

  async updateRateCard(id: number, data: Partial<InsertRateCard>): Promise<RateCard | undefined> {
    const result = await db.update(rateCards).set(data).where(eq(rateCards.id, id)).returning();
    return result[0];
  }

  async deleteRateCard(id: number): Promise<void> {
    await db.delete(rateCards).where(eq(rateCards.id, id));
  }

  // Resource Plans
  async getResourcePlans(): Promise<ResourcePlan[]> {
    return db.select().from(resourcePlans);
  }

  async getResourcePlan(id: number): Promise<ResourcePlan | undefined> {
    const result = await db.select().from(resourcePlans).where(eq(resourcePlans.id, id));
    return result[0];
  }

  async getResourcePlansByProject(projectId: number): Promise<ResourcePlan[]> {
    return db.select().from(resourcePlans).where(eq(resourcePlans.projectId, projectId));
  }

  async getResourcePlansByEmployee(employeeId: number): Promise<ResourcePlan[]> {
    return db.select().from(resourcePlans).where(eq(resourcePlans.employeeId, employeeId));
  }

  async createResourcePlan(data: InsertResourcePlan): Promise<ResourcePlan> {
    const result = await db.insert(resourcePlans).values(data).returning();
    return result[0];
  }

  async updateResourcePlan(id: number, data: Partial<InsertResourcePlan>): Promise<ResourcePlan | undefined> {
    const result = await db.update(resourcePlans).set(data).where(eq(resourcePlans.id, id)).returning();
    return result[0];
  }

  async deleteResourcePlan(id: number): Promise<void> {
    await db.delete(resourcePlans).where(eq(resourcePlans.id, id));
  }

  // Timesheets
  async getTimesheets(): Promise<Timesheet[]> {
    return db.select().from(timesheets);
  }

  async getTimesheet(id: number): Promise<Timesheet | undefined> {
    const result = await db.select().from(timesheets).where(eq(timesheets.id, id));
    return result[0];
  }

  async getTimesheetsByProject(projectId: number): Promise<Timesheet[]> {
    return db.select().from(timesheets).where(eq(timesheets.projectId, projectId));
  }

  async getTimesheetsByEmployee(employeeId: number): Promise<Timesheet[]> {
    return db.select().from(timesheets).where(eq(timesheets.employeeId, employeeId));
  }

  async createTimesheet(data: InsertTimesheet): Promise<Timesheet> {
    const result = await db.insert(timesheets).values(data).returning();
    return result[0];
  }

  async updateTimesheet(id: number, data: Partial<InsertTimesheet>): Promise<Timesheet | undefined> {
    const result = await db.update(timesheets).set(data).where(eq(timesheets.id, id)).returning();
    return result[0];
  }

  async deleteTimesheet(id: number): Promise<void> {
    await db.delete(timesheets).where(eq(timesheets.id, id));
  }

  // Costs
  async getCosts(): Promise<Cost[]> {
    return db.select().from(costs);
  }

  async getCost(id: number): Promise<Cost | undefined> {
    const result = await db.select().from(costs).where(eq(costs.id, id));
    return result[0];
  }

  async getCostsByProject(projectId: number): Promise<Cost[]> {
    return db.select().from(costs).where(eq(costs.projectId, projectId));
  }

  async getCostsByCategory(category: string): Promise<Cost[]> {
    return db.select().from(costs).where(eq(costs.category, category));
  }

  async createCost(data: InsertCost): Promise<Cost> {
    const result = await db.insert(costs).values(data).returning();
    return result[0];
  }

  async updateCost(id: number, data: Partial<InsertCost>): Promise<Cost | undefined> {
    const result = await db.update(costs).set(data).where(eq(costs.id, id)).returning();
    return result[0];
  }

  async deleteCost(id: number): Promise<void> {
    await db.delete(costs).where(eq(costs.id, id));
  }

  // KPIs
  async getKpis(): Promise<Kpi[]> {
    return db.select().from(kpis);
  }

  async getKpi(id: number): Promise<Kpi | undefined> {
    const result = await db.select().from(kpis).where(eq(kpis.id, id));
    return result[0];
  }

  async getKpisByProject(projectId: number): Promise<Kpi[]> {
    return db.select().from(kpis).where(eq(kpis.projectId, projectId));
  }

  async createKpi(data: InsertKpi): Promise<Kpi> {
    const result = await db.insert(kpis).values(data).returning();
    return result[0];
  }

  async updateKpi(id: number, data: Partial<InsertKpi>): Promise<Kpi | undefined> {
    const result = await db.update(kpis).set(data).where(eq(kpis.id, id)).returning();
    return result[0];
  }

  async deleteKpi(id: number): Promise<void> {
    await db.delete(kpis).where(eq(kpis.id, id));
  }

  // Forecasts
  async getForecasts(): Promise<Forecast[]> {
    return db.select().from(forecasts);
  }

  async getForecast(id: number): Promise<Forecast | undefined> {
    const result = await db.select().from(forecasts).where(eq(forecasts.id, id));
    return result[0];
  }

  async getForecastsByProject(projectId: number): Promise<Forecast[]> {
    return db.select().from(forecasts).where(eq(forecasts.projectId, projectId));
  }

  async createForecast(data: InsertForecast): Promise<Forecast> {
    const result = await db.insert(forecasts).values(data).returning();
    return result[0];
  }

  async updateForecast(id: number, data: Partial<InsertForecast>): Promise<Forecast | undefined> {
    const result = await db.update(forecasts).set(data).where(eq(forecasts.id, id)).returning();
    return result[0];
  }

  async deleteForecast(id: number): Promise<void> {
    await db.delete(forecasts).where(eq(forecasts.id, id));
  }

  // Milestones
  async getMilestones(): Promise<Milestone[]> {
    return db.select().from(milestones);
  }

  async getMilestone(id: number): Promise<Milestone | undefined> {
    const result = await db.select().from(milestones).where(eq(milestones.id, id));
    return result[0];
  }

  async getMilestonesByProject(projectId: number): Promise<Milestone[]> {
    return db.select().from(milestones).where(eq(milestones.projectId, projectId));
  }

  async createMilestone(data: InsertMilestone): Promise<Milestone> {
    const result = await db.insert(milestones).values(data).returning();
    return result[0];
  }

  async updateMilestone(id: number, data: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    const result = await db.update(milestones).set(data).where(eq(milestones.id, id)).returning();
    return result[0];
  }

  async deleteMilestone(id: number): Promise<void> {
    await db.delete(milestones).where(eq(milestones.id, id));
  }

  // Data Sources
  async getDataSources(): Promise<DataSource[]> {
    return db.select().from(dataSources);
  }

  async getDataSource(id: number): Promise<DataSource | undefined> {
    const result = await db.select().from(dataSources).where(eq(dataSources.id, id));
    return result[0];
  }

  async createDataSource(data: InsertDataSource): Promise<DataSource> {
    const result = await db.insert(dataSources).values(data).returning();
    return result[0];
  }

  async updateDataSource(id: number, data: Partial<InsertDataSource>): Promise<DataSource | undefined> {
    const result = await db.update(dataSources).set(data).where(eq(dataSources.id, id)).returning();
    return result[0];
  }

  async deleteDataSource(id: number): Promise<void> {
    await db.delete(dataSources).where(eq(dataSources.id, id));
  }

  // Onboarding Steps
  async getOnboardingSteps(): Promise<OnboardingStep[]> {
    return db.select().from(onboardingSteps);
  }

  async getOnboardingStep(id: number): Promise<OnboardingStep | undefined> {
    const result = await db.select().from(onboardingSteps).where(eq(onboardingSteps.id, id));
    return result[0];
  }

  async getOnboardingStepsByEmployee(employeeId: number): Promise<OnboardingStep[]> {
    return db.select().from(onboardingSteps).where(eq(onboardingSteps.employeeId, employeeId));
  }

  async createOnboardingStep(data: InsertOnboardingStep): Promise<OnboardingStep> {
    const result = await db.insert(onboardingSteps).values(data).returning();
    return result[0];
  }

  async updateOnboardingStep(id: number, data: Partial<InsertOnboardingStep>): Promise<OnboardingStep | undefined> {
    const result = await db.update(onboardingSteps).set(data).where(eq(onboardingSteps.id, id)).returning();
    return result[0];
  }

  async deleteOnboardingStep(id: number): Promise<void> {
    await db.delete(onboardingSteps).where(eq(onboardingSteps.id, id));
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(data: InsertUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  }

  // Project Monthly
  async getProjectMonthly(): Promise<ProjectMonthly[]> {
    return db.select().from(projectMonthly);
  }

  async getProjectMonthlyByProject(projectId: number): Promise<ProjectMonthly[]> {
    return db.select().from(projectMonthly).where(eq(projectMonthly.projectId, projectId));
  }

  async createProjectMonthly(data: InsertProjectMonthly): Promise<ProjectMonthly> {
    const result = await db.insert(projectMonthly).values(data).returning();
    return result[0];
  }

  async deleteProjectMonthly(id: number): Promise<void> {
    await db.delete(projectMonthly).where(eq(projectMonthly.id, id));
  }

  // Pipeline Opportunities
  async getPipelineOpportunities(): Promise<PipelineOpportunity[]> {
    return db.select().from(pipelineOpportunities);
  }

  async getPipelineOpportunity(id: number): Promise<PipelineOpportunity | undefined> {
    const result = await db.select().from(pipelineOpportunities).where(eq(pipelineOpportunities.id, id));
    return result[0];
  }

  async getPipelineByClassification(classification: string): Promise<PipelineOpportunity[]> {
    return db.select().from(pipelineOpportunities).where(eq(pipelineOpportunities.classification, classification));
  }

  async getPipelineByVat(vat: string): Promise<PipelineOpportunity[]> {
    return db.select().from(pipelineOpportunities).where(eq(pipelineOpportunities.vat, vat));
  }

  async createPipelineOpportunity(data: InsertPipelineOpportunity): Promise<PipelineOpportunity> {
    const result = await db.insert(pipelineOpportunities).values(data).returning();
    return result[0];
  }

  async deletePipelineOpportunity(id: number): Promise<void> {
    await db.delete(pipelineOpportunities).where(eq(pipelineOpportunities.id, id));
  }

  // Scenarios
  async getScenarios(): Promise<Scenario[]> {
    return db.select().from(scenarios);
  }

  async getScenario(id: number): Promise<Scenario | undefined> {
    const result = await db.select().from(scenarios).where(eq(scenarios.id, id));
    return result[0];
  }

  async getScenarioWithAdjustments(id: number): Promise<{ scenario: Scenario; adjustments: ScenarioAdjustment[] } | undefined> {
    const scenario = await this.getScenario(id);
    if (!scenario) return undefined;
    const adjustments = await db.select().from(scenarioAdjustments).where(eq(scenarioAdjustments.scenarioId, id));
    return { scenario, adjustments };
  }

  async createScenario(data: InsertScenario): Promise<Scenario> {
    const result = await db.insert(scenarios).values(data).returning();
    return result[0];
  }

  async deleteScenario(id: number): Promise<void> {
    await db.delete(scenarios).where(eq(scenarios.id, id));
  }

  // Scenario Adjustments
  async getScenarioAdjustments(scenarioId: number): Promise<ScenarioAdjustment[]> {
    return db.select().from(scenarioAdjustments).where(eq(scenarioAdjustments.scenarioId, scenarioId));
  }

  async createScenarioAdjustment(data: InsertScenarioAdjustment): Promise<ScenarioAdjustment> {
    const result = await db.insert(scenarioAdjustments).values(data).returning();
    return result[0];
  }

  async deleteScenarioAdjustment(id: number): Promise<void> {
    await db.delete(scenarioAdjustments).where(eq(scenarioAdjustments.id, id));
  }

  // Dashboard / Aggregates
  async getDashboardSummary(): Promise<{
    totalProjects: number;
    totalEmployees: number;
    totalRevenue: number;
    totalCosts: number;
  }> {
    const [projectCount] = await db.select({ value: count() }).from(projects);
    const [employeeCount] = await db.select({ value: count() }).from(employees);
    const [revenueSum] = await db
      .select({ value: sum(kpis.revenue) })
      .from(kpis);
    const [costSum] = await db
      .select({ value: sum(costs.amount) })
      .from(costs);

    return {
      totalProjects: projectCount.value,
      totalEmployees: employeeCount.value,
      totalRevenue: Number(revenueSum.value) || 0,
      totalCosts: Number(costSum.value) || 0,
    };
  }

  async getProjectSummary(projectId: number): Promise<{
    project: Project;
    totalRevenue: number;
    totalCosts: number;
    avgMarginPercent: number;
    avgUtilization: number;
  } | undefined> {
    const project = await this.getProject(projectId);
    if (!project) return undefined;

    const [revenueResult] = await db
      .select({ value: sum(kpis.revenue) })
      .from(kpis)
      .where(eq(kpis.projectId, projectId));

    const [costResult] = await db
      .select({ value: sum(costs.amount) })
      .from(costs)
      .where(eq(costs.projectId, projectId));

    const [marginResult] = await db
      .select({ value: sql<string>`avg(${kpis.marginPercent})` })
      .from(kpis)
      .where(eq(kpis.projectId, projectId));

    const [utilResult] = await db
      .select({ value: sql<string>`avg(${kpis.utilization})` })
      .from(kpis)
      .where(eq(kpis.projectId, projectId));

    return {
      project,
      totalRevenue: Number(revenueResult.value) || 0,
      totalCosts: Number(costResult.value) || 0,
      avgMarginPercent: Number(marginResult.value) || 0,
      avgUtilization: Number(utilResult.value) || 0,
    };
  }

  async getFinanceDashboard(): Promise<{
    month: string;
    revenue: number;
    cost: number;
  }[]> {
    const revenueByMonth = await db
      .select({
        month: kpis.month,
        revenue: sum(kpis.revenue),
      })
      .from(kpis)
      .groupBy(kpis.month)
      .orderBy(kpis.month);

    const costByMonth = await db
      .select({
        month: costs.month,
        cost: sum(costs.amount),
      })
      .from(costs)
      .groupBy(costs.month)
      .orderBy(costs.month);

    const monthMap = new Map<string, { revenue: number; cost: number }>();

    for (const row of revenueByMonth) {
      monthMap.set(row.month, {
        revenue: Number(row.revenue) || 0,
        cost: 0,
      });
    }

    for (const row of costByMonth) {
      const existing = monthMap.get(row.month) || { revenue: 0, cost: 0 };
      existing.cost = Number(row.cost) || 0;
      monthMap.set(row.month, existing);
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        cost: data.cost,
      }));
  }

  async getUtilizationSummary(): Promise<{
    employeeId: number;
    totalPlannedHours: number;
    totalActualHours: number;
    utilization: number;
  }[]> {
    const planned = await db
      .select({
        employeeId: resourcePlans.employeeId,
        totalPlannedHours: sum(resourcePlans.plannedHours),
      })
      .from(resourcePlans)
      .groupBy(resourcePlans.employeeId);

    const actual = await db
      .select({
        employeeId: timesheets.employeeId,
        totalActualHours: sum(timesheets.hoursWorked),
      })
      .from(timesheets)
      .groupBy(timesheets.employeeId);

    const actualMap = new Map<number, number>();
    for (const row of actual) {
      actualMap.set(row.employeeId, Number(row.totalActualHours) || 0);
    }

    return planned.map((row) => {
      const totalPlanned = Number(row.totalPlannedHours) || 0;
      const totalActual = actualMap.get(row.employeeId) || 0;
      return {
        employeeId: row.employeeId,
        totalPlannedHours: totalPlanned,
        totalActualHours: totalActual,
        utilization: totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0,
      };
    });
  }
}

export const storage = new DatabaseStorage();
