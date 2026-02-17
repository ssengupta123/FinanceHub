import { z } from "zod";

export const insertEmployeeSchema = z.object({
  employeeCode: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  costBandLevel: z.string().nullable().optional(),
  staffType: z.string().nullable().optional(),
  grade: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  costCenter: z.string().nullable().optional(),
  securityClearance: z.string().nullable().optional(),
  payrollTax: z.boolean().nullable().optional(),
  payrollTaxRate: z.string().nullable().optional(),
  baseCost: z.string().nullable().optional(),
  grossCost: z.string().nullable().optional(),
  baseSalary: z.string().nullable().optional(),
  status: z.string().optional().default("active"),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  scheduleStart: z.string().nullable().optional(),
  scheduleEnd: z.string().nullable().optional(),
  resourceGroup: z.string().nullable().optional(),
  team: z.string().nullable().optional(),
  jid: z.string().nullable().optional(),
  onboardingStatus: z.string().nullable().optional(),
});
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = InsertEmployee & { id: number };

export const insertProjectSchema = z.object({
  projectCode: z.string(),
  name: z.string(),
  client: z.string().nullable().optional(),
  clientCode: z.string().nullable().optional(),
  clientManager: z.string().nullable().optional(),
  engagementManager: z.string().nullable().optional(),
  engagementSupport: z.string().nullable().optional(),
  contractType: z.string().nullable().optional(),
  billingCategory: z.string().nullable().optional(),
  workType: z.string().nullable().optional(),
  panel: z.string().nullable().optional(),
  recurring: z.string().nullable().optional(),
  vat: z.string().nullable().optional(),
  pipelineStatus: z.string().nullable().optional(),
  adStatus: z.string().nullable().optional(),
  status: z.string().optional().default("active"),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  workOrderAmount: z.string().nullable().optional(),
  budgetAmount: z.string().nullable().optional(),
  contractValue: z.string().nullable().optional(),
  actualAmount: z.string().nullable().optional(),
  balanceAmount: z.string().nullable().optional(),
  forecastedRevenue: z.string().nullable().optional(),
  forecastedGrossCost: z.string().nullable().optional(),
  varianceAtCompletion: z.string().nullable().optional(),
  variancePercent: z.string().nullable().optional(),
  varianceToContractPercent: z.string().nullable().optional(),
  writeOff: z.string().nullable().optional(),
  soldGmPercent: z.string().nullable().optional(),
  toDateGrossProfit: z.string().nullable().optional(),
  toDateGmPercent: z.string().nullable().optional(),
  gpAtCompletion: z.string().nullable().optional(),
  forecastGmPercent: z.string().nullable().optional(),
  opsCommentary: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = InsertProject & { id: number };

export const insertProjectMonthlySchema = z.object({
  projectId: z.number(),
  fyYear: z.string().nullable().optional(),
  month: z.number(),
  monthLabel: z.string().nullable().optional(),
  revenue: z.string().nullable().optional(),
  cost: z.string().nullable().optional(),
  profit: z.string().nullable().optional(),
});
export type InsertProjectMonthly = z.infer<typeof insertProjectMonthlySchema>;
export type ProjectMonthly = InsertProjectMonthly & { id: number };

export const insertRateCardSchema = z.object({
  role: z.string(),
  grade: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  baseRate: z.string(),
  chargeRate: z.string(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
});
export type InsertRateCard = z.infer<typeof insertRateCardSchema>;
export type RateCard = InsertRateCard & { id: number };

export const insertResourcePlanSchema = z.object({
  projectId: z.number(),
  employeeId: z.number(),
  month: z.string(),
  plannedDays: z.string().nullable().optional(),
  plannedHours: z.string().nullable().optional(),
  allocationPercent: z.string().nullable().optional(),
});
export type InsertResourcePlan = z.infer<typeof insertResourcePlanSchema>;
export type ResourcePlan = InsertResourcePlan & { id: number };

export const insertTimesheetSchema = z.object({
  employeeId: z.number(),
  projectId: z.number(),
  weekEnding: z.string(),
  hoursWorked: z.string(),
  saleValue: z.string().nullable().optional(),
  costValue: z.string().nullable().optional(),
  daysWorked: z.string().nullable().optional(),
  billable: z.boolean().nullable().optional(),
  activityType: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  fyMonth: z.number().nullable().optional(),
  fyYear: z.string().nullable().optional(),
});
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type Timesheet = InsertTimesheet & { id: number };

export const insertCostSchema = z.object({
  projectId: z.number(),
  category: z.string(),
  description: z.string().nullable().optional(),
  amount: z.string(),
  month: z.string(),
  costType: z.string().optional().default("resource"),
  source: z.string().nullable().optional(),
});
export type InsertCost = z.infer<typeof insertCostSchema>;
export type Cost = InsertCost & { id: number };

export const insertKpiSchema = z.object({
  projectId: z.number(),
  month: z.string(),
  revenue: z.string().nullable().optional(),
  contractRate: z.string().nullable().optional(),
  billedAmount: z.string().nullable().optional(),
  unbilledAmount: z.string().nullable().optional(),
  grossCost: z.string().nullable().optional(),
  resourceCost: z.string().nullable().optional(),
  rdCost: z.string().nullable().optional(),
  margin: z.string().nullable().optional(),
  marginPercent: z.string().nullable().optional(),
  burnRate: z.string().nullable().optional(),
  utilization: z.string().nullable().optional(),
});
export type InsertKpi = z.infer<typeof insertKpiSchema>;
export type Kpi = InsertKpi & { id: number };

export const insertPipelineOpportunitySchema = z.object({
  name: z.string(),
  classification: z.string(),
  vat: z.string().nullable().optional(),
  fyYear: z.string().nullable().optional(),
  billingType: z.string().nullable().optional(),
  revenueM1: z.string().nullable().optional(),
  revenueM2: z.string().nullable().optional(),
  revenueM3: z.string().nullable().optional(),
  revenueM4: z.string().nullable().optional(),
  revenueM5: z.string().nullable().optional(),
  revenueM6: z.string().nullable().optional(),
  revenueM7: z.string().nullable().optional(),
  revenueM8: z.string().nullable().optional(),
  revenueM9: z.string().nullable().optional(),
  revenueM10: z.string().nullable().optional(),
  revenueM11: z.string().nullable().optional(),
  revenueM12: z.string().nullable().optional(),
  grossProfitM1: z.string().nullable().optional(),
  grossProfitM2: z.string().nullable().optional(),
  grossProfitM3: z.string().nullable().optional(),
  grossProfitM4: z.string().nullable().optional(),
  grossProfitM5: z.string().nullable().optional(),
  grossProfitM6: z.string().nullable().optional(),
  grossProfitM7: z.string().nullable().optional(),
  grossProfitM8: z.string().nullable().optional(),
  grossProfitM9: z.string().nullable().optional(),
  grossProfitM10: z.string().nullable().optional(),
  grossProfitM11: z.string().nullable().optional(),
  grossProfitM12: z.string().nullable().optional(),
});
export type InsertPipelineOpportunity = z.infer<typeof insertPipelineOpportunitySchema>;
export type PipelineOpportunity = InsertPipelineOpportunity & { id: number };

export const insertScenarioSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  fyYear: z.string(),
  revenueGoal: z.string().nullable().optional(),
  marginGoalPercent: z.string().nullable().optional(),
});
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type Scenario = InsertScenario & { id: number; createdAt: Date | null };

export const insertScenarioAdjustmentSchema = z.object({
  scenarioId: z.number(),
  opportunityId: z.number().nullable().optional(),
  classification: z.string().nullable().optional(),
  adjustmentType: z.string(),
  winProbability: z.string().nullable().optional(),
  revenueOverride: z.string().nullable().optional(),
  startMonthShift: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type InsertScenarioAdjustment = z.infer<typeof insertScenarioAdjustmentSchema>;
export type ScenarioAdjustment = InsertScenarioAdjustment & { id: number };

export const insertForecastSchema = z.object({
  projectId: z.number(),
  month: z.string(),
  forecastRevenue: z.string().nullable().optional(),
  forecastCost: z.string().nullable().optional(),
  forecastMargin: z.string().nullable().optional(),
  forecastUtilization: z.string().nullable().optional(),
  forecastBurnRate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type InsertForecast = z.infer<typeof insertForecastSchema>;
export type Forecast = InsertForecast & { id: number };

export const insertMilestoneSchema = z.object({
  projectId: z.number(),
  name: z.string(),
  dueDate: z.string().nullable().optional(),
  completedDate: z.string().nullable().optional(),
  status: z.string().optional().default("pending"),
  amount: z.string().nullable().optional(),
  milestoneType: z.string().nullable().optional(),
  invoiceStatus: z.string().nullable().optional(),
});
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = InsertMilestone & { id: number };

export const insertDataSourceSchema = z.object({
  name: z.string(),
  type: z.string(),
  connectionInfo: z.string().nullable().optional(),
  lastSyncAt: z.union([z.date(), z.string()]).nullable().optional(),
  status: z.string().nullable().optional(),
  recordsProcessed: z.number().nullable().optional(),
  syncFrequency: z.string().nullable().optional(),
});
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type DataSource = InsertDataSource & { id: number };

export const insertOnboardingStepSchema = z.object({
  employeeId: z.number(),
  stepName: z.string(),
  stepOrder: z.number(),
  completed: z.boolean().nullable().optional(),
  completedAt: z.union([z.date(), z.string()]).nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type InsertOnboardingStep = z.infer<typeof insertOnboardingStepSchema>;
export type OnboardingStep = InsertOnboardingStep & { id: number };

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
  email: z.string().nullable().optional(),
  role: z.string().optional().default("user"),
  displayName: z.string().nullable().optional(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InsertUser & { id: number };

export const insertReferenceDataSchema = z.object({
  category: z.string(),
  key: z.string(),
  value: z.string(),
  displayOrder: z.number().nullable().optional(),
  active: z.boolean().optional().default(true),
});
export type InsertReferenceData = z.infer<typeof insertReferenceDataSchema>;
export type ReferenceData = InsertReferenceData & { id: number };

export const insertConversationSchema = z.object({
  title: z.string(),
});
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = { id: number; title: string; createdAt: Date };

export const insertMessageSchema = z.object({
  conversationId: z.number(),
  role: z.string(),
  content: z.string(),
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = { id: number; conversationId: number; role: string; content: string; createdAt: Date };
