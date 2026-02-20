import { db, isMSSQL } from "./db";
import {
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
  type ReferenceData,
  type InsertReferenceData,
  type CxRating,
  type InsertCxRating,
  type ResourceCost,
  type InsertResourceCost,
} from "@shared/schema";

const EMPLOYEE_FIELD_MAP_TO_DB: Record<string, string> = {
  grossCost: "gross_cost_rate",
};
const EMPLOYEE_FIELD_MAP_FROM_DB: Record<string, string> = {
  gross_cost_rate: "grossCost",
};

function toSnakeCase(obj: Record<string, any>, table?: string): Record<string, any> {
  const fieldMap = table === "employees" ? EMPLOYEE_FIELD_MAP_TO_DB : {};
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const mappedKey = fieldMap[key];
    const snakeKey = mappedKey || key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

function toCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const mappedKey = EMPLOYEE_FIELD_MAP_FROM_DB[key];
    const camelKey = mappedKey || key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value === null ? null : value;
  }
  return result;
}

function rowToModel<T>(row: Record<string, any>): T {
  const camel = toCamelCase(row);
  for (const key of Object.keys(camel)) {
    const val = camel[key];
    if (val !== null && val !== undefined) {
      if (typeof val === "number" && !Number.isInteger(val) && key !== "id" && !key.endsWith("Id") && key !== "month" && key !== "stepOrder" && key !== "recordsProcessed" && key !== "startMonthShift" && key !== "fyMonth") {
        camel[key] = val.toString();
      }
      if (val instanceof Date && key !== "createdAt" && key !== "completedAt" && key !== "lastSyncAt") {
        camel[key] = val.toISOString().split("T")[0];
      }
    }
  }
  return camel as T;
}

function rowsToModels<T>(rows: Record<string, any>[]): T[] {
  return rows.map((r) => rowToModel<T>(r));
}

const DATE_COLUMNS = new Set([
  "start_date", "end_date", "schedule_start", "schedule_end",
  "check_point_date", "month", "week_ending", "effective_from", "effective_to",
  "due_date", "start_date_str", "expiry_date", "completed_at",
]);

function sanitizeDateFields(data: Record<string, any>): Record<string, any> {
  for (const key of Object.keys(data)) {
    if (DATE_COLUMNS.has(key)) {
      const val = data[key];
      if (val === null || val === "" || val === undefined || val === "N/A" || val === "-" || val === "n/a") {
        data[key] = null;
      } else if (typeof val === "string") {
        const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
          if (isMSSQL) {
            data[key] = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
          }
        } else {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            if (isMSSQL) {
              data[key] = d;
            } else {
              data[key] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            }
          } else {
            data[key] = null;
          }
        }
      } else if (typeof val === "number") {
        data[key] = null;
      }
    }
  }
  return data;
}

async function insertReturning<T>(table: string, data: Record<string, any>): Promise<T> {
  const snakeData = sanitizeDateFields(toSnakeCase(data, table));
  delete snakeData.id;
  try {
    const [row] = await db(table).insert(snakeData).returning("*");
    return rowToModel<T>(row);
  } catch (err: any) {
    if (err.message && err.message.includes("date")) {
      const dateFields: Record<string, any> = {};
      for (const [k, v] of Object.entries(snakeData)) {
        if (v !== null && v !== undefined && (DATE_COLUMNS.has(k) || typeof v === "string")) {
          dateFields[k] = { value: v, type: typeof v };
        }
      }
      console.error(`[insertReturning] ${table} date error. Fields:`, JSON.stringify(dateFields));
    }
    throw err;
  }
}

async function updateReturning<T>(table: string, id: number, data: Record<string, any>): Promise<T | undefined> {
  const snakeData = sanitizeDateFields(toSnakeCase(data, table));
  delete snakeData.id;
  const [row] = await db(table).where("id", id).update(snakeData).returning("*");
  if (!row) return undefined;
  return rowToModel<T>(row);
}

export interface IStorage {
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeesByStatus(status: string): Promise<Employee[]>;
  createEmployee(data: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<void>;

  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByStatus(status: string): Promise<Project[]>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;

  getRateCards(): Promise<RateCard[]>;
  getRateCard(id: number): Promise<RateCard | undefined>;
  getRateCardsByRole(role: string): Promise<RateCard[]>;
  getRateCardsByGrade(grade: string): Promise<RateCard[]>;
  createRateCard(data: InsertRateCard): Promise<RateCard>;
  updateRateCard(id: number, data: Partial<InsertRateCard>): Promise<RateCard | undefined>;
  deleteRateCard(id: number): Promise<void>;

  getResourcePlans(): Promise<ResourcePlan[]>;
  getResourcePlan(id: number): Promise<ResourcePlan | undefined>;
  getResourcePlansByProject(projectId: number): Promise<ResourcePlan[]>;
  getResourcePlansByEmployee(employeeId: number): Promise<ResourcePlan[]>;
  createResourcePlan(data: InsertResourcePlan): Promise<ResourcePlan>;
  updateResourcePlan(id: number, data: Partial<InsertResourcePlan>): Promise<ResourcePlan | undefined>;
  deleteResourcePlan(id: number): Promise<void>;

  getTimesheets(): Promise<Timesheet[]>;
  getTimesheet(id: number): Promise<Timesheet | undefined>;
  getTimesheetsByProject(projectId: number): Promise<Timesheet[]>;
  getTimesheetsByEmployee(employeeId: number): Promise<Timesheet[]>;
  createTimesheet(data: InsertTimesheet): Promise<Timesheet>;
  updateTimesheet(id: number, data: Partial<InsertTimesheet>): Promise<Timesheet | undefined>;
  deleteTimesheet(id: number): Promise<void>;

  getCosts(): Promise<Cost[]>;
  getCost(id: number): Promise<Cost | undefined>;
  getCostsByProject(projectId: number): Promise<Cost[]>;
  getCostsByCategory(category: string): Promise<Cost[]>;
  createCost(data: InsertCost): Promise<Cost>;
  updateCost(id: number, data: Partial<InsertCost>): Promise<Cost | undefined>;
  deleteCost(id: number): Promise<void>;

  getKpis(): Promise<Kpi[]>;
  getKpi(id: number): Promise<Kpi | undefined>;
  getKpisByProject(projectId: number): Promise<Kpi[]>;
  createKpi(data: InsertKpi): Promise<Kpi>;
  updateKpi(id: number, data: Partial<InsertKpi>): Promise<Kpi | undefined>;
  deleteKpi(id: number): Promise<void>;

  getForecasts(): Promise<Forecast[]>;
  getForecast(id: number): Promise<Forecast | undefined>;
  getForecastsByProject(projectId: number): Promise<Forecast[]>;
  createForecast(data: InsertForecast): Promise<Forecast>;
  updateForecast(id: number, data: Partial<InsertForecast>): Promise<Forecast | undefined>;
  deleteForecast(id: number): Promise<void>;

  getMilestones(): Promise<Milestone[]>;
  getMilestone(id: number): Promise<Milestone | undefined>;
  getMilestonesByProject(projectId: number): Promise<Milestone[]>;
  createMilestone(data: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: number, data: Partial<InsertMilestone>): Promise<Milestone | undefined>;
  deleteMilestone(id: number): Promise<void>;

  getDataSources(): Promise<DataSource[]>;
  getDataSource(id: number): Promise<DataSource | undefined>;
  createDataSource(data: InsertDataSource): Promise<DataSource>;
  updateDataSource(id: number, data: Partial<InsertDataSource>): Promise<DataSource | undefined>;
  deleteDataSource(id: number): Promise<void>;

  getOnboardingSteps(): Promise<OnboardingStep[]>;
  getOnboardingStep(id: number): Promise<OnboardingStep | undefined>;
  getOnboardingStepsByEmployee(employeeId: number): Promise<OnboardingStep[]>;
  createOnboardingStep(data: InsertOnboardingStep): Promise<OnboardingStep>;
  updateOnboardingStep(id: number, data: Partial<InsertOnboardingStep>): Promise<OnboardingStep | undefined>;
  deleteOnboardingStep(id: number): Promise<void>;

  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;

  getProjectMonthly(): Promise<ProjectMonthly[]>;
  getProjectMonthlyByProject(projectId: number): Promise<ProjectMonthly[]>;
  createProjectMonthly(data: InsertProjectMonthly): Promise<ProjectMonthly>;
  deleteProjectMonthly(id: number): Promise<void>;

  getPipelineOpportunities(): Promise<PipelineOpportunity[]>;
  getPipelineOpportunity(id: number): Promise<PipelineOpportunity | undefined>;
  getPipelineByClassification(classification: string): Promise<PipelineOpportunity[]>;
  getPipelineByVat(vat: string): Promise<PipelineOpportunity[]>;
  createPipelineOpportunity(data: InsertPipelineOpportunity): Promise<PipelineOpportunity>;
  deletePipelineOpportunity(id: number): Promise<void>;

  getScenarios(): Promise<Scenario[]>;
  getScenario(id: number): Promise<Scenario | undefined>;
  getScenarioWithAdjustments(id: number): Promise<{ scenario: Scenario; adjustments: ScenarioAdjustment[] } | undefined>;
  createScenario(data: InsertScenario): Promise<Scenario>;
  deleteScenario(id: number): Promise<void>;

  getScenarioAdjustments(scenarioId: number): Promise<ScenarioAdjustment[]>;
  createScenarioAdjustment(data: InsertScenarioAdjustment): Promise<ScenarioAdjustment>;
  deleteScenarioAdjustment(id: number): Promise<void>;

  getReferenceData(): Promise<ReferenceData[]>;
  getReferenceDataByCategory(category: string): Promise<ReferenceData[]>;
  createReferenceData(data: InsertReferenceData): Promise<ReferenceData>;
  updateReferenceData(id: number, data: Partial<InsertReferenceData>): Promise<ReferenceData | undefined>;
  deleteReferenceData(id: number): Promise<void>;

  getCxRatings(): Promise<CxRating[]>;
  getCxRatingsByProject(projectId: number): Promise<CxRating[]>;
  createCxRating(data: InsertCxRating): Promise<CxRating>;
  deleteCxRating(id: number): Promise<void>;

  getResourceCosts(): Promise<ResourceCost[]>;
  getResourceCostsByEmployee(employeeId: number): Promise<ResourceCost[]>;
  getResourceCostsByPhase(phase: string): Promise<ResourceCost[]>;
  createResourceCost(data: InsertResourceCost): Promise<ResourceCost>;
  deleteResourceCost(id: number): Promise<void>;

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
  async getEmployees(): Promise<Employee[]> {
    return rowsToModels<Employee>(await db("employees").select("*"));
  }
  async getEmployee(id: number): Promise<Employee | undefined> {
    const row = await db("employees").where("id", id).first();
    return row ? rowToModel<Employee>(row) : undefined;
  }
  async getEmployeesByStatus(status: string): Promise<Employee[]> {
    return rowsToModels<Employee>(await db("employees").where("status", status));
  }
  async createEmployee(data: InsertEmployee): Promise<Employee> {
    return insertReturning<Employee>("employees", data);
  }
  async updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    return updateReturning<Employee>("employees", id, data);
  }
  async deleteEmployee(id: number): Promise<void> {
    await db("employees").where("id", id).del();
  }

  async getProjects(): Promise<Project[]> {
    return rowsToModels<Project>(await db("projects").select("*"));
  }
  async getProject(id: number): Promise<Project | undefined> {
    const row = await db("projects").where("id", id).first();
    return row ? rowToModel<Project>(row) : undefined;
  }
  async getProjectsByStatus(status: string): Promise<Project[]> {
    return rowsToModels<Project>(await db("projects").where("status", status));
  }
  async createProject(data: InsertProject): Promise<Project> {
    return insertReturning<Project>("projects", data);
  }
  async updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined> {
    return updateReturning<Project>("projects", id, data);
  }
  async deleteProject(id: number): Promise<void> {
    await db("projects").where("id", id).del();
  }

  async getRateCards(): Promise<RateCard[]> {
    return rowsToModels<RateCard>(await db("rate_cards").select("*"));
  }
  async getRateCard(id: number): Promise<RateCard | undefined> {
    const row = await db("rate_cards").where("id", id).first();
    return row ? rowToModel<RateCard>(row) : undefined;
  }
  async getRateCardsByRole(role: string): Promise<RateCard[]> {
    return rowsToModels<RateCard>(await db("rate_cards").where("role", role));
  }
  async getRateCardsByGrade(grade: string): Promise<RateCard[]> {
    return rowsToModels<RateCard>(await db("rate_cards").where("grade", grade));
  }
  async createRateCard(data: InsertRateCard): Promise<RateCard> {
    return insertReturning<RateCard>("rate_cards", data);
  }
  async updateRateCard(id: number, data: Partial<InsertRateCard>): Promise<RateCard | undefined> {
    return updateReturning<RateCard>("rate_cards", id, data);
  }
  async deleteRateCard(id: number): Promise<void> {
    await db("rate_cards").where("id", id).del();
  }

  async getResourcePlans(): Promise<ResourcePlan[]> {
    return rowsToModels<ResourcePlan>(await db("resource_plans").select("*"));
  }
  async getResourcePlan(id: number): Promise<ResourcePlan | undefined> {
    const row = await db("resource_plans").where("id", id).first();
    return row ? rowToModel<ResourcePlan>(row) : undefined;
  }
  async getResourcePlansByProject(projectId: number): Promise<ResourcePlan[]> {
    return rowsToModels<ResourcePlan>(await db("resource_plans").where("project_id", projectId));
  }
  async getResourcePlansByEmployee(employeeId: number): Promise<ResourcePlan[]> {
    return rowsToModels<ResourcePlan>(await db("resource_plans").where("employee_id", employeeId));
  }
  async createResourcePlan(data: InsertResourcePlan): Promise<ResourcePlan> {
    return insertReturning<ResourcePlan>("resource_plans", data);
  }
  async updateResourcePlan(id: number, data: Partial<InsertResourcePlan>): Promise<ResourcePlan | undefined> {
    return updateReturning<ResourcePlan>("resource_plans", id, data);
  }
  async deleteResourcePlan(id: number): Promise<void> {
    await db("resource_plans").where("id", id).del();
  }

  async getTimesheets(): Promise<Timesheet[]> {
    return rowsToModels<Timesheet>(await db("timesheets").select("*"));
  }
  async getTimesheet(id: number): Promise<Timesheet | undefined> {
    const row = await db("timesheets").where("id", id).first();
    return row ? rowToModel<Timesheet>(row) : undefined;
  }
  async getTimesheetsByProject(projectId: number): Promise<Timesheet[]> {
    return rowsToModels<Timesheet>(await db("timesheets").where("project_id", projectId));
  }
  async getTimesheetsByEmployee(employeeId: number): Promise<Timesheet[]> {
    return rowsToModels<Timesheet>(await db("timesheets").where("employee_id", employeeId));
  }
  async createTimesheet(data: InsertTimesheet): Promise<Timesheet> {
    return insertReturning<Timesheet>("timesheets", data);
  }
  async updateTimesheet(id: number, data: Partial<InsertTimesheet>): Promise<Timesheet | undefined> {
    return updateReturning<Timesheet>("timesheets", id, data);
  }
  async deleteTimesheet(id: number): Promise<void> {
    await db("timesheets").where("id", id).del();
  }

  async getCosts(): Promise<Cost[]> {
    return rowsToModels<Cost>(await db("costs").select("*"));
  }
  async getCost(id: number): Promise<Cost | undefined> {
    const row = await db("costs").where("id", id).first();
    return row ? rowToModel<Cost>(row) : undefined;
  }
  async getCostsByProject(projectId: number): Promise<Cost[]> {
    return rowsToModels<Cost>(await db("costs").where("project_id", projectId));
  }
  async getCostsByCategory(category: string): Promise<Cost[]> {
    return rowsToModels<Cost>(await db("costs").where("category", category));
  }
  async createCost(data: InsertCost): Promise<Cost> {
    return insertReturning<Cost>("costs", data);
  }
  async updateCost(id: number, data: Partial<InsertCost>): Promise<Cost | undefined> {
    return updateReturning<Cost>("costs", id, data);
  }
  async deleteCost(id: number): Promise<void> {
    await db("costs").where("id", id).del();
  }

  async getKpis(): Promise<Kpi[]> {
    return rowsToModels<Kpi>(await db("kpis").select("*"));
  }
  async getKpi(id: number): Promise<Kpi | undefined> {
    const row = await db("kpis").where("id", id).first();
    return row ? rowToModel<Kpi>(row) : undefined;
  }
  async getKpisByProject(projectId: number): Promise<Kpi[]> {
    return rowsToModels<Kpi>(await db("kpis").where("project_id", projectId));
  }
  async createKpi(data: InsertKpi): Promise<Kpi> {
    return insertReturning<Kpi>("kpis", data);
  }
  async updateKpi(id: number, data: Partial<InsertKpi>): Promise<Kpi | undefined> {
    return updateReturning<Kpi>("kpis", id, data);
  }
  async deleteKpi(id: number): Promise<void> {
    await db("kpis").where("id", id).del();
  }

  async getForecasts(): Promise<Forecast[]> {
    return rowsToModels<Forecast>(await db("forecasts").select("*"));
  }
  async getForecast(id: number): Promise<Forecast | undefined> {
    const row = await db("forecasts").where("id", id).first();
    return row ? rowToModel<Forecast>(row) : undefined;
  }
  async getForecastsByProject(projectId: number): Promise<Forecast[]> {
    return rowsToModels<Forecast>(await db("forecasts").where("project_id", projectId));
  }
  async createForecast(data: InsertForecast): Promise<Forecast> {
    return insertReturning<Forecast>("forecasts", data);
  }
  async updateForecast(id: number, data: Partial<InsertForecast>): Promise<Forecast | undefined> {
    return updateReturning<Forecast>("forecasts", id, data);
  }
  async deleteForecast(id: number): Promise<void> {
    await db("forecasts").where("id", id).del();
  }

  async getMilestones(): Promise<Milestone[]> {
    return rowsToModels<Milestone>(await db("milestones").select("*"));
  }
  async getMilestone(id: number): Promise<Milestone | undefined> {
    const row = await db("milestones").where("id", id).first();
    return row ? rowToModel<Milestone>(row) : undefined;
  }
  async getMilestonesByProject(projectId: number): Promise<Milestone[]> {
    return rowsToModels<Milestone>(await db("milestones").where("project_id", projectId));
  }
  async createMilestone(data: InsertMilestone): Promise<Milestone> {
    return insertReturning<Milestone>("milestones", data);
  }
  async updateMilestone(id: number, data: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    return updateReturning<Milestone>("milestones", id, data);
  }
  async deleteMilestone(id: number): Promise<void> {
    await db("milestones").where("id", id).del();
  }

  async getDataSources(): Promise<DataSource[]> {
    return rowsToModels<DataSource>(await db("data_sources").select("*"));
  }
  async getDataSource(id: number): Promise<DataSource | undefined> {
    const row = await db("data_sources").where("id", id).first();
    return row ? rowToModel<DataSource>(row) : undefined;
  }
  async createDataSource(data: InsertDataSource): Promise<DataSource> {
    return insertReturning<DataSource>("data_sources", data);
  }
  async updateDataSource(id: number, data: Partial<InsertDataSource>): Promise<DataSource | undefined> {
    return updateReturning<DataSource>("data_sources", id, data);
  }
  async deleteDataSource(id: number): Promise<void> {
    await db("data_sources").where("id", id).del();
  }

  async getOnboardingSteps(): Promise<OnboardingStep[]> {
    return rowsToModels<OnboardingStep>(await db("onboarding_steps").select("*"));
  }
  async getOnboardingStep(id: number): Promise<OnboardingStep | undefined> {
    const row = await db("onboarding_steps").where("id", id).first();
    return row ? rowToModel<OnboardingStep>(row) : undefined;
  }
  async getOnboardingStepsByEmployee(employeeId: number): Promise<OnboardingStep[]> {
    return rowsToModels<OnboardingStep>(await db("onboarding_steps").where("employee_id", employeeId));
  }
  async createOnboardingStep(data: InsertOnboardingStep): Promise<OnboardingStep> {
    return insertReturning<OnboardingStep>("onboarding_steps", data);
  }
  async updateOnboardingStep(id: number, data: Partial<InsertOnboardingStep>): Promise<OnboardingStep | undefined> {
    return updateReturning<OnboardingStep>("onboarding_steps", id, data);
  }
  async deleteOnboardingStep(id: number): Promise<void> {
    await db("onboarding_steps").where("id", id).del();
  }

  async getUser(id: number): Promise<User | undefined> {
    const row = await db("users").where("id", id).first();
    return row ? rowToModel<User>(row) : undefined;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const row = await db("users").where("username", username).first();
    return row ? rowToModel<User>(row) : undefined;
  }
  async createUser(data: InsertUser): Promise<User> {
    return insertReturning<User>("users", data);
  }

  async getProjectMonthly(): Promise<ProjectMonthly[]> {
    return rowsToModels<ProjectMonthly>(await db("project_monthly").select("*"));
  }
  async getProjectMonthlyByProject(projectId: number): Promise<ProjectMonthly[]> {
    return rowsToModels<ProjectMonthly>(await db("project_monthly").where("project_id", projectId));
  }
  async createProjectMonthly(data: InsertProjectMonthly): Promise<ProjectMonthly> {
    return insertReturning<ProjectMonthly>("project_monthly", data);
  }
  async deleteProjectMonthly(id: number): Promise<void> {
    await db("project_monthly").where("id", id).del();
  }

  async getPipelineOpportunities(): Promise<PipelineOpportunity[]> {
    return rowsToModels<PipelineOpportunity>(await db("pipeline_opportunities").select("*"));
  }
  async getPipelineOpportunity(id: number): Promise<PipelineOpportunity | undefined> {
    const row = await db("pipeline_opportunities").where("id", id).first();
    return row ? rowToModel<PipelineOpportunity>(row) : undefined;
  }
  async getPipelineByClassification(classification: string): Promise<PipelineOpportunity[]> {
    return rowsToModels<PipelineOpportunity>(await db("pipeline_opportunities").where("classification", classification));
  }
  async getPipelineByVat(vat: string): Promise<PipelineOpportunity[]> {
    return rowsToModels<PipelineOpportunity>(await db("pipeline_opportunities").where("vat", vat));
  }
  async createPipelineOpportunity(data: InsertPipelineOpportunity): Promise<PipelineOpportunity> {
    return insertReturning<PipelineOpportunity>("pipeline_opportunities", data);
  }
  async deletePipelineOpportunity(id: number): Promise<void> {
    await db("pipeline_opportunities").where("id", id).del();
  }

  async getScenarios(): Promise<Scenario[]> {
    return rowsToModels<Scenario>(await db("scenarios").select("*"));
  }
  async getScenario(id: number): Promise<Scenario | undefined> {
    const row = await db("scenarios").where("id", id).first();
    return row ? rowToModel<Scenario>(row) : undefined;
  }
  async getScenarioWithAdjustments(id: number): Promise<{ scenario: Scenario; adjustments: ScenarioAdjustment[] } | undefined> {
    const scenario = await this.getScenario(id);
    if (!scenario) return undefined;
    const adjustments = rowsToModels<ScenarioAdjustment>(await db("scenario_adjustments").where("scenario_id", id));
    return { scenario, adjustments };
  }
  async createScenario(data: InsertScenario): Promise<Scenario> {
    return insertReturning<Scenario>("scenarios", data);
  }
  async deleteScenario(id: number): Promise<void> {
    await db("scenarios").where("id", id).del();
  }

  async getScenarioAdjustments(scenarioId: number): Promise<ScenarioAdjustment[]> {
    return rowsToModels<ScenarioAdjustment>(await db("scenario_adjustments").where("scenario_id", scenarioId));
  }
  async createScenarioAdjustment(data: InsertScenarioAdjustment): Promise<ScenarioAdjustment> {
    return insertReturning<ScenarioAdjustment>("scenario_adjustments", data);
  }
  async deleteScenarioAdjustment(id: number): Promise<void> {
    await db("scenario_adjustments").where("id", id).del();
  }

  async getReferenceData(): Promise<ReferenceData[]> {
    return rowsToModels<ReferenceData>(await db("reference_data").select("*").orderBy("category").orderBy("display_order"));
  }
  async getReferenceDataByCategory(category: string): Promise<ReferenceData[]> {
    return rowsToModels<ReferenceData>(await db("reference_data").where("category", category).orderBy("display_order"));
  }
  async createReferenceData(data: InsertReferenceData): Promise<ReferenceData> {
    return insertReturning<ReferenceData>("reference_data", data);
  }
  async updateReferenceData(id: number, data: Partial<InsertReferenceData>): Promise<ReferenceData | undefined> {
    return updateReturning<ReferenceData>("reference_data", id, data);
  }
  async deleteReferenceData(id: number): Promise<void> {
    await db("reference_data").where("id", id).del();
  }

  async getCxRatings(): Promise<CxRating[]> {
    return rowsToModels<CxRating>(await db("cx_ratings").select("*"));
  }
  async getCxRatingsByProject(projectId: number): Promise<CxRating[]> {
    return rowsToModels<CxRating>(await db("cx_ratings").where("project_id", projectId));
  }
  async createCxRating(data: InsertCxRating): Promise<CxRating> {
    return insertReturning<CxRating>("cx_ratings", data);
  }
  async deleteCxRating(id: number): Promise<void> {
    await db("cx_ratings").where("id", id).del();
  }

  async getResourceCosts(): Promise<ResourceCost[]> {
    return rowsToModels<ResourceCost>(await db("resource_costs").select("*"));
  }
  async getResourceCostsByEmployee(employeeId: number): Promise<ResourceCost[]> {
    return rowsToModels<ResourceCost>(await db("resource_costs").where("employee_id", employeeId));
  }
  async getResourceCostsByPhase(phase: string): Promise<ResourceCost[]> {
    return rowsToModels<ResourceCost>(await db("resource_costs").where("cost_phase", phase));
  }
  async createResourceCost(data: InsertResourceCost): Promise<ResourceCost> {
    return insertReturning<ResourceCost>("resource_costs", data);
  }
  async deleteResourceCost(id: number): Promise<void> {
    await db("resource_costs").where("id", id).del();
  }

  async getDashboardSummary(): Promise<{
    totalProjects: number;
    totalEmployees: number;
    totalRevenue: number;
    totalCosts: number;
  }> {
    const [{ count: projectCount }] = await db("projects").count("* as count");
    const [{ count: employeeCount }] = await db("employees").count("* as count");
    const [{ total: revenueSum }] = await db("kpis").sum("revenue as total");
    const [{ total: costSum }] = await db("costs").sum("amount as total");

    return {
      totalProjects: Number(projectCount) || 0,
      totalEmployees: Number(employeeCount) || 0,
      totalRevenue: Number(revenueSum) || 0,
      totalCosts: Number(costSum) || 0,
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

    const [{ total: revenueResult }] = await db("kpis").where("project_id", projectId).sum("revenue as total");
    const [{ total: costResult }] = await db("costs").where("project_id", projectId).sum("amount as total");
    const [{ avg: marginResult }] = await db("kpis").where("project_id", projectId).avg("margin_percent as avg");
    const [{ avg: utilResult }] = await db("kpis").where("project_id", projectId).avg("utilization as avg");

    return {
      project,
      totalRevenue: Number(revenueResult) || 0,
      totalCosts: Number(costResult) || 0,
      avgMarginPercent: Number(marginResult) || 0,
      avgUtilization: Number(utilResult) || 0,
    };
  }

  async getFinanceDashboard(): Promise<{
    month: string;
    revenue: number;
    cost: number;
  }[]> {
    const revenueByMonth = await db("kpis")
      .select("month")
      .sum("revenue as revenue")
      .groupBy("month")
      .orderBy("month");

    const costByMonth = await db("costs")
      .select("month")
      .sum("amount as cost")
      .groupBy("month")
      .orderBy("month");

    const monthMap = new Map<string, { revenue: number; cost: number }>();

    for (const row of revenueByMonth) {
      const m = row.month instanceof Date ? row.month.toISOString().split("T")[0] : String(row.month);
      monthMap.set(m, { revenue: Number(row.revenue) || 0, cost: 0 });
    }

    for (const row of costByMonth) {
      const m = row.month instanceof Date ? row.month.toISOString().split("T")[0] : String(row.month);
      const existing = monthMap.get(m) || { revenue: 0, cost: 0 };
      existing.cost = Number(row.cost) || 0;
      monthMap.set(m, existing);
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, revenue: data.revenue, cost: data.cost }));
  }

  async getUtilizationSummary(): Promise<{
    employeeId: number;
    totalPlannedHours: number;
    totalActualHours: number;
    utilization: number;
  }[]> {
    const planned = await db("resource_plans")
      .select("employee_id")
      .sum("planned_hours as total_planned_hours")
      .groupBy("employee_id");

    const actual = await db("timesheets")
      .select("employee_id")
      .sum("hours_worked as total_actual_hours")
      .groupBy("employee_id");

    const actualMap = new Map<number, number>();
    for (const row of actual) {
      actualMap.set(row.employee_id, Number(row.total_actual_hours) || 0);
    }

    return planned.map((row: any) => {
      const totalPlanned = Number(row.total_planned_hours) || 0;
      const totalActual = actualMap.get(row.employee_id) || 0;
      return {
        employeeId: row.employee_id,
        totalPlannedHours: totalPlanned,
        totalActualHours: totalActual,
        utilization: totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0,
      };
    });
  }
}

export const storage = new DatabaseStorage();
