import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean, date, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeCode: varchar("employee_code", { length: 50 }).notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  role: text("role"),
  costBandLevel: text("cost_band_level"),
  staffType: text("staff_type"),
  grade: text("grade"),
  location: text("location"),
  costCenter: text("cost_center"),
  securityClearance: text("security_clearance"),
  payrollTax: boolean("payroll_tax").default(false),
  payrollTaxRate: numeric("payroll_tax_rate", { precision: 5, scale: 4 }),
  baseCost: numeric("base_cost", { precision: 10, scale: 2 }),
  grossCost: numeric("gross_cost_rate", { precision: 10, scale: 2 }),
  baseSalary: numeric("base_salary", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("active"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  scheduleStart: date("schedule_start"),
  scheduleEnd: date("schedule_end"),
  resourceGroup: text("resource_group"),
  team: text("team"),
  jid: text("jid"),
  onboardingStatus: text("onboarding_status").default("not_started"),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  projectCode: varchar("project_code", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  client: text("client"),
  clientCode: text("client_code"),
  clientManager: text("client_manager"),
  engagementManager: text("engagement_manager"),
  engagementSupport: text("engagement_support"),
  contractType: text("contract_type"),
  billingCategory: text("billing_category"),
  workType: text("work_type"),
  panel: text("panel"),
  recurring: text("recurring"),
  vat: text("vat"),
  pipelineStatus: text("pipeline_status").default("C"),
  adStatus: text("ad_status").default("Active"),
  status: text("status").notNull().default("active"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  workOrderAmount: numeric("work_order_amount", { precision: 14, scale: 2 }),
  budgetAmount: numeric("budget_amount", { precision: 14, scale: 2 }),
  contractValue: numeric("contract_value", { precision: 14, scale: 2 }),
  actualAmount: numeric("actual_amount", { precision: 14, scale: 2 }),
  balanceAmount: numeric("balance_amount", { precision: 14, scale: 2 }),
  forecastedRevenue: numeric("forecasted_revenue", { precision: 14, scale: 2 }),
  forecastedGrossCost: numeric("forecasted_gross_cost", { precision: 14, scale: 2 }),
  varianceAtCompletion: numeric("variance_at_completion", { precision: 14, scale: 2 }),
  variancePercent: numeric("variance_percent", { precision: 8, scale: 4 }),
  varianceToContractPercent: numeric("variance_to_contract_percent", { precision: 8, scale: 4 }),
  writeOff: numeric("write_off", { precision: 14, scale: 2 }),
  soldGmPercent: numeric("sold_gm_percent", { precision: 8, scale: 4 }),
  toDateGrossProfit: numeric("to_date_gross_profit", { precision: 14, scale: 2 }),
  toDateGmPercent: numeric("to_date_gm_percent", { precision: 8, scale: 4 }),
  gpAtCompletion: numeric("gp_at_completion", { precision: 14, scale: 2 }),
  forecastGmPercent: numeric("forecast_gm_percent", { precision: 8, scale: 4 }),
  opsCommentary: text("ops_commentary"),
  description: text("description"),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const projectMonthly = pgTable("project_monthly", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  fyYear: text("fy_year"),
  month: integer("month").notNull(),
  monthLabel: text("month_label"),
  revenue: numeric("revenue", { precision: 14, scale: 2 }).default("0"),
  cost: numeric("cost", { precision: 14, scale: 2 }).default("0"),
  profit: numeric("profit", { precision: 14, scale: 2 }).default("0"),
});

export const insertProjectMonthlySchema = createInsertSchema(projectMonthly).omit({ id: true });
export type InsertProjectMonthly = z.infer<typeof insertProjectMonthlySchema>;
export type ProjectMonthly = typeof projectMonthly.$inferSelect;

export const rateCards = pgTable("rate_cards", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  grade: text("grade"),
  location: text("location"),
  baseRate: numeric("base_rate", { precision: 10, scale: 2 }).notNull(),
  chargeRate: numeric("charge_rate", { precision: 10, scale: 2 }).notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  currency: text("currency").default("AUD"),
});

export const insertRateCardSchema = createInsertSchema(rateCards).omit({ id: true });
export type InsertRateCard = z.infer<typeof insertRateCardSchema>;
export type RateCard = typeof rateCards.$inferSelect;

export const resourcePlans = pgTable("resource_plans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  month: date("month").notNull(),
  plannedDays: numeric("planned_days", { precision: 5, scale: 1 }),
  plannedHours: numeric("planned_hours", { precision: 6, scale: 1 }),
  allocationPercent: numeric("allocation_percent", { precision: 5, scale: 2 }),
});

export const insertResourcePlanSchema = createInsertSchema(resourcePlans).omit({ id: true });
export type InsertResourcePlan = z.infer<typeof insertResourcePlanSchema>;
export type ResourcePlan = typeof resourcePlans.$inferSelect;

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  weekEnding: date("week_ending").notNull(),
  hoursWorked: numeric("hours_worked", { precision: 6, scale: 2 }).notNull(),
  saleValue: numeric("sale_value", { precision: 12, scale: 2 }),
  costValue: numeric("cost_value", { precision: 12, scale: 2 }),
  daysWorked: numeric("days_worked", { precision: 4, scale: 1 }),
  billable: boolean("billable").default(true),
  activityType: text("activity_type"),
  source: text("source").default("manual"),
  status: text("status").default("submitted"),
  fyMonth: integer("fy_month"),
  fyYear: text("fy_year"),
});

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({ id: true });
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type Timesheet = typeof timesheets.$inferSelect;

export const costs = pgTable("costs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  month: date("month").notNull(),
  costType: text("cost_type").notNull().default("resource"),
  source: text("source").default("calculated"),
});

export const insertCostSchema = createInsertSchema(costs).omit({ id: true });
export type InsertCost = z.infer<typeof insertCostSchema>;
export type Cost = typeof costs.$inferSelect;

export const kpis = pgTable("kpis", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  month: date("month").notNull(),
  revenue: numeric("revenue", { precision: 14, scale: 2 }),
  contractRate: numeric("contract_rate", { precision: 10, scale: 2 }),
  billedAmount: numeric("billed_amount", { precision: 14, scale: 2 }),
  unbilledAmount: numeric("unbilled_amount", { precision: 14, scale: 2 }),
  grossCost: numeric("gross_cost", { precision: 14, scale: 2 }),
  resourceCost: numeric("resource_cost", { precision: 14, scale: 2 }),
  rdCost: numeric("rd_cost", { precision: 14, scale: 2 }),
  margin: numeric("margin", { precision: 14, scale: 2 }),
  marginPercent: numeric("margin_percent", { precision: 5, scale: 2 }),
  burnRate: numeric("burn_rate", { precision: 14, scale: 2 }),
  utilization: numeric("utilization", { precision: 5, scale: 2 }),
});

export const insertKpiSchema = createInsertSchema(kpis).omit({ id: true });
export type InsertKpi = z.infer<typeof insertKpiSchema>;
export type Kpi = typeof kpis.$inferSelect;

export const pipelineOpportunities = pgTable("pipeline_opportunities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  classification: text("classification").notNull(),
  vat: text("vat"),
  fyYear: text("fy_year"),
  revenueM1: numeric("revenue_m1", { precision: 14, scale: 2 }).default("0"),
  revenueM2: numeric("revenue_m2", { precision: 14, scale: 2 }).default("0"),
  revenueM3: numeric("revenue_m3", { precision: 14, scale: 2 }).default("0"),
  revenueM4: numeric("revenue_m4", { precision: 14, scale: 2 }).default("0"),
  revenueM5: numeric("revenue_m5", { precision: 14, scale: 2 }).default("0"),
  revenueM6: numeric("revenue_m6", { precision: 14, scale: 2 }).default("0"),
  revenueM7: numeric("revenue_m7", { precision: 14, scale: 2 }).default("0"),
  revenueM8: numeric("revenue_m8", { precision: 14, scale: 2 }).default("0"),
  revenueM9: numeric("revenue_m9", { precision: 14, scale: 2 }).default("0"),
  revenueM10: numeric("revenue_m10", { precision: 14, scale: 2 }).default("0"),
  revenueM11: numeric("revenue_m11", { precision: 14, scale: 2 }).default("0"),
  revenueM12: numeric("revenue_m12", { precision: 14, scale: 2 }).default("0"),
  grossProfitM1: numeric("gross_profit_m1", { precision: 14, scale: 2 }).default("0"),
  grossProfitM2: numeric("gross_profit_m2", { precision: 14, scale: 2 }).default("0"),
  grossProfitM3: numeric("gross_profit_m3", { precision: 14, scale: 2 }).default("0"),
  grossProfitM4: numeric("gross_profit_m4", { precision: 14, scale: 2 }).default("0"),
  grossProfitM5: numeric("gross_profit_m5", { precision: 14, scale: 2 }).default("0"),
  grossProfitM6: numeric("gross_profit_m6", { precision: 14, scale: 2 }).default("0"),
  grossProfitM7: numeric("gross_profit_m7", { precision: 14, scale: 2 }).default("0"),
  grossProfitM8: numeric("gross_profit_m8", { precision: 14, scale: 2 }).default("0"),
  grossProfitM9: numeric("gross_profit_m9", { precision: 14, scale: 2 }).default("0"),
  grossProfitM10: numeric("gross_profit_m10", { precision: 14, scale: 2 }).default("0"),
  grossProfitM11: numeric("gross_profit_m11", { precision: 14, scale: 2 }).default("0"),
  grossProfitM12: numeric("gross_profit_m12", { precision: 14, scale: 2 }).default("0"),
});

export const insertPipelineOpportunitySchema = createInsertSchema(pipelineOpportunities).omit({ id: true });
export type InsertPipelineOpportunity = z.infer<typeof insertPipelineOpportunitySchema>;
export type PipelineOpportunity = typeof pipelineOpportunities.$inferSelect;

export const scenarios = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  fyYear: text("fy_year").notNull(),
  revenueGoal: numeric("revenue_goal", { precision: 14, scale: 2 }),
  marginGoalPercent: numeric("margin_goal_percent", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScenarioSchema = createInsertSchema(scenarios).omit({ id: true, createdAt: true });
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type Scenario = typeof scenarios.$inferSelect;

export const scenarioAdjustments = pgTable("scenario_adjustments", {
  id: serial("id").primaryKey(),
  scenarioId: integer("scenario_id").notNull().references(() => scenarios.id, { onDelete: "cascade" }),
  opportunityId: integer("opportunity_id").references(() => pipelineOpportunities.id, { onDelete: "cascade" }),
  classification: text("classification"),
  adjustmentType: text("adjustment_type").notNull(),
  winProbability: numeric("win_probability", { precision: 5, scale: 2 }),
  revenueOverride: numeric("revenue_override", { precision: 14, scale: 2 }),
  startMonthShift: integer("start_month_shift"),
  notes: text("notes"),
});

export const insertScenarioAdjustmentSchema = createInsertSchema(scenarioAdjustments).omit({ id: true });
export type InsertScenarioAdjustment = z.infer<typeof insertScenarioAdjustmentSchema>;
export type ScenarioAdjustment = typeof scenarioAdjustments.$inferSelect;

export const forecasts = pgTable("forecasts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  month: date("month").notNull(),
  forecastRevenue: numeric("forecast_revenue", { precision: 14, scale: 2 }),
  forecastCost: numeric("forecast_cost", { precision: 14, scale: 2 }),
  forecastMargin: numeric("forecast_margin", { precision: 14, scale: 2 }),
  forecastUtilization: numeric("forecast_utilization", { precision: 5, scale: 2 }),
  forecastBurnRate: numeric("forecast_burn_rate", { precision: 14, scale: 2 }),
  notes: text("notes"),
});

export const insertForecastSchema = createInsertSchema(forecasts).omit({ id: true });
export type InsertForecast = z.infer<typeof insertForecastSchema>;
export type Forecast = typeof forecasts.$inferSelect;

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dueDate: date("due_date"),
  completedDate: date("completed_date"),
  status: text("status").notNull().default("pending"),
  amount: numeric("amount", { precision: 14, scale: 2 }),
});

export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true });
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;

export const dataSources = pgTable("data_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  connectionInfo: text("connection_info"),
  lastSyncAt: timestamp("last_sync_at"),
  status: text("status").default("configured"),
  recordsProcessed: integer("records_processed").default(0),
  syncFrequency: text("sync_frequency").default("manual"),
});

export const insertDataSourceSchema = createInsertSchema(dataSources).omit({ id: true });
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type DataSource = typeof dataSources.$inferSelect;

export const onboardingSteps = pgTable("onboarding_steps", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  stepName: text("step_name").notNull(),
  stepOrder: integer("step_order").notNull(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

export const insertOnboardingStepSchema = createInsertSchema(onboardingSteps).omit({ id: true });
export type InsertOnboardingStep = z.infer<typeof insertOnboardingStepSchema>;
export type OnboardingStep = typeof onboardingSteps.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
