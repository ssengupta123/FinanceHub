import { eq } from "drizzle-orm";
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
  projectMonthly,
  pipelineOpportunities,
  scenarios,
  scenarioAdjustments,
} from "@shared/schema";

export async function seedDatabase() {
  const existingPipeline = await db.select().from(pipelineOpportunities).limit(1);
  if (existingPipeline.length > 0) return;

  const existingEmployees = await db.select().from(employees).limit(1);
  if (existingEmployees.length > 0) {
    await seedPipelineAndScenarios();
    return;
  }

  const insertedEmployees = await db
    .insert(employees)
    .values([
      {
        employeeCode: "EMP001",
        firstName: "Sarah",
        lastName: "Mitchell",
        email: "sarah.mitchell@company.com.au",
        role: "Senior Consultant",
        costBandLevel: "C4",
        staffType: "Consultant",
        grade: "P4",
        location: "Melbourne",
        costCenter: "CC-200",
        securityClearance: "NV1",
        payrollTax: true,
        payrollTaxRate: "0.0485",
        baseCost: "680.00",
        grossCost: "713.98",
        baseSalary: "145000.00",
        status: "active",
        startDate: "2021-03-15",
        scheduleStart: "2025-07-01",
        scheduleEnd: "2026-06-30",
        resourceGroup: "Consulting",
        team: "CSD",
        jid: "JID-1001",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP002",
        firstName: "James",
        lastName: "Thompson",
        email: "james.thompson@company.com.au",
        role: "Project Manager",
        costBandLevel: "C5",
        staffType: "Consultant",
        grade: "P5",
        location: "Canberra",
        costCenter: "CC-100",
        securityClearance: "NV2",
        payrollTax: true,
        payrollTaxRate: "0.0485",
        baseCost: "780.00",
        grossCost: "817.83",
        baseSalary: "165000.00",
        status: "active",
        startDate: "2019-07-01",
        scheduleStart: "2025-07-01",
        scheduleEnd: "2026-06-30",
        resourceGroup: "Management",
        team: "CSD",
        jid: "JID-1002",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP003",
        firstName: "Priya",
        lastName: "Sharma",
        email: "priya.sharma@company.com.au",
        role: "Developer",
        costBandLevel: "E3",
        staffType: "Engineer",
        grade: "P3",
        location: "Melbourne",
        costCenter: "CC-300",
        securityClearance: "Baseline",
        payrollTax: true,
        payrollTaxRate: "0.0485",
        baseCost: "560.00",
        grossCost: "587.16",
        baseSalary: "120000.00",
        status: "active",
        startDate: "2022-01-10",
        scheduleStart: "2025-07-01",
        scheduleEnd: "2026-06-30",
        resourceGroup: "Engineering",
        team: "CSD",
        jid: "JID-1003",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP004",
        firstName: "Michael",
        lastName: "Chen",
        email: "michael.chen@company.com.au",
        role: "Analyst",
        costBandLevel: "C2",
        staffType: "Consultant",
        grade: "P2",
        location: "Sydney",
        costCenter: "CC-200",
        securityClearance: null,
        payrollTax: true,
        payrollTaxRate: "0.0485",
        baseCost: "440.00",
        grossCost: "461.34",
        baseSalary: "95000.00",
        status: "active",
        startDate: "2023-06-20",
        scheduleStart: "2025-07-01",
        scheduleEnd: "2026-06-30",
        resourceGroup: "Consulting",
        team: "CSD",
        jid: "JID-1004",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP005",
        firstName: "Emma",
        lastName: "Wilson",
        email: "emma.wilson@company.com.au",
        role: "Business Analyst",
        costBandLevel: "C3",
        staffType: "Consultant",
        grade: "P3",
        location: "Canberra",
        costCenter: "CC-200",
        securityClearance: "NV1",
        payrollTax: false,
        payrollTaxRate: "0.0485",
        baseCost: "540.00",
        grossCost: "540.00",
        baseSalary: "115000.00",
        status: "active",
        startDate: "2022-09-05",
        scheduleStart: "2025-07-01",
        scheduleEnd: "2026-06-30",
        resourceGroup: "Consulting",
        team: "CSD",
        jid: "JID-1005",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP006",
        firstName: "Liam",
        lastName: "O'Brien",
        email: "liam.obrien@company.com.au",
        role: "Developer",
        costBandLevel: "E4",
        staffType: "Engineer",
        grade: "P4",
        location: "Melbourne",
        costCenter: "CC-300",
        securityClearance: "NV2",
        payrollTax: true,
        payrollTaxRate: "0.0485",
        baseCost: "650.00",
        grossCost: "681.53",
        baseSalary: "140000.00",
        status: "active",
        startDate: "2020-11-02",
        scheduleStart: "2025-07-01",
        scheduleEnd: "2026-06-30",
        resourceGroup: "Engineering",
        team: "CSD",
        jid: "JID-1006",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP007",
        firstName: "Aisha",
        lastName: "Patel",
        email: "aisha.patel@company.com.au",
        role: "Senior Consultant",
        costBandLevel: "C4",
        staffType: "Consultant",
        grade: "P4",
        location: "Sydney",
        costCenter: "CC-200",
        securityClearance: "NV1",
        payrollTax: true,
        payrollTaxRate: "0.0485",
        baseCost: "700.00",
        grossCost: "733.95",
        baseSalary: "150000.00",
        status: "active",
        startDate: "2021-05-17",
        scheduleStart: "2025-07-01",
        scheduleEnd: "2026-06-30",
        resourceGroup: "Consulting",
        team: "CSD",
        jid: "JID-1007",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP008",
        firstName: "Daniel",
        lastName: "Nguyen",
        email: "daniel.nguyen@company.com.au",
        role: "Analyst",
        costBandLevel: "C1",
        staffType: "Contractor",
        grade: "P1",
        location: "Melbourne",
        costCenter: "CC-200",
        securityClearance: null,
        payrollTax: false,
        payrollTaxRate: "0.0485",
        baseCost: "350.00",
        grossCost: "350.00",
        baseSalary: "78000.00",
        status: "active",
        startDate: "2024-08-12",
        scheduleStart: "2025-07-01",
        scheduleEnd: "2026-06-30",
        resourceGroup: "Consulting",
        team: "CSD",
        jid: "JID-1008",
        onboardingStatus: "completed",
      },
      {
        employeeCode: "EMP009",
        firstName: "Rachel",
        lastName: "Kim",
        email: "rachel.kim@company.com.au",
        role: "Developer",
        costBandLevel: "E2",
        staffType: "Engineer",
        grade: "P2",
        location: "Sydney",
        costCenter: "CC-300",
        securityClearance: "Baseline",
        payrollTax: true,
        payrollTaxRate: "0.0485",
        baseCost: "460.00",
        grossCost: "482.31",
        baseSalary: "98000.00",
        status: "onboarding",
        startDate: "2026-02-17",
        scheduleStart: "2025-07-01",
        scheduleEnd: "2026-06-30",
        resourceGroup: "Engineering",
        team: "CSD",
        jid: "JID-1009",
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
        clientCode: "DOD",
        clientManager: "James Thompson",
        engagementManager: "Sarah Mitchell",
        engagementSupport: "Emma Wilson",
        contractType: "fixed_price",
        billingCategory: "Fixed",
        workType: "Delivery",
        panel: "Defence ICT",
        recurring: "No",
        vat: "Growth",
        pipelineStatus: "C",
        adStatus: "Active",
        status: "active",
        startDate: "2025-07-01",
        endDate: "2026-12-31",
        workOrderAmount: "2000000.00",
        budgetAmount: "1850000.00",
        contractValue: "2000000.00",
        actualAmount: "885000.00",
        balanceAmount: "1115000.00",
        forecastedRevenue: "1950000.00",
        forecastedGrossCost: "1560000.00",
        varianceAtCompletion: "50000.00",
        variancePercent: "0.0250",
        varianceToContractPercent: "0.0250",
        writeOff: "0.00",
        soldGmPercent: "0.2200",
        toDateGrossProfit: "195000.00",
        toDateGmPercent: "0.2203",
        gpAtCompletion: "390000.00",
        forecastGmPercent: "0.2000",
        opsCommentary: "On track. Phase 1 delivered successfully. Phase 2 commencing.",
        description: "Digital transformation program for defence logistics systems",
      },
      {
        projectCode: "PRJ-ACM-002",
        name: "ACME ERP Integration",
        client: "ACME Corp",
        clientCode: "ACM",
        clientManager: "Aisha Patel",
        engagementManager: "James Thompson",
        engagementSupport: "Michael Chen",
        contractType: "time_materials",
        billingCategory: "T&M",
        workType: "Delivery",
        panel: null,
        recurring: "No",
        vat: "Growth",
        pipelineStatus: "C",
        adStatus: "Active",
        status: "active",
        startDate: "2025-10-01",
        endDate: "2026-09-30",
        workOrderAmount: "720000.00",
        budgetAmount: "650000.00",
        contractValue: "720000.00",
        actualAmount: "295000.00",
        balanceAmount: "425000.00",
        forecastedRevenue: "700000.00",
        forecastedGrossCost: "574000.00",
        varianceAtCompletion: "20000.00",
        variancePercent: "0.0278",
        varianceToContractPercent: "0.0278",
        writeOff: "0.00",
        soldGmPercent: "0.1800",
        toDateGrossProfit: "55000.00",
        toDateGmPercent: "0.1864",
        gpAtCompletion: "126000.00",
        forecastGmPercent: "0.1800",
        opsCommentary: "Integration testing underway. Client engagement positive.",
        description: "Enterprise resource planning system integration and migration",
      },
      {
        projectCode: "PRJ-VIC-003",
        name: "VicGov Data Analytics",
        client: "State Gov Victoria",
        clientCode: "VIC",
        clientManager: "Emma Wilson",
        engagementManager: "Sarah Mitchell",
        engagementSupport: null,
        contractType: "retainer",
        billingCategory: "T&M",
        workType: "Advisory",
        panel: "VIC Gov Panel",
        recurring: "Yes",
        vat: "VIC",
        pipelineStatus: "C",
        adStatus: "Active",
        status: "active",
        startDate: "2025-04-01",
        endDate: "2026-03-31",
        workOrderAmount: "500000.00",
        budgetAmount: "480000.00",
        contractValue: "500000.00",
        actualAmount: "215000.00",
        balanceAmount: "285000.00",
        forecastedRevenue: "490000.00",
        forecastedGrossCost: "411600.00",
        varianceAtCompletion: "10000.00",
        variancePercent: "0.0200",
        varianceToContractPercent: "0.0200",
        writeOff: "0.00",
        soldGmPercent: "0.1600",
        toDateGrossProfit: "30000.00",
        toDateGmPercent: "0.1395",
        gpAtCompletion: "78400.00",
        forecastGmPercent: "0.1600",
        opsCommentary: "Retainer renewal on track. R&D costs impacting margins.",
        description: "Data analytics and reporting platform for state government services",
      },
      {
        projectCode: "PRJ-TST-004",
        name: "TechStart Cloud Migration",
        client: "TechStart Inc",
        clientCode: "TST",
        clientManager: "Aisha Patel",
        engagementManager: "Liam O'Brien",
        engagementSupport: null,
        contractType: "fixed_price",
        billingCategory: "Fixed",
        workType: "Delivery",
        panel: null,
        recurring: "No",
        vat: "Emerging",
        pipelineStatus: "C",
        adStatus: "Closed",
        status: "completed",
        startDate: "2025-01-15",
        endDate: "2025-11-30",
        workOrderAmount: "310000.00",
        budgetAmount: "280000.00",
        contractValue: "310000.00",
        actualAmount: "310000.00",
        balanceAmount: "0.00",
        forecastedRevenue: "310000.00",
        forecastedGrossCost: "264000.00",
        varianceAtCompletion: "0.00",
        variancePercent: "0.0000",
        varianceToContractPercent: "0.0000",
        writeOff: "0.00",
        soldGmPercent: "0.1500",
        toDateGrossProfit: "46000.00",
        toDateGmPercent: "0.1484",
        gpAtCompletion: "46000.00",
        forecastGmPercent: "0.1484",
        opsCommentary: "Project completed. Final invoicing done.",
        description: "Cloud infrastructure migration and DevOps pipeline setup",
      },
      {
        projectCode: "PRJ-FED-005",
        name: "Federal Compliance System",
        client: "Federal Services",
        clientCode: "FED",
        clientManager: "James Thompson",
        engagementManager: "Sarah Mitchell",
        engagementSupport: "Priya Sharma",
        contractType: "time_materials",
        billingCategory: "T&M",
        workType: "Delivery",
        panel: "Federal IT Panel",
        recurring: "No",
        vat: "Growth",
        pipelineStatus: "C",
        adStatus: "Pipeline",
        status: "planning",
        startDate: "2026-04-01",
        endDate: "2027-03-31",
        workOrderAmount: "1050000.00",
        budgetAmount: "920000.00",
        contractValue: "1050000.00",
        actualAmount: "0.00",
        balanceAmount: "1050000.00",
        forecastedRevenue: "1020000.00",
        forecastedGrossCost: "816000.00",
        varianceAtCompletion: "30000.00",
        variancePercent: "0.0286",
        varianceToContractPercent: "0.0286",
        writeOff: "0.00",
        soldGmPercent: "0.2200",
        toDateGrossProfit: "0.00",
        toDateGmPercent: "0.0000",
        gpAtCompletion: "204000.00",
        forecastGmPercent: "0.2000",
        opsCommentary: "In planning phase. Awaiting final contract sign-off.",
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
      { name: "Employment Hero", type: "api", connectionInfo: "https://api.employmenthero.com/api/v1", lastSyncAt: new Date("2026-02-11T14:15:00Z"), status: "active", recordsProcessed: 3892, syncFrequency: "daily" },
      { name: "iTimesheets", type: "api", connectionInfo: "https://itimesheets.company.com.au/api/timesheets", lastSyncAt: new Date("2026-02-11T18:00:00Z"), status: "active", recordsProcessed: 2134, syncFrequency: "daily" },
      { name: "SharePoint", type: "api", connectionInfo: "https://company.sharepoint.com/sites/projects/_api", lastSyncAt: new Date("2026-02-10T08:30:00Z"), status: "active", recordsProcessed: 1245, syncFrequency: "hourly" },
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

  const monthLabels = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const projectMonthlyValues = [];
  const projectMonthlyData: Record<number, { rev: number[]; cost: number[] }> = {
    0: {
      rev: [280000, 295000, 310000, 285000, 280000, 295000, 310000, 320000, 335000, 310000, 300000, 290000],
      cost: [220000, 230000, 245000, 225000, 225000, 238000, 245000, 250000, 255000, 240000, 235000, 230000],
    },
    1: {
      rev: [0, 0, 0, 95000, 102000, 98000, 105000, 110000, 100000, 95000, 90000, 85000],
      cost: [0, 0, 0, 85500, 88000, 86500, 90000, 92000, 88000, 82000, 78000, 75000],
    },
    2: {
      rev: [65000, 72000, 78000, 68000, 65000, 72000, 78000, 82000, 85000, 88000, 80000, 75000],
      cost: [83000, 80000, 82000, 75000, 78000, 80000, 82000, 78000, 76000, 75000, 72000, 70000],
    },
    3: {
      rev: [48000, 52000, 55000, 50000, 48000, 52000, 55000, 0, 0, 0, 0, 0],
      cost: [42000, 44000, 46000, 43000, 42000, 44000, 46000, 0, 0, 0, 0, 0],
    },
    4: {
      rev: [0, 0, 0, 0, 0, 0, 0, 0, 0, 120000, 150000, 160000],
      cost: [0, 0, 0, 0, 0, 8000, 8500, 9000, 9500, 95000, 110000, 115000],
    },
  };

  for (let pIdx = 0; pIdx < 5; pIdx++) {
    const data = projectMonthlyData[pIdx];
    for (let m = 0; m < 12; m++) {
      const rev = data.rev[m];
      const cost = data.cost[m];
      projectMonthlyValues.push({
        projectId: projIds[pIdx],
        fyYear: "25-26",
        month: m + 1,
        monthLabel: monthLabels[m],
        revenue: rev.toFixed(2),
        cost: cost.toFixed(2),
        profit: (rev - cost).toFixed(2),
      });
    }
  }

  await db.insert(projectMonthly).values(projectMonthlyValues).onConflictDoNothing();

  const insertedPipeline = await db
    .insert(pipelineOpportunities)
    .values([
      { name: "DTA Digital Identity Phase 2", classification: "C", vat: "Growth", fyYear: "25-26", revenueM1: "45000.00", revenueM2: "48000.00", revenueM3: "52000.00", revenueM4: "55000.00", revenueM5: "58000.00", revenueM6: "60000.00", revenueM7: "62000.00", revenueM8: "65000.00", revenueM9: "60000.00", revenueM10: "55000.00", revenueM11: "50000.00", revenueM12: "45000.00", grossProfitM1: "9000.00", grossProfitM2: "9600.00", grossProfitM3: "10400.00", grossProfitM4: "11000.00", grossProfitM5: "11600.00", grossProfitM6: "12000.00", grossProfitM7: "12400.00", grossProfitM8: "13000.00", grossProfitM9: "12000.00", grossProfitM10: "11000.00", grossProfitM11: "10000.00", grossProfitM12: "9000.00" },
      { name: "ATO Data Platform Uplift", classification: "C", vat: "Growth", fyYear: "25-26", revenueM1: "120000.00", revenueM2: "125000.00", revenueM3: "130000.00", revenueM4: "135000.00", revenueM5: "140000.00", revenueM6: "135000.00", revenueM7: "130000.00", revenueM8: "125000.00", revenueM9: "120000.00", revenueM10: "115000.00", revenueM11: "110000.00", revenueM12: "105000.00", grossProfitM1: "24000.00", grossProfitM2: "25000.00", grossProfitM3: "26000.00", grossProfitM4: "27000.00", grossProfitM5: "28000.00", grossProfitM6: "27000.00", grossProfitM7: "26000.00", grossProfitM8: "25000.00", grossProfitM9: "24000.00", grossProfitM10: "23000.00", grossProfitM11: "22000.00", grossProfitM12: "21000.00" },
      { name: "Services Australia CX Redesign", classification: "S", vat: "Growth", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "35000.00", revenueM5: "70000.00", revenueM6: "85000.00", revenueM7: "90000.00", revenueM8: "95000.00", revenueM9: "90000.00", revenueM10: "85000.00", revenueM11: "80000.00", revenueM12: "75000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "7000.00", grossProfitM5: "14000.00", grossProfitM6: "17000.00", grossProfitM7: "18000.00", grossProfitM8: "19000.00", grossProfitM9: "18000.00", grossProfitM10: "17000.00", grossProfitM11: "16000.00", grossProfitM12: "15000.00" },
      { name: "NBN Co Analytics Advisory", classification: "S", vat: "VIC", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "25000.00", revenueM4: "30000.00", revenueM5: "35000.00", revenueM6: "40000.00", revenueM7: "40000.00", revenueM8: "35000.00", revenueM9: "30000.00", revenueM10: "25000.00", revenueM11: "20000.00", revenueM12: "15000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "5000.00", grossProfitM4: "6000.00", grossProfitM5: "7000.00", grossProfitM6: "8000.00", grossProfitM7: "8000.00", grossProfitM8: "7000.00", grossProfitM9: "6000.00", grossProfitM10: "5000.00", grossProfitM11: "4000.00", grossProfitM12: "3000.00" },
      { name: "Telstra Security Uplift", classification: "DVF", vat: "Growth", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "45000.00", revenueM7: "90000.00", revenueM8: "120000.00", revenueM9: "120000.00", revenueM10: "110000.00", revenueM11: "100000.00", revenueM12: "90000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "11250.00", grossProfitM7: "22500.00", grossProfitM8: "30000.00", grossProfitM9: "30000.00", grossProfitM10: "27500.00", grossProfitM11: "25000.00", grossProfitM12: "22500.00" },
      { name: "Optus Cloud Migration", classification: "DVF", vat: "Growth", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "0.00", revenueM7: "55000.00", revenueM8: "75000.00", revenueM9: "85000.00", revenueM10: "90000.00", revenueM11: "85000.00", revenueM12: "80000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "0.00", grossProfitM7: "11000.00", grossProfitM8: "15000.00", grossProfitM9: "17000.00", grossProfitM10: "18000.00", grossProfitM11: "17000.00", grossProfitM12: "16000.00" },
      { name: "VicRoads Digital Twin", classification: "DF", vat: "VIC", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "0.00", revenueM7: "0.00", revenueM8: "40000.00", revenueM9: "65000.00", revenueM10: "80000.00", revenueM11: "85000.00", revenueM12: "90000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "0.00", grossProfitM7: "0.00", grossProfitM8: "8000.00", grossProfitM9: "13000.00", grossProfitM10: "16000.00", grossProfitM11: "17000.00", grossProfitM12: "18000.00" },
      { name: "DHHS Case Management", classification: "DF", vat: "VIC", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "0.00", revenueM7: "0.00", revenueM8: "0.00", revenueM9: "35000.00", revenueM10: "55000.00", revenueM11: "70000.00", revenueM12: "75000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "0.00", grossProfitM7: "0.00", grossProfitM8: "0.00", grossProfitM9: "7000.00", grossProfitM10: "11000.00", grossProfitM11: "14000.00", grossProfitM12: "15000.00" },
      { name: "BHP Mine Automation Advisory", classification: "Q", vat: "Emerging", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "25000.00", revenueM6: "35000.00", revenueM7: "45000.00", revenueM8: "50000.00", revenueM9: "50000.00", revenueM10: "45000.00", revenueM11: "40000.00", revenueM12: "35000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "6250.00", grossProfitM6: "8750.00", grossProfitM7: "11250.00", grossProfitM8: "12500.00", grossProfitM9: "12500.00", grossProfitM10: "11250.00", grossProfitM11: "10000.00", grossProfitM12: "8750.00" },
      { name: "Rio Tinto ESG Dashboard", classification: "Q", vat: "Emerging", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "20000.00", revenueM7: "30000.00", revenueM8: "40000.00", revenueM9: "45000.00", revenueM10: "40000.00", revenueM11: "35000.00", revenueM12: "30000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "4000.00", grossProfitM7: "6000.00", grossProfitM8: "8000.00", grossProfitM9: "9000.00", grossProfitM10: "8000.00", grossProfitM11: "7000.00", grossProfitM12: "6000.00" },
      { name: "ANZ Bank API Platform", classification: "A", vat: "Growth", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "0.00", revenueM7: "0.00", revenueM8: "0.00", revenueM9: "0.00", revenueM10: "60000.00", revenueM11: "80000.00", revenueM12: "95000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "0.00", grossProfitM7: "0.00", grossProfitM8: "0.00", grossProfitM9: "0.00", grossProfitM10: "12000.00", grossProfitM11: "16000.00", grossProfitM12: "19000.00" },
      { name: "Westpac Data Governance", classification: "A", vat: "Growth", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "0.00", revenueM7: "0.00", revenueM8: "0.00", revenueM9: "0.00", revenueM10: "0.00", revenueM11: "45000.00", revenueM12: "65000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "0.00", grossProfitM7: "0.00", grossProfitM8: "0.00", grossProfitM9: "0.00", grossProfitM10: "0.00", grossProfitM11: "9000.00", grossProfitM12: "13000.00" },
      { name: "Medicare Digital Transformation", classification: "S", vat: "Growth", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "45000.00", revenueM6: "65000.00", revenueM7: "80000.00", revenueM8: "85000.00", revenueM9: "80000.00", revenueM10: "75000.00", revenueM11: "70000.00", revenueM12: "65000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "9000.00", grossProfitM6: "13000.00", grossProfitM7: "16000.00", grossProfitM8: "17000.00", grossProfitM9: "16000.00", grossProfitM10: "15000.00", grossProfitM11: "14000.00", grossProfitM12: "13000.00" },
      { name: "Qantas Loyalty Platform", classification: "DVF", vat: "Emerging", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "0.00", revenueM7: "35000.00", revenueM8: "55000.00", revenueM9: "70000.00", revenueM10: "75000.00", revenueM11: "70000.00", revenueM12: "65000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "0.00", grossProfitM7: "7000.00", grossProfitM8: "11000.00", grossProfitM9: "14000.00", grossProfitM10: "15000.00", grossProfitM11: "14000.00", grossProfitM12: "13000.00" },
      { name: "Woodside Energy IoT Monitoring", classification: "Q", vat: "Emerging", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "0.00", revenueM7: "20000.00", revenueM8: "30000.00", revenueM9: "40000.00", revenueM10: "45000.00", revenueM11: "50000.00", revenueM12: "45000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "0.00", grossProfitM7: "4000.00", grossProfitM8: "6000.00", grossProfitM9: "8000.00", grossProfitM10: "9000.00", grossProfitM11: "10000.00", grossProfitM12: "9000.00" },
    ])
    .onConflictDoNothing()
    .returning();

  const pipelineIds = insertedPipeline.map((p) => p.id);

  const insertedScenarios = await db
    .insert(scenarios)
    .values([
      { name: "Base Case", description: "Conservative forecast using current pipeline probabilities", fyYear: "25-26", revenueGoal: "8500000.00", marginGoalPercent: "18.00" },
      { name: "Optimistic", description: "Aggressive growth scenario with higher win rates and faster starts", fyYear: "25-26", revenueGoal: "10500000.00", marginGoalPercent: "22.00" },
    ])
    .onConflictDoNothing()
    .returning();

  const scenarioIds = insertedScenarios.map((s) => s.id);

  if (scenarioIds.length >= 2 && pipelineIds.length >= 5) {
    await db
      .insert(scenarioAdjustments)
      .values([
        { scenarioId: scenarioIds[0], opportunityId: pipelineIds[0], classification: "C", adjustmentType: "win_probability", winProbability: "90.00", notes: "High confidence - strong client relationship" },
        { scenarioId: scenarioIds[0], opportunityId: pipelineIds[2], classification: "S", adjustmentType: "win_probability", winProbability: "60.00", notes: "Competitive tender, moderate probability" },
        { scenarioId: scenarioIds[0], opportunityId: pipelineIds[4], classification: "DVF", adjustmentType: "win_probability", winProbability: "40.00", notes: "Early stage, uncertain timeline" },
        { scenarioId: scenarioIds[0], opportunityId: pipelineIds[6], classification: "DF", adjustmentType: "revenue_override", revenueOverride: "300000.00", notes: "Reduced scope expected" },
        { scenarioId: scenarioIds[1], opportunityId: pipelineIds[0], classification: "C", adjustmentType: "win_probability", winProbability: "95.00", notes: "Near certain - verbal commitment received" },
        { scenarioId: scenarioIds[1], opportunityId: pipelineIds[2], classification: "S", adjustmentType: "win_probability", winProbability: "80.00", notes: "Positive signals from client" },
        { scenarioId: scenarioIds[1], opportunityId: pipelineIds[4], classification: "DVF", adjustmentType: "win_probability", winProbability: "65.00", notes: "Accelerated timeline expected" },
        { scenarioId: scenarioIds[1], opportunityId: pipelineIds[4], classification: "DVF", adjustmentType: "start_month_shift", startMonthShift: -1, notes: "Start one month earlier" },
        { scenarioId: scenarioIds[1], opportunityId: pipelineIds[8], classification: "Q", adjustmentType: "win_probability", winProbability: "50.00", notes: "Mining sector recovering" },
        { scenarioId: scenarioIds[1], opportunityId: pipelineIds[10], classification: "A", adjustmentType: "revenue_override", revenueOverride: "280000.00", notes: "Expanded scope likely" },
      ])
      .onConflictDoNothing();
  }

  console.log("Seed data created successfully");
}

async function seedPipelineAndScenarios() {
  const existingProjects = await db.select().from(projects);
  const projMap: Record<string, number> = {};
  for (const p of existingProjects) {
    projMap[p.projectCode] = p.id;
  }

  for (const p of existingProjects) {
    let billingCategory = p.billingCategory;
    let vat = p.vat;
    if (!billingCategory) {
      billingCategory = p.contractType === "fixed_price" ? "Fixed" : "T&M";
    }
    if (!vat) {
      if (p.client?.includes("Defence") || p.client?.includes("Federal")) vat = "Growth";
      else if (p.client?.includes("Victoria")) vat = "VIC";
      else vat = "Emerging";
    }
    if (billingCategory !== p.billingCategory || vat !== p.vat) {
      await db.update(projects).set({ billingCategory, vat }).where(
        eq(projects.id, p.id)
      );
    }
  }

  const monthLabels = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  const existingProjectMonthly = await db.select().from(projectMonthly).limit(1);
  if (existingProjectMonthly.length === 0) {
    const projectMonthlyValues: any[] = [];
    const projectMonthlyData: Record<string, { rev: number[]; cost: number[] }> = {
      "PRJ-DEF-001": {
        rev: [280000, 295000, 310000, 285000, 280000, 295000, 310000, 320000, 335000, 310000, 300000, 290000],
        cost: [220000, 230000, 245000, 225000, 225000, 238000, 245000, 250000, 255000, 240000, 235000, 230000],
      },
      "PRJ-ACM-002": {
        rev: [0, 0, 0, 95000, 102000, 98000, 105000, 110000, 100000, 95000, 90000, 85000],
        cost: [0, 0, 0, 85500, 88000, 86500, 90000, 92000, 88000, 82000, 78000, 75000],
      },
      "PRJ-VIC-003": {
        rev: [65000, 72000, 78000, 68000, 65000, 72000, 78000, 82000, 85000, 88000, 80000, 75000],
        cost: [83000, 80000, 82000, 75000, 78000, 80000, 82000, 78000, 76000, 75000, 72000, 70000],
      },
      "PRJ-TST-004": {
        rev: [48000, 52000, 55000, 50000, 48000, 52000, 55000, 0, 0, 0, 0, 0],
        cost: [42000, 44000, 46000, 43000, 42000, 44000, 46000, 0, 0, 0, 0, 0],
      },
      "PRJ-FED-005": {
        rev: [0, 0, 0, 0, 0, 0, 0, 0, 0, 120000, 150000, 160000],
        cost: [0, 0, 0, 0, 0, 8000, 8500, 9000, 9500, 95000, 110000, 115000],
      },
    };

    for (const [code, data] of Object.entries(projectMonthlyData)) {
      const projId = projMap[code];
      if (!projId) continue;
      for (let m = 0; m < 12; m++) {
        const rev = data.rev[m];
        const cost = data.cost[m];
        projectMonthlyValues.push({
          projectId: projId,
          fyYear: "25-26",
          month: m + 1,
          monthLabel: monthLabels[m],
          revenue: rev.toFixed(2),
          cost: cost.toFixed(2),
          profit: (rev - cost).toFixed(2),
        });
      }
    }
    if (projectMonthlyValues.length > 0) {
      await db.insert(projectMonthly).values(projectMonthlyValues).onConflictDoNothing();
    }
  }

  const insertedPipeline = await db
    .insert(pipelineOpportunities)
    .values([
      { name: "DTA Digital Identity Phase 2", classification: "C", vat: "Growth", fyYear: "25-26", revenueM1: "45000.00", revenueM2: "48000.00", revenueM3: "52000.00", revenueM4: "55000.00", revenueM5: "58000.00", revenueM6: "60000.00", revenueM7: "62000.00", revenueM8: "65000.00", revenueM9: "60000.00", revenueM10: "55000.00", revenueM11: "50000.00", revenueM12: "45000.00", grossProfitM1: "9000.00", grossProfitM2: "9600.00", grossProfitM3: "10400.00", grossProfitM4: "11000.00", grossProfitM5: "11600.00", grossProfitM6: "12000.00", grossProfitM7: "12400.00", grossProfitM8: "13000.00", grossProfitM9: "12000.00", grossProfitM10: "11000.00", grossProfitM11: "10000.00", grossProfitM12: "9000.00" },
      { name: "ATO Data Platform Uplift", classification: "C", vat: "Growth", fyYear: "25-26", revenueM1: "120000.00", revenueM2: "125000.00", revenueM3: "130000.00", revenueM4: "135000.00", revenueM5: "140000.00", revenueM6: "135000.00", revenueM7: "130000.00", revenueM8: "125000.00", revenueM9: "120000.00", revenueM10: "115000.00", revenueM11: "110000.00", revenueM12: "105000.00", grossProfitM1: "24000.00", grossProfitM2: "25000.00", grossProfitM3: "26000.00", grossProfitM4: "27000.00", grossProfitM5: "28000.00", grossProfitM6: "27000.00", grossProfitM7: "26000.00", grossProfitM8: "25000.00", grossProfitM9: "24000.00", grossProfitM10: "23000.00", grossProfitM11: "22000.00", grossProfitM12: "21000.00" },
      { name: "Services Australia CX Redesign", classification: "S", vat: "Growth", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "35000.00", revenueM5: "70000.00", revenueM6: "85000.00", revenueM7: "90000.00", revenueM8: "95000.00", revenueM9: "90000.00", revenueM10: "85000.00", revenueM11: "80000.00", revenueM12: "75000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "7000.00", grossProfitM5: "14000.00", grossProfitM6: "17000.00", grossProfitM7: "18000.00", grossProfitM8: "19000.00", grossProfitM9: "18000.00", grossProfitM10: "17000.00", grossProfitM11: "16000.00", grossProfitM12: "15000.00" },
      { name: "NBN Co Analytics Advisory", classification: "S", vat: "VIC", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "25000.00", revenueM4: "30000.00", revenueM5: "35000.00", revenueM6: "40000.00", revenueM7: "40000.00", revenueM8: "35000.00", revenueM9: "30000.00", revenueM10: "25000.00", revenueM11: "20000.00", revenueM12: "15000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "5000.00", grossProfitM4: "6000.00", grossProfitM5: "7000.00", grossProfitM6: "8000.00", grossProfitM7: "8000.00", grossProfitM8: "7000.00", grossProfitM9: "6000.00", grossProfitM10: "5000.00", grossProfitM11: "4000.00", grossProfitM12: "3000.00" },
      { name: "Telstra Security Uplift", classification: "DVF", vat: "Growth", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "45000.00", revenueM7: "90000.00", revenueM8: "120000.00", revenueM9: "120000.00", revenueM10: "110000.00", revenueM11: "100000.00", revenueM12: "90000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "11250.00", grossProfitM7: "22500.00", grossProfitM8: "30000.00", grossProfitM9: "30000.00", grossProfitM10: "27500.00", grossProfitM11: "25000.00", grossProfitM12: "22500.00" },
      { name: "Optus Cloud Migration", classification: "DVF", vat: "Growth", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "0.00", revenueM7: "55000.00", revenueM8: "75000.00", revenueM9: "85000.00", revenueM10: "90000.00", revenueM11: "85000.00", revenueM12: "80000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "0.00", grossProfitM7: "11000.00", grossProfitM8: "15000.00", grossProfitM9: "17000.00", grossProfitM10: "18000.00", grossProfitM11: "17000.00", grossProfitM12: "16000.00" },
      { name: "VicRoads Digital Twin", classification: "DF", vat: "VIC", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "0.00", revenueM7: "0.00", revenueM8: "40000.00", revenueM9: "65000.00", revenueM10: "80000.00", revenueM11: "85000.00", revenueM12: "90000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "0.00", grossProfitM7: "0.00", grossProfitM8: "8000.00", grossProfitM9: "13000.00", grossProfitM10: "16000.00", grossProfitM11: "17000.00", grossProfitM12: "18000.00" },
      { name: "DHHS Case Management", classification: "DF", vat: "VIC", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "0.00", revenueM7: "0.00", revenueM8: "0.00", revenueM9: "35000.00", revenueM10: "55000.00", revenueM11: "70000.00", revenueM12: "75000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "0.00", grossProfitM7: "0.00", grossProfitM8: "0.00", grossProfitM9: "7000.00", grossProfitM10: "11000.00", grossProfitM11: "14000.00", grossProfitM12: "15000.00" },
      { name: "BHP Mine Automation Advisory", classification: "Q", vat: "Emerging", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "25000.00", revenueM6: "35000.00", revenueM7: "45000.00", revenueM8: "50000.00", revenueM9: "50000.00", revenueM10: "45000.00", revenueM11: "40000.00", revenueM12: "35000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "6250.00", grossProfitM6: "8750.00", grossProfitM7: "11250.00", grossProfitM8: "12500.00", grossProfitM9: "12500.00", grossProfitM10: "11250.00", grossProfitM11: "10000.00", grossProfitM12: "8750.00" },
      { name: "Rio Tinto ESG Dashboard", classification: "Q", vat: "Emerging", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "20000.00", revenueM7: "30000.00", revenueM8: "40000.00", revenueM9: "45000.00", revenueM10: "40000.00", revenueM11: "35000.00", revenueM12: "30000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "4000.00", grossProfitM7: "6000.00", grossProfitM8: "8000.00", grossProfitM9: "9000.00", grossProfitM10: "8000.00", grossProfitM11: "7000.00", grossProfitM12: "6000.00" },
      { name: "ANZ Bank API Platform", classification: "A", vat: "Growth", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "0.00", revenueM7: "0.00", revenueM8: "0.00", revenueM9: "0.00", revenueM10: "60000.00", revenueM11: "80000.00", revenueM12: "95000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "0.00", grossProfitM7: "0.00", grossProfitM8: "0.00", grossProfitM9: "0.00", grossProfitM10: "12000.00", grossProfitM11: "16000.00", grossProfitM12: "19000.00" },
      { name: "Westpac Data Governance", classification: "A", vat: "Growth", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "0.00", revenueM7: "0.00", revenueM8: "0.00", revenueM9: "0.00", revenueM10: "0.00", revenueM11: "45000.00", revenueM12: "65000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "0.00", grossProfitM7: "0.00", grossProfitM8: "0.00", grossProfitM9: "0.00", grossProfitM10: "0.00", grossProfitM11: "9000.00", grossProfitM12: "13000.00" },
      { name: "Medicare Digital Transformation", classification: "S", vat: "Growth", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "45000.00", revenueM6: "65000.00", revenueM7: "80000.00", revenueM8: "85000.00", revenueM9: "80000.00", revenueM10: "75000.00", revenueM11: "70000.00", revenueM12: "65000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "9000.00", grossProfitM6: "13000.00", grossProfitM7: "16000.00", grossProfitM8: "17000.00", grossProfitM9: "16000.00", grossProfitM10: "15000.00", grossProfitM11: "14000.00", grossProfitM12: "13000.00" },
      { name: "Qantas Loyalty Platform", classification: "DVF", vat: "Emerging", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "0.00", revenueM7: "35000.00", revenueM8: "55000.00", revenueM9: "70000.00", revenueM10: "75000.00", revenueM11: "70000.00", revenueM12: "65000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "0.00", grossProfitM7: "7000.00", grossProfitM8: "11000.00", grossProfitM9: "14000.00", grossProfitM10: "15000.00", grossProfitM11: "14000.00", grossProfitM12: "13000.00" },
      { name: "Woodside Energy IoT Monitoring", classification: "Q", vat: "Emerging", fyYear: "25-26", revenueM1: "0.00", revenueM2: "0.00", revenueM3: "0.00", revenueM4: "0.00", revenueM5: "0.00", revenueM6: "0.00", revenueM7: "20000.00", revenueM8: "30000.00", revenueM9: "40000.00", revenueM10: "45000.00", revenueM11: "50000.00", revenueM12: "45000.00", grossProfitM1: "0.00", grossProfitM2: "0.00", grossProfitM3: "0.00", grossProfitM4: "0.00", grossProfitM5: "0.00", grossProfitM6: "0.00", grossProfitM7: "4000.00", grossProfitM8: "6000.00", grossProfitM9: "8000.00", grossProfitM10: "9000.00", grossProfitM11: "10000.00", grossProfitM12: "9000.00" },
    ])
    .onConflictDoNothing()
    .returning();

  const pipelineIds = insertedPipeline.map((p) => p.id);

  const insertedScenarios = await db
    .insert(scenarios)
    .values([
      { name: "Base Case", description: "Conservative forecast using current pipeline probabilities", fyYear: "25-26", revenueGoal: "8500000.00", marginGoalPercent: "18.00" },
      { name: "Optimistic", description: "Aggressive growth scenario with higher win rates", fyYear: "25-26", revenueGoal: "10500000.00", marginGoalPercent: "22.00" },
    ])
    .onConflictDoNothing()
    .returning();

  const scenarioIds = insertedScenarios.map((s) => s.id);

  if (scenarioIds.length >= 2 && pipelineIds.length >= 5) {
    await db
      .insert(scenarioAdjustments)
      .values([
        { scenarioId: scenarioIds[0], opportunityId: pipelineIds[0], classification: "C", adjustmentType: "win_probability", winProbability: "90.00", notes: "High confidence" },
        { scenarioId: scenarioIds[0], opportunityId: pipelineIds[2], classification: "S", adjustmentType: "win_probability", winProbability: "60.00", notes: "Competitive tender" },
        { scenarioId: scenarioIds[1], opportunityId: pipelineIds[0], classification: "C", adjustmentType: "win_probability", winProbability: "95.00", notes: "Near certain" },
        { scenarioId: scenarioIds[1], opportunityId: pipelineIds[2], classification: "S", adjustmentType: "win_probability", winProbability: "80.00", notes: "Positive signals" },
      ])
      .onConflictDoNothing();
  }

  console.log("Pipeline and scenario seed data created successfully");
}
