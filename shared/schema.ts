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
  grade: text("grade"),
  location: text("location"),
  costCenter: text("cost_center"),
  securityClearance: text("security_clearance"),
  payrollTaxRate: numeric("payroll_tax_rate", { precision: 5, scale: 4 }),
  baseSalary: numeric("base_salary", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("active"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  resourceGroup: text("resource_group"),
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
  contractType: text("contract_type"),
  status: text("status").notNull().default("active"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budgetAmount: numeric("budget_amount", { precision: 14, scale: 2 }),
  contractValue: numeric("contract_value", { precision: 14, scale: 2 }),
  description: text("description"),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

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
  daysWorked: numeric("days_worked", { precision: 4, scale: 1 }),
  billable: boolean("billable").default(true),
  source: text("source").default("manual"),
  status: text("status").default("submitted"),
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
