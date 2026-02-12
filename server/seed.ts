import { db } from "./db";
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
} from "@shared/schema";

export async function seedDatabase() {
  const existingEmployees = await db.select().from(employees).limit(1);
  if (existingEmployees.length > 0) return;

  const insertedEmployees = await db
    .insert(employees)
    .values([
      {
        employeeCode: "EMP001",
        firstName: "Sarah",
        lastName: "Mitchell",
        email: "sarah.mitchell@company.com.au",
        role: "Senior Consultant",
        grade: "P4",
        location: "Melbourne",
        costCenter: "CC-200",
        securityClearance: "NV1",
        payrollTaxRate: "0.0485",
        baseSalary: "145000.00",
        status: "active",
        startDate: "2021-03-15",
        resourceGroup: "Consulting",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP002",
        firstName: "James",
        lastName: "Thompson",
        email: "james.thompson@company.com.au",
        role: "Project Manager",
        grade: "P5",
        location: "Canberra",
        costCenter: "CC-100",
        securityClearance: "NV2",
        payrollTaxRate: "0.0485",
        baseSalary: "165000.00",
        status: "active",
        startDate: "2019-07-01",
        resourceGroup: "Management",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP003",
        firstName: "Priya",
        lastName: "Sharma",
        email: "priya.sharma@company.com.au",
        role: "Developer",
        grade: "P3",
        location: "Melbourne",
        costCenter: "CC-300",
        securityClearance: "Baseline",
        payrollTaxRate: "0.0485",
        baseSalary: "120000.00",
        status: "active",
        startDate: "2022-01-10",
        resourceGroup: "Engineering",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP004",
        firstName: "Michael",
        lastName: "Chen",
        email: "michael.chen@company.com.au",
        role: "Analyst",
        grade: "P2",
        location: "Sydney",
        costCenter: "CC-200",
        securityClearance: null,
        payrollTaxRate: "0.0485",
        baseSalary: "95000.00",
        status: "active",
        startDate: "2023-06-20",
        resourceGroup: "Consulting",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP005",
        firstName: "Emma",
        lastName: "Wilson",
        email: "emma.wilson@company.com.au",
        role: "Business Analyst",
        grade: "P3",
        location: "Canberra",
        costCenter: "CC-200",
        securityClearance: "NV1",
        payrollTaxRate: "0.0485",
        baseSalary: "115000.00",
        status: "active",
        startDate: "2022-09-05",
        resourceGroup: "Consulting",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP006",
        firstName: "Liam",
        lastName: "O'Brien",
        email: "liam.obrien@company.com.au",
        role: "Developer",
        grade: "P4",
        location: "Melbourne",
        costCenter: "CC-300",
        securityClearance: "NV2",
        payrollTaxRate: "0.0485",
        baseSalary: "140000.00",
        status: "active",
        startDate: "2020-11-02",
        resourceGroup: "Engineering",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP007",
        firstName: "Aisha",
        lastName: "Patel",
        email: "aisha.patel@company.com.au",
        role: "Senior Consultant",
        grade: "P4",
        location: "Sydney",
        costCenter: "CC-200",
        securityClearance: "NV1",
        payrollTaxRate: "0.0485",
        baseSalary: "150000.00",
        status: "active",
        startDate: "2021-05-17",
        resourceGroup: "Consulting",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP008",
        firstName: "Daniel",
        lastName: "Nguyen",
        email: "daniel.nguyen@company.com.au",
        role: "Analyst",
        grade: "P1",
        location: "Melbourne",
        costCenter: "CC-200",
        securityClearance: null,
        payrollTaxRate: "0.0485",
        baseSalary: "78000.00",
        status: "active",
        startDate: "2024-08-12",
        resourceGroup: "Consulting",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP009",
        firstName: "Rachel",
        lastName: "Kim",
        email: "rachel.kim@company.com.au",
        role: "Developer",
        grade: "P2",
        location: "Sydney",
        costCenter: "CC-300",
        securityClearance: "Baseline",
        payrollTaxRate: "0.0485",
        baseSalary: "98000.00",
        status: "onboarding",
        startDate: "2026-02-17",
        resourceGroup: "Engineering",
        onboardingStatus: "in_progress",
      },
    ])
    .onConflictDoNothing()
    .returning();

  const empIds = insertedEmployees.map((e) => e.id);

  const insertedProjects = await db
    .insert(projects)
    .values([
      {
        projectCode: "PRJ-DEF-001",
        name: "Defence Modernisation Platform",
        client: "Department of Defence",
        contractType: "fixed_price",
        status: "active",
        startDate: "2025-07-01",
        endDate: "2026-12-31",
        budgetAmount: "1850000.00",
        contractValue: "2000000.00",
        description: "Digital transformation program for defence logistics systems",
      },
      {
        projectCode: "PRJ-ACM-002",
        name: "ACME ERP Integration",
        client: "ACME Corp",
        contractType: "time_materials",
        status: "active",
        startDate: "2025-10-01",
        endDate: "2026-09-30",
        budgetAmount: "650000.00",
        contractValue: "720000.00",
        description: "Enterprise resource planning system integration and migration",
      },
      {
        projectCode: "PRJ-VIC-003",
        name: "VicGov Data Analytics",
        client: "State Gov Victoria",
        contractType: "retainer",
        status: "active",
        startDate: "2025-04-01",
        endDate: "2026-03-31",
        budgetAmount: "480000.00",
        contractValue: "500000.00",
        description: "Data analytics and reporting platform for state government services",
      },
      {
        projectCode: "PRJ-TST-004",
        name: "TechStart Cloud Migration",
        client: "TechStart Inc",
        contractType: "fixed_price",
        status: "completed",
        startDate: "2025-01-15",
        endDate: "2025-11-30",
        budgetAmount: "280000.00",
        contractValue: "310000.00",
        description: "Cloud infrastructure migration and DevOps pipeline setup",
      },
      {
        projectCode: "PRJ-FED-005",
        name: "Federal Compliance System",
        client: "Federal Services",
        contractType: "time_materials",
        status: "planning",
        startDate: "2026-04-01",
        endDate: "2027-03-31",
        budgetAmount: "920000.00",
        contractValue: "1050000.00",
        description: "Regulatory compliance tracking and audit management system",
      },
    ])
    .onConflictDoNothing()
    .returning();

  const projIds = insertedProjects.map((p) => p.id);

  await db
    .insert(rateCards)
    .values([
      { role: "Senior Consultant", grade: "P4", location: "Melbourne", baseRate: "850.00", chargeRate: "1350.00", effectiveFrom: "2025-07-01", currency: "AUD" },
      { role: "Senior Consultant", grade: "P4", location: "Sydney", baseRate: "880.00", chargeRate: "1400.00", effectiveFrom: "2025-07-01", currency: "AUD" },
      { role: "Project Manager", grade: "P5", location: "Canberra", baseRate: "950.00", chargeRate: "1500.00", effectiveFrom: "2025-07-01", currency: "AUD" },
      { role: "Developer", grade: "P3", location: "Melbourne", baseRate: "700.00", chargeRate: "1100.00", effectiveFrom: "2025-07-01", currency: "AUD" },
      { role: "Developer", grade: "P4", location: "Melbourne", baseRate: "820.00", chargeRate: "1300.00", effectiveFrom: "2025-07-01", currency: "AUD" },
      { role: "Analyst", grade: "P2", location: "Sydney", baseRate: "550.00", chargeRate: "900.00", effectiveFrom: "2025-07-01", currency: "AUD" },
      { role: "Business Analyst", grade: "P3", location: "Canberra", baseRate: "680.00", chargeRate: "1050.00", effectiveFrom: "2025-07-01", currency: "AUD" },
      { role: "Analyst", grade: "P1", location: "Melbourne", baseRate: "450.00", chargeRate: "750.00", effectiveFrom: "2025-07-01", currency: "AUD" },
    ])
    .onConflictDoNothing();

  const resourcePlanValues = [];
  const months = ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01"];
  const allocations = [
    { empIdx: 0, projIdx: 0, percent: "80.00", days: "17.0", hours: "136.0" },
    { empIdx: 1, projIdx: 0, percent: "50.00", days: "11.0", hours: "88.0" },
    { empIdx: 2, projIdx: 0, percent: "100.00", days: "22.0", hours: "176.0" },
    { empIdx: 5, projIdx: 0, percent: "60.00", days: "13.0", hours: "104.0" },
    { empIdx: 0, projIdx: 1, percent: "20.00", days: "4.0", hours: "32.0" },
    { empIdx: 3, projIdx: 1, percent: "100.00", days: "22.0", hours: "176.0" },
    { empIdx: 6, projIdx: 1, percent: "50.00", days: "11.0", hours: "88.0" },
    { empIdx: 4, projIdx: 2, percent: "80.00", days: "17.0", hours: "136.0" },
    { empIdx: 7, projIdx: 2, percent: "60.00", days: "13.0", hours: "104.0" },
    { empIdx: 1, projIdx: 4, percent: "30.00", days: "7.0", hours: "56.0" },
  ];

  for (const month of months.slice(0, 3)) {
    for (const alloc of allocations) {
      resourcePlanValues.push({
        projectId: projIds[alloc.projIdx],
        employeeId: empIds[alloc.empIdx],
        month,
        plannedDays: alloc.days,
        plannedHours: alloc.hours,
        allocationPercent: alloc.percent,
      });
    }
  }

  await db.insert(resourcePlans).values(resourcePlanValues).onConflictDoNothing();

  const weekEndings = [
    "2026-01-09", "2026-01-16", "2026-01-23", "2026-01-30",
    "2026-02-06",
  ];
  const timesheetValues = [];
  const tsEntries = [
    { empIdx: 0, projIdx: 0, hours: "38.00", days: "5.0", billable: true, source: "i-time" },
    { empIdx: 1, projIdx: 0, hours: "20.00", days: "2.5", billable: true, source: "dynamics" },
    { empIdx: 2, projIdx: 0, hours: "40.00", days: "5.0", billable: true, source: "i-time" },
    { empIdx: 5, projIdx: 0, hours: "24.00", days: "3.0", billable: true, source: "manual" },
    { empIdx: 3, projIdx: 1, hours: "40.00", days: "5.0", billable: true, source: "i-time" },
    { empIdx: 6, projIdx: 1, hours: "20.00", days: "2.5", billable: true, source: "dynamics" },
    { empIdx: 4, projIdx: 2, hours: "32.00", days: "4.0", billable: true, source: "i-time" },
    { empIdx: 7, projIdx: 2, hours: "24.00", days: "3.0", billable: true, source: "manual" },
    { empIdx: 0, projIdx: 1, hours: "8.00", days: "1.0", billable: true, source: "i-time" },
    { empIdx: 1, projIdx: 0, hours: "16.00", days: "2.0", billable: false, source: "manual" },
  ];

  for (const week of weekEndings) {
    for (const entry of tsEntries.slice(0, week === "2026-02-06" ? 5 : tsEntries.length)) {
      timesheetValues.push({
        employeeId: empIds[entry.empIdx],
        projectId: projIds[entry.projIdx],
        weekEnding: week,
        hoursWorked: entry.hours,
        daysWorked: entry.days,
        billable: entry.billable,
        source: entry.source,
        status: "submitted",
      });
    }
  }

  await db.insert(timesheets).values(timesheetValues).onConflictDoNothing();

  const costMonths = ["2025-11-01", "2025-12-01", "2026-01-01"];
  const costEntries = [
    { projIdx: 0, category: "resource", description: "Staff costs - Defence Platform", amount: "185000.00", costType: "resource" },
    { projIdx: 0, category: "subcontractor", description: "Security specialist subcontractor", amount: "45000.00", costType: "subcontractor" },
    { projIdx: 0, category: "overhead", description: "Project overhead allocation", amount: "12000.00", costType: "overhead" },
    { projIdx: 1, category: "resource", description: "Staff costs - ERP Integration", amount: "82000.00", costType: "resource" },
    { projIdx: 1, category: "travel", description: "Client site travel Sydney", amount: "3500.00", costType: "travel" },
    { projIdx: 2, category: "resource", description: "Staff costs - Data Analytics", amount: "68000.00", costType: "resource" },
    { projIdx: 2, category: "rd", description: "R&D analytics tooling", amount: "15000.00", costType: "rd" },
    { projIdx: 3, category: "resource", description: "Staff costs - Cloud Migration", amount: "55000.00", costType: "resource" },
    { projIdx: 4, category: "overhead", description: "Pre-project planning overhead", amount: "8000.00", costType: "overhead" },
  ];

  const costValues = [];
  for (const month of costMonths) {
    for (const entry of costEntries.slice(0, month === "2025-11-01" ? 7 : costEntries.length)) {
      costValues.push({
        projectId: projIds[entry.projIdx],
        category: entry.category,
        description: entry.description,
        amount: entry.amount,
        month,
        costType: entry.costType,
        source: "calculated",
      });
    }
  }

  await db.insert(costs).values(costValues).onConflictDoNothing();

  const kpiMonths = ["2025-11-01", "2025-12-01", "2026-01-01"];
  const kpiEntries = [
    { projIdx: 0, revenue: "280000.00", contractRate: "1350.00", billedAmount: "260000.00", unbilledAmount: "20000.00", grossCost: "242000.00", resourceCost: "185000.00", rdCost: "0.00", margin: "38000.00", marginPercent: "13.57", burnRate: "242000.00", utilization: "87.50" },
    { projIdx: 0, revenue: "295000.00", contractRate: "1350.00", billedAmount: "290000.00", unbilledAmount: "5000.00", grossCost: "238000.00", resourceCost: "182000.00", rdCost: "0.00", margin: "57000.00", marginPercent: "19.32", burnRate: "238000.00", utilization: "91.20" },
    { projIdx: 0, revenue: "310000.00", contractRate: "1350.00", billedAmount: "275000.00", unbilledAmount: "35000.00", grossCost: "245000.00", resourceCost: "188000.00", rdCost: "0.00", margin: "65000.00", marginPercent: "20.97", burnRate: "245000.00", utilization: "89.30" },
    { projIdx: 1, revenue: "95000.00", contractRate: "1100.00", billedAmount: "92000.00", unbilledAmount: "3000.00", grossCost: "85500.00", resourceCost: "82000.00", rdCost: "0.00", margin: "9500.00", marginPercent: "10.00", burnRate: "85500.00", utilization: "82.00" },
    { projIdx: 1, revenue: "102000.00", contractRate: "1100.00", billedAmount: "98000.00", unbilledAmount: "4000.00", grossCost: "88000.00", resourceCost: "84000.00", rdCost: "0.00", margin: "14000.00", marginPercent: "13.73", burnRate: "88000.00", utilization: "85.50" },
    { projIdx: 1, revenue: "98000.00", contractRate: "1100.00", billedAmount: "90000.00", unbilledAmount: "8000.00", grossCost: "86500.00", resourceCost: "83000.00", rdCost: "0.00", margin: "11500.00", marginPercent: "11.73", burnRate: "86500.00", utilization: "83.20" },
    { projIdx: 2, revenue: "65000.00", contractRate: "1050.00", billedAmount: "62000.00", unbilledAmount: "3000.00", grossCost: "83000.00", resourceCost: "68000.00", rdCost: "15000.00", margin: "-18000.00", marginPercent: "-27.69", burnRate: "83000.00", utilization: "78.40" },
    { projIdx: 2, revenue: "72000.00", contractRate: "1050.00", billedAmount: "70000.00", unbilledAmount: "2000.00", grossCost: "80000.00", resourceCost: "66000.00", rdCost: "14000.00", margin: "-8000.00", marginPercent: "-11.11", burnRate: "80000.00", utilization: "81.60" },
    { projIdx: 2, revenue: "78000.00", contractRate: "1050.00", billedAmount: "75000.00", unbilledAmount: "3000.00", grossCost: "82000.00", resourceCost: "67000.00", rdCost: "15000.00", margin: "-4000.00", marginPercent: "-5.13", burnRate: "82000.00", utilization: "84.10" },
    { projIdx: 3, revenue: "48000.00", contractRate: "900.00", billedAmount: "48000.00", unbilledAmount: "0.00", grossCost: "42000.00", resourceCost: "38000.00", rdCost: "0.00", margin: "6000.00", marginPercent: "12.50", burnRate: "42000.00", utilization: "90.00" },
    { projIdx: 3, revenue: "52000.00", contractRate: "900.00", billedAmount: "52000.00", unbilledAmount: "0.00", grossCost: "44000.00", resourceCost: "40000.00", rdCost: "0.00", margin: "8000.00", marginPercent: "15.38", burnRate: "44000.00", utilization: "92.30" },
    { projIdx: 3, revenue: "55000.00", contractRate: "900.00", billedAmount: "55000.00", unbilledAmount: "0.00", grossCost: "46000.00", resourceCost: "42000.00", rdCost: "0.00", margin: "9000.00", marginPercent: "16.36", burnRate: "46000.00", utilization: "93.10" },
    { projIdx: 4, revenue: "0.00", contractRate: "1200.00", billedAmount: "0.00", unbilledAmount: "0.00", grossCost: "8000.00", resourceCost: "0.00", rdCost: "0.00", margin: "-8000.00", marginPercent: "0.00", burnRate: "8000.00", utilization: "0.00" },
    { projIdx: 4, revenue: "0.00", contractRate: "1200.00", billedAmount: "0.00", unbilledAmount: "0.00", grossCost: "8500.00", resourceCost: "0.00", rdCost: "0.00", margin: "-8500.00", marginPercent: "0.00", burnRate: "8500.00", utilization: "0.00" },
    { projIdx: 4, revenue: "0.00", contractRate: "1200.00", billedAmount: "0.00", unbilledAmount: "0.00", grossCost: "9000.00", resourceCost: "0.00", rdCost: "0.00", margin: "-9000.00", marginPercent: "0.00", burnRate: "9000.00", utilization: "0.00" },
  ];

  const kpiValues = [];
  for (let i = 0; i < kpiEntries.length; i++) {
    const monthIdx = i % 3;
    kpiValues.push({
      projectId: projIds[kpiEntries[i].projIdx],
      month: kpiMonths[monthIdx],
      revenue: kpiEntries[i].revenue,
      contractRate: kpiEntries[i].contractRate,
      billedAmount: kpiEntries[i].billedAmount,
      unbilledAmount: kpiEntries[i].unbilledAmount,
      grossCost: kpiEntries[i].grossCost,
      resourceCost: kpiEntries[i].resourceCost,
      rdCost: kpiEntries[i].rdCost,
      margin: kpiEntries[i].margin,
      marginPercent: kpiEntries[i].marginPercent,
      burnRate: kpiEntries[i].burnRate,
      utilization: kpiEntries[i].utilization,
    });
  }

  await db.insert(kpis).values(kpiValues).onConflictDoNothing();

  const forecastMonths = ["2026-02-01", "2026-03-01", "2026-04-01"];
  const forecastEntries = [
    { projIdx: 0, revenue: "320000.00", cost: "250000.00", margin: "70000.00", utilization: "90.50", burnRate: "250000.00", notes: "Ramping up delivery phase" },
    { projIdx: 0, revenue: "335000.00", cost: "255000.00", margin: "80000.00", utilization: "92.00", burnRate: "255000.00", notes: "Peak delivery period" },
    { projIdx: 0, revenue: "310000.00", cost: "240000.00", margin: "70000.00", utilization: "88.00", burnRate: "240000.00", notes: "Transitioning to UAT" },
    { projIdx: 1, revenue: "105000.00", cost: "90000.00", margin: "15000.00", utilization: "86.00", burnRate: "90000.00", notes: "Stable delivery phase" },
    { projIdx: 1, revenue: "110000.00", cost: "92000.00", margin: "18000.00", utilization: "87.50", burnRate: "92000.00", notes: "Integration testing sprint" },
    { projIdx: 1, revenue: "100000.00", cost: "88000.00", margin: "12000.00", utilization: "84.00", burnRate: "88000.00", notes: "Data migration phase" },
    { projIdx: 2, revenue: "82000.00", cost: "78000.00", margin: "4000.00", utilization: "86.00", burnRate: "78000.00", notes: "Improving margins with new tooling" },
    { projIdx: 2, revenue: "85000.00", cost: "76000.00", margin: "9000.00", utilization: "88.00", burnRate: "76000.00", notes: "R&D investment paying off" },
    { projIdx: 2, revenue: "88000.00", cost: "75000.00", margin: "13000.00", utilization: "89.50", burnRate: "75000.00", notes: "Retainer renewal discussions" },
    { projIdx: 4, revenue: "120000.00", cost: "95000.00", margin: "25000.00", utilization: "75.00", burnRate: "95000.00", notes: "Project kickoff and team onboarding" },
    { projIdx: 4, revenue: "150000.00", cost: "110000.00", margin: "40000.00", utilization: "82.00", burnRate: "110000.00", notes: "Full team ramped up" },
    { projIdx: 4, revenue: "160000.00", cost: "115000.00", margin: "45000.00", utilization: "85.00", burnRate: "115000.00", notes: "First deliverable milestone" },
  ];

  const forecastValues = [];
  for (let i = 0; i < forecastEntries.length; i++) {
    const monthIdx = i % 3;
    forecastValues.push({
      projectId: projIds[forecastEntries[i].projIdx],
      month: forecastMonths[monthIdx],
      forecastRevenue: forecastEntries[i].revenue,
      forecastCost: forecastEntries[i].cost,
      forecastMargin: forecastEntries[i].margin,
      forecastUtilization: forecastEntries[i].utilization,
      forecastBurnRate: forecastEntries[i].burnRate,
      notes: forecastEntries[i].notes,
    });
  }

  await db.insert(forecasts).values(forecastValues).onConflictDoNothing();

  await db
    .insert(milestones)
    .values([
      { projectId: projIds[0], name: "Requirements Sign-off", dueDate: "2025-09-30", completedDate: "2025-09-28", status: "completed", amount: "200000.00" },
      { projectId: projIds[0], name: "Phase 1 Delivery", dueDate: "2026-01-31", completedDate: "2026-01-29", status: "completed", amount: "400000.00" },
      { projectId: projIds[0], name: "Phase 2 Delivery", dueDate: "2026-06-30", status: "pending", amount: "500000.00" },
      { projectId: projIds[0], name: "UAT Completion", dueDate: "2026-10-31", status: "pending", amount: "400000.00" },
      { projectId: projIds[1], name: "Discovery Workshop", dueDate: "2025-11-15", completedDate: "2025-11-14", status: "completed", amount: "72000.00" },
      { projectId: projIds[1], name: "System Design Approval", dueDate: "2026-01-15", completedDate: null, status: "overdue", amount: "144000.00" },
      { projectId: projIds[1], name: "Integration Go-Live", dueDate: "2026-07-31", status: "pending", amount: "288000.00" },
      { projectId: projIds[2], name: "Q1 Analytics Report", dueDate: "2025-06-30", completedDate: "2025-06-28", status: "completed", amount: "125000.00" },
      { projectId: projIds[2], name: "Q2 Analytics Report", dueDate: "2025-12-31", completedDate: null, status: "overdue", amount: "125000.00" },
      { projectId: projIds[2], name: "Q3 Analytics Report", dueDate: "2026-03-31", status: "pending", amount: "125000.00" },
      { projectId: projIds[3], name: "Migration Complete", dueDate: "2025-10-31", completedDate: "2025-10-28", status: "completed", amount: "310000.00" },
      { projectId: projIds[4], name: "Project Charter Approval", dueDate: "2026-03-15", status: "pending", amount: "105000.00" },
    ])
    .onConflictDoNothing();

  await db
    .insert(dataSources)
    .values([
      { name: "VAGO Extracts", type: "file_extract", connectionInfo: "SFTP: vago-extract.gov.au/reports", lastSyncAt: new Date("2026-02-10T08:30:00Z"), status: "active", recordsProcessed: 1245, syncFrequency: "daily" },
      { name: "Microsoft Dynamics", type: "api", connectionInfo: "https://dynamics365.company.com.au/api/v2", lastSyncAt: new Date("2026-02-11T14:15:00Z"), status: "active", recordsProcessed: 3892, syncFrequency: "hourly" },
      { name: "Payroll Tax System", type: "database", connectionInfo: "payroll-db.internal:5432/payroll_prod", lastSyncAt: new Date("2026-02-09T22:00:00Z"), status: "active", recordsProcessed: 487, syncFrequency: "weekly" },
      { name: "Employee Location DB", type: "database", connectionInfo: "hr-db.internal:5432/employee_locations", lastSyncAt: new Date("2026-02-05T10:00:00Z"), status: "configured", recordsProcessed: 156, syncFrequency: "weekly" },
      { name: "Security Clearance Registry", type: "api", connectionInfo: "https://clearance-registry.gov.au/api/v1", lastSyncAt: new Date("2026-01-28T16:45:00Z"), status: "error", recordsProcessed: 0, syncFrequency: "daily" },
      { name: "i-Time System", type: "api", connectionInfo: "https://itime.company.com.au/api/timesheets", lastSyncAt: new Date("2026-02-11T18:00:00Z"), status: "active", recordsProcessed: 2134, syncFrequency: "daily" },
    ])
    .onConflictDoNothing();

  const onboardingEmployeeId = empIds[8];
  await db
    .insert(onboardingSteps)
    .values([
      { employeeId: onboardingEmployeeId, stepName: "Add to SC List", stepOrder: 1, completed: true, completedAt: new Date("2026-02-10T09:00:00Z"), notes: "Added to security clearance tracking list" },
      { employeeId: onboardingEmployeeId, stepName: "Add to RM", stepOrder: 2, completed: true, completedAt: new Date("2026-02-10T09:30:00Z"), notes: "Added to resource management system" },
      { employeeId: onboardingEmployeeId, stepName: "Add to EG Card", stepOrder: 3, completed: true, completedAt: new Date("2026-02-10T10:00:00Z"), notes: "Employee grade card created" },
      { employeeId: onboardingEmployeeId, stepName: "Add to KP Rev Tab", stepOrder: 4, completed: false, notes: "Pending KPI review tab setup" },
      { employeeId: onboardingEmployeeId, stepName: "Add to Resource Group", stepOrder: 5, completed: false, notes: "Assign to Engineering resource group" },
      { employeeId: onboardingEmployeeId, stepName: "Set Employee Location", stepOrder: 6, completed: false, notes: "Set primary location to Sydney" },
      { employeeId: onboardingEmployeeId, stepName: "Add to Salary Plan", stepOrder: 7, completed: false, notes: "Configure salary plan and payroll" },
      { employeeId: onboardingEmployeeId, stepName: "Complete Home Access", stepOrder: 8, completed: false, notes: "Setup VPN and home office access" },
    ])
    .onConflictDoNothing();

  console.log("Seed data created successfully");
}
