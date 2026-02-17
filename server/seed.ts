import { db } from "./db";

export async function seedDatabase() {
  const existingPipeline = await db("pipeline_opportunities").select("id").limit(1);
  if (existingPipeline.length > 0) return;

  const existingEmployees = await db("employees").select("id").limit(1);
  if (existingEmployees.length > 0) {
    await seedPipelineAndScenarios();
    return;
  }

  const insertedEmployees = await db("employees")
    .insert([
      { employee_code: "EMP001", first_name: "Sarah", last_name: "Mitchell", email: "sarah.mitchell@company.com.au", role: "Senior Consultant", cost_band_level: "C4", staff_type: "Consultant", grade: "P4", location: "Melbourne", cost_center: "CC-200", security_clearance: "NV1", payroll_tax: true, payroll_tax_rate: "0.0485", base_cost: "680.00", gross_cost_rate: "713.98", base_salary: "145000.00", status: "active", start_date: "2021-03-15", schedule_start: "2025-07-01", schedule_end: "2026-06-30", resource_group: "Consulting", team: "CSD", jid: "JID-1001", onboarding_status: "completed" },
      { employee_code: "EMP002", first_name: "James", last_name: "Thompson", email: "james.thompson@company.com.au", role: "Project Manager", cost_band_level: "C5", staff_type: "Consultant", grade: "P5", location: "Canberra", cost_center: "CC-100", security_clearance: "NV2", payroll_tax: true, payroll_tax_rate: "0.0485", base_cost: "780.00", gross_cost_rate: "817.83", base_salary: "165000.00", status: "active", start_date: "2019-07-01", schedule_start: "2025-07-01", schedule_end: "2026-06-30", resource_group: "Management", team: "CSD", jid: "JID-1002", onboarding_status: "completed" },
      { employee_code: "EMP003", first_name: "Priya", last_name: "Sharma", email: "priya.sharma@company.com.au", role: "Developer", cost_band_level: "E3", staff_type: "Engineer", grade: "P3", location: "Melbourne", cost_center: "CC-300", security_clearance: "Baseline", payroll_tax: true, payroll_tax_rate: "0.0485", base_cost: "560.00", gross_cost_rate: "587.16", base_salary: "120000.00", status: "active", start_date: "2022-01-10", schedule_start: "2025-07-01", schedule_end: "2026-06-30", resource_group: "Engineering", team: "CSD", jid: "JID-1003", onboarding_status: "completed" },
      { employee_code: "EMP004", first_name: "Michael", last_name: "Chen", email: "michael.chen@company.com.au", role: "Analyst", cost_band_level: "C2", staff_type: "Consultant", grade: "P2", location: "Sydney", cost_center: "CC-200", security_clearance: null, payroll_tax: true, payroll_tax_rate: "0.0485", base_cost: "440.00", gross_cost_rate: "461.34", base_salary: "95000.00", status: "active", start_date: "2023-06-20", schedule_start: "2025-07-01", schedule_end: "2026-06-30", resource_group: "Consulting", team: "CSD", jid: "JID-1004", onboarding_status: "completed" },
      { employee_code: "EMP005", first_name: "Emma", last_name: "Wilson", email: "emma.wilson@company.com.au", role: "Business Analyst", cost_band_level: "C3", staff_type: "Consultant", grade: "P3", location: "Canberra", cost_center: "CC-200", security_clearance: "NV1", payroll_tax: false, payroll_tax_rate: "0.0485", base_cost: "540.00", gross_cost_rate: "540.00", base_salary: "115000.00", status: "active", start_date: "2022-09-05", schedule_start: "2025-07-01", schedule_end: "2026-06-30", resource_group: "Consulting", team: "CSD", jid: "JID-1005", onboarding_status: "completed" },
      { employee_code: "EMP006", first_name: "Liam", last_name: "O'Brien", email: "liam.obrien@company.com.au", role: "Developer", cost_band_level: "E4", staff_type: "Engineer", grade: "P4", location: "Melbourne", cost_center: "CC-300", security_clearance: "NV2", payroll_tax: true, payroll_tax_rate: "0.0485", base_cost: "650.00", gross_cost_rate: "681.53", base_salary: "140000.00", status: "active", start_date: "2020-11-02", schedule_start: "2025-07-01", schedule_end: "2026-06-30", resource_group: "Engineering", team: "CSD", jid: "JID-1006", onboarding_status: "completed" },
      { employee_code: "EMP007", first_name: "Aisha", last_name: "Patel", email: "aisha.patel@company.com.au", role: "Senior Consultant", cost_band_level: "C4", staff_type: "Consultant", grade: "P4", location: "Sydney", cost_center: "CC-200", security_clearance: "NV1", payroll_tax: true, payroll_tax_rate: "0.0485", base_cost: "700.00", gross_cost_rate: "733.95", base_salary: "150000.00", status: "active", start_date: "2021-05-17", schedule_start: "2025-07-01", schedule_end: "2026-06-30", resource_group: "Consulting", team: "CSD", jid: "JID-1007", onboarding_status: "completed" },
      { employee_code: "EMP008", first_name: "Daniel", last_name: "Nguyen", email: "daniel.nguyen@company.com.au", role: "Analyst", cost_band_level: "C1", staff_type: "Contractor", grade: "P1", location: "Melbourne", cost_center: "CC-200", security_clearance: null, payroll_tax: false, payroll_tax_rate: "0.0485", base_cost: "350.00", gross_cost_rate: "350.00", base_salary: "78000.00", status: "active", start_date: "2024-08-12", schedule_start: "2025-07-01", schedule_end: "2026-06-30", resource_group: "Consulting", team: "CSD", jid: "JID-1008", onboarding_status: "completed" },
      { employee_code: "EMP009", first_name: "Rachel", last_name: "Kim", email: "rachel.kim@company.com.au", role: "Developer", cost_band_level: "E2", staff_type: "Engineer", grade: "P2", location: "Sydney", cost_center: "CC-300", security_clearance: "Baseline", payroll_tax: true, payroll_tax_rate: "0.0485", base_cost: "460.00", gross_cost_rate: "482.31", base_salary: "98000.00", status: "onboarding", start_date: "2026-02-17", schedule_start: "2025-07-01", schedule_end: "2026-06-30", resource_group: "Engineering", team: "CSD", jid: "JID-1009", onboarding_status: "in_progress" },
    ])
    .returning("*");

  const empIds = insertedEmployees.map((e: any) => e.id);

  const insertedProjects = await db("projects")
    .insert([
      { project_code: "PRJ-DEF-001", name: "Defence Modernisation Platform", client: "Department of Defence", client_code: "DOD", client_manager: "James Thompson", engagement_manager: "Sarah Mitchell", engagement_support: "Emma Wilson", contract_type: "fixed_price", billing_category: "Fixed", work_type: "Delivery", panel: "Defence ICT", recurring: "No", vat: "Growth", pipeline_status: "C", ad_status: "Active", status: "active", start_date: "2025-07-01", end_date: "2026-12-31", work_order_amount: "2000000.00", budget_amount: "1850000.00", contract_value: "2000000.00", actual_amount: "885000.00", balance_amount: "1115000.00", forecasted_revenue: "1950000.00", forecasted_gross_cost: "1560000.00", variance_at_completion: "50000.00", variance_percent: "0.0250", variance_to_contract_percent: "0.0250", write_off: "0.00", sold_gm_percent: "0.2200", to_date_gross_profit: "195000.00", to_date_gm_percent: "0.2203", gp_at_completion: "390000.00", forecast_gm_percent: "0.2000", ops_commentary: "On track. Phase 1 delivered successfully. Phase 2 commencing.", description: "Digital transformation program for defence logistics systems" },
      { project_code: "PRJ-ACM-002", name: "ACME ERP Integration", client: "ACME Corp", client_code: "ACM", client_manager: "Aisha Patel", engagement_manager: "James Thompson", engagement_support: "Michael Chen", contract_type: "time_materials", billing_category: "T&M", work_type: "Delivery", panel: null, recurring: "No", vat: "Growth", pipeline_status: "C", ad_status: "Active", status: "active", start_date: "2025-10-01", end_date: "2026-09-30", work_order_amount: "720000.00", budget_amount: "650000.00", contract_value: "720000.00", actual_amount: "295000.00", balance_amount: "425000.00", forecasted_revenue: "700000.00", forecasted_gross_cost: "574000.00", variance_at_completion: "20000.00", variance_percent: "0.0278", variance_to_contract_percent: "0.0278", write_off: "0.00", sold_gm_percent: "0.1800", to_date_gross_profit: "55000.00", to_date_gm_percent: "0.1864", gp_at_completion: "126000.00", forecast_gm_percent: "0.1800", ops_commentary: "Integration testing underway. Client engagement positive.", description: "Enterprise resource planning system integration and migration" },
      { project_code: "PRJ-VIC-003", name: "VicGov Data Analytics", client: "State Gov Victoria", client_code: "VIC", client_manager: "Emma Wilson", engagement_manager: "Sarah Mitchell", engagement_support: null, contract_type: "retainer", billing_category: "T&M", work_type: "Advisory", panel: "VIC Gov Panel", recurring: "Yes", vat: "VIC", pipeline_status: "C", ad_status: "Active", status: "active", start_date: "2025-04-01", end_date: "2026-03-31", work_order_amount: "500000.00", budget_amount: "480000.00", contract_value: "500000.00", actual_amount: "215000.00", balance_amount: "285000.00", forecasted_revenue: "490000.00", forecasted_gross_cost: "411600.00", variance_at_completion: "10000.00", variance_percent: "0.0200", variance_to_contract_percent: "0.0200", write_off: "0.00", sold_gm_percent: "0.1600", to_date_gross_profit: "30000.00", to_date_gm_percent: "0.1395", gp_at_completion: "78400.00", forecast_gm_percent: "0.1600", ops_commentary: "Retainer renewal on track. R&D costs impacting margins.", description: "Data analytics and reporting platform for state government services" },
      { project_code: "PRJ-TST-004", name: "TechStart Cloud Migration", client: "TechStart Inc", client_code: "TST", client_manager: "Aisha Patel", engagement_manager: "Liam O'Brien", engagement_support: null, contract_type: "fixed_price", billing_category: "Fixed", work_type: "Delivery", panel: null, recurring: "No", vat: "Emerging", pipeline_status: "C", ad_status: "Closed", status: "completed", start_date: "2025-01-15", end_date: "2025-11-30", work_order_amount: "310000.00", budget_amount: "280000.00", contract_value: "310000.00", actual_amount: "310000.00", balance_amount: "0.00", forecasted_revenue: "310000.00", forecasted_gross_cost: "264000.00", variance_at_completion: "0.00", variance_percent: "0.0000", variance_to_contract_percent: "0.0000", write_off: "0.00", sold_gm_percent: "0.1500", to_date_gross_profit: "46000.00", to_date_gm_percent: "0.1484", gp_at_completion: "46000.00", forecast_gm_percent: "0.1484", ops_commentary: "Project completed. Final invoicing done.", description: "Cloud infrastructure migration and DevOps pipeline setup" },
      { project_code: "PRJ-FED-005", name: "Federal Compliance System", client: "Federal Services", client_code: "FED", client_manager: "James Thompson", engagement_manager: "Sarah Mitchell", engagement_support: "Priya Sharma", contract_type: "time_materials", billing_category: "T&M", work_type: "Delivery", panel: "Federal IT Panel", recurring: "No", vat: "Growth", pipeline_status: "C", ad_status: "Pipeline", status: "planning", start_date: "2026-04-01", end_date: "2027-03-31", work_order_amount: "1050000.00", budget_amount: "920000.00", contract_value: "1050000.00", actual_amount: "0.00", balance_amount: "1050000.00", forecasted_revenue: "1020000.00", forecasted_gross_cost: "816000.00", variance_at_completion: "30000.00", variance_percent: "0.0286", variance_to_contract_percent: "0.0286", write_off: "0.00", sold_gm_percent: "0.2200", to_date_gross_profit: "0.00", to_date_gm_percent: "0.0000", gp_at_completion: "204000.00", forecast_gm_percent: "0.2000", ops_commentary: "In planning phase. Awaiting final contract sign-off.", description: "Regulatory compliance tracking and audit management system" },
    ])
    .returning("*");

  const projIds = insertedProjects.map((p: any) => p.id);

  await db("rate_cards").insert([
    { role: "Senior Consultant", grade: "P4", location: "Melbourne", base_rate: "850.00", charge_rate: "1350.00", effective_from: "2025-07-01", currency: "AUD" },
    { role: "Senior Consultant", grade: "P4", location: "Sydney", base_rate: "880.00", charge_rate: "1400.00", effective_from: "2025-07-01", currency: "AUD" },
    { role: "Project Manager", grade: "P5", location: "Canberra", base_rate: "950.00", charge_rate: "1500.00", effective_from: "2025-07-01", currency: "AUD" },
    { role: "Developer", grade: "P3", location: "Melbourne", base_rate: "700.00", charge_rate: "1100.00", effective_from: "2025-07-01", currency: "AUD" },
    { role: "Developer", grade: "P4", location: "Melbourne", base_rate: "820.00", charge_rate: "1300.00", effective_from: "2025-07-01", currency: "AUD" },
    { role: "Analyst", grade: "P2", location: "Sydney", base_rate: "550.00", charge_rate: "900.00", effective_from: "2025-07-01", currency: "AUD" },
    { role: "Business Analyst", grade: "P3", location: "Canberra", base_rate: "680.00", charge_rate: "1050.00", effective_from: "2025-07-01", currency: "AUD" },
    { role: "Analyst", grade: "P1", location: "Melbourne", base_rate: "450.00", charge_rate: "750.00", effective_from: "2025-07-01", currency: "AUD" },
  ]);

  const resourcePlanValues: any[] = [];
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
        project_id: projIds[alloc.projIdx],
        employee_id: empIds[alloc.empIdx],
        month,
        planned_days: alloc.days,
        planned_hours: alloc.hours,
        allocation_percent: alloc.percent,
      });
    }
  }

  await db("resource_plans").insert(resourcePlanValues);

  const weekEndings = ["2026-01-09", "2026-01-16", "2026-01-23", "2026-01-30", "2026-02-06"];
  const timesheetValues: any[] = [];
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
        employee_id: empIds[entry.empIdx],
        project_id: projIds[entry.projIdx],
        week_ending: week,
        hours_worked: entry.hours,
        days_worked: entry.days,
        billable: entry.billable,
        source: entry.source,
        status: "submitted",
      });
    }
  }

  await db("timesheets").insert(timesheetValues);

  const costMonths = ["2025-11-01", "2025-12-01", "2026-01-01"];
  const costEntries = [
    { projIdx: 0, category: "resource", description: "Staff costs - Defence Platform", amount: "185000.00", cost_type: "resource" },
    { projIdx: 0, category: "subcontractor", description: "Security specialist subcontractor", amount: "45000.00", cost_type: "subcontractor" },
    { projIdx: 0, category: "overhead", description: "Project overhead allocation", amount: "12000.00", cost_type: "overhead" },
    { projIdx: 1, category: "resource", description: "Staff costs - ERP Integration", amount: "82000.00", cost_type: "resource" },
    { projIdx: 1, category: "travel", description: "Client site travel Sydney", amount: "3500.00", cost_type: "travel" },
    { projIdx: 2, category: "resource", description: "Staff costs - Data Analytics", amount: "68000.00", cost_type: "resource" },
    { projIdx: 2, category: "rd", description: "R&D analytics tooling", amount: "15000.00", cost_type: "rd" },
    { projIdx: 3, category: "resource", description: "Staff costs - Cloud Migration", amount: "55000.00", cost_type: "resource" },
    { projIdx: 4, category: "overhead", description: "Pre-project planning overhead", amount: "8000.00", cost_type: "overhead" },
  ];

  const costValues: any[] = [];
  for (const month of costMonths) {
    for (const entry of costEntries.slice(0, month === "2025-11-01" ? 7 : costEntries.length)) {
      costValues.push({
        project_id: projIds[entry.projIdx],
        category: entry.category,
        description: entry.description,
        amount: entry.amount,
        month,
        cost_type: entry.cost_type,
        source: "calculated",
      });
    }
  }

  await db("costs").insert(costValues);

  const kpiMonths = ["2025-11-01", "2025-12-01", "2026-01-01"];
  const kpiEntries = [
    { projIdx: 0, revenue: "280000.00", contract_rate: "1350.00", billed_amount: "260000.00", unbilled_amount: "20000.00", gross_cost: "242000.00", resource_cost: "185000.00", rd_cost: "0.00", margin: "38000.00", margin_percent: "13.57", burn_rate: "242000.00", utilization: "87.50" },
    { projIdx: 0, revenue: "295000.00", contract_rate: "1350.00", billed_amount: "290000.00", unbilled_amount: "5000.00", gross_cost: "238000.00", resource_cost: "182000.00", rd_cost: "0.00", margin: "57000.00", margin_percent: "19.32", burn_rate: "238000.00", utilization: "91.20" },
    { projIdx: 0, revenue: "310000.00", contract_rate: "1350.00", billed_amount: "275000.00", unbilled_amount: "35000.00", gross_cost: "245000.00", resource_cost: "188000.00", rd_cost: "0.00", margin: "65000.00", margin_percent: "20.97", burn_rate: "245000.00", utilization: "89.30" },
    { projIdx: 1, revenue: "95000.00", contract_rate: "1100.00", billed_amount: "92000.00", unbilled_amount: "3000.00", gross_cost: "85500.00", resource_cost: "82000.00", rd_cost: "0.00", margin: "9500.00", margin_percent: "10.00", burn_rate: "85500.00", utilization: "82.00" },
    { projIdx: 1, revenue: "102000.00", contract_rate: "1100.00", billed_amount: "98000.00", unbilled_amount: "4000.00", gross_cost: "88000.00", resource_cost: "84000.00", rd_cost: "0.00", margin: "14000.00", margin_percent: "13.73", burn_rate: "88000.00", utilization: "85.50" },
    { projIdx: 1, revenue: "98000.00", contract_rate: "1100.00", billed_amount: "90000.00", unbilled_amount: "8000.00", gross_cost: "86500.00", resource_cost: "83000.00", rd_cost: "0.00", margin: "11500.00", margin_percent: "11.73", burn_rate: "86500.00", utilization: "83.20" },
    { projIdx: 2, revenue: "65000.00", contract_rate: "1050.00", billed_amount: "62000.00", unbilled_amount: "3000.00", gross_cost: "83000.00", resource_cost: "68000.00", rd_cost: "15000.00", margin: "-18000.00", margin_percent: "-27.69", burn_rate: "83000.00", utilization: "78.40" },
    { projIdx: 2, revenue: "72000.00", contract_rate: "1050.00", billed_amount: "70000.00", unbilled_amount: "2000.00", gross_cost: "80000.00", resource_cost: "66000.00", rd_cost: "14000.00", margin: "-8000.00", margin_percent: "-11.11", burn_rate: "80000.00", utilization: "81.60" },
    { projIdx: 2, revenue: "78000.00", contract_rate: "1050.00", billed_amount: "75000.00", unbilled_amount: "3000.00", gross_cost: "82000.00", resource_cost: "67000.00", rd_cost: "15000.00", margin: "-4000.00", margin_percent: "-5.13", burn_rate: "82000.00", utilization: "84.10" },
    { projIdx: 3, revenue: "48000.00", contract_rate: "900.00", billed_amount: "48000.00", unbilled_amount: "0.00", gross_cost: "42000.00", resource_cost: "38000.00", rd_cost: "0.00", margin: "6000.00", margin_percent: "12.50", burn_rate: "42000.00", utilization: "90.00" },
    { projIdx: 3, revenue: "52000.00", contract_rate: "900.00", billed_amount: "52000.00", unbilled_amount: "0.00", gross_cost: "44000.00", resource_cost: "40000.00", rd_cost: "0.00", margin: "8000.00", margin_percent: "15.38", burn_rate: "44000.00", utilization: "92.30" },
    { projIdx: 3, revenue: "55000.00", contract_rate: "900.00", billed_amount: "55000.00", unbilled_amount: "0.00", gross_cost: "46000.00", resource_cost: "42000.00", rd_cost: "0.00", margin: "9000.00", margin_percent: "16.36", burn_rate: "46000.00", utilization: "93.10" },
    { projIdx: 4, revenue: "0.00", contract_rate: "1200.00", billed_amount: "0.00", unbilled_amount: "0.00", gross_cost: "8000.00", resource_cost: "0.00", rd_cost: "0.00", margin: "-8000.00", margin_percent: "0.00", burn_rate: "8000.00", utilization: "0.00" },
    { projIdx: 4, revenue: "0.00", contract_rate: "1200.00", billed_amount: "0.00", unbilled_amount: "0.00", gross_cost: "8500.00", resource_cost: "0.00", rd_cost: "0.00", margin: "-8500.00", margin_percent: "0.00", burn_rate: "8500.00", utilization: "0.00" },
    { projIdx: 4, revenue: "0.00", contract_rate: "1200.00", billed_amount: "0.00", unbilled_amount: "0.00", gross_cost: "9000.00", resource_cost: "0.00", rd_cost: "0.00", margin: "-9000.00", margin_percent: "0.00", burn_rate: "9000.00", utilization: "0.00" },
  ];

  const kpiValues: any[] = [];
  for (let i = 0; i < kpiEntries.length; i++) {
    const monthIdx = i % 3;
    const e = kpiEntries[i];
    kpiValues.push({
      project_id: projIds[e.projIdx],
      month: kpiMonths[monthIdx],
      revenue: e.revenue,
      contract_rate: e.contract_rate,
      billed_amount: e.billed_amount,
      unbilled_amount: e.unbilled_amount,
      gross_cost: e.gross_cost,
      resource_cost: e.resource_cost,
      rd_cost: e.rd_cost,
      margin: e.margin,
      margin_percent: e.margin_percent,
      burn_rate: e.burn_rate,
      utilization: e.utilization,
    });
  }

  await db("kpis").insert(kpiValues);

  const forecastMonths = ["2026-02-01", "2026-03-01", "2026-04-01"];
  const forecastEntries = [
    { projIdx: 0, revenue: "320000.00", cost: "250000.00", margin: "70000.00", utilization: "90.50", burn_rate: "250000.00", notes: "Ramping up delivery phase" },
    { projIdx: 0, revenue: "335000.00", cost: "255000.00", margin: "80000.00", utilization: "92.00", burn_rate: "255000.00", notes: "Peak delivery period" },
    { projIdx: 0, revenue: "310000.00", cost: "240000.00", margin: "70000.00", utilization: "88.00", burn_rate: "240000.00", notes: "Transitioning to UAT" },
    { projIdx: 1, revenue: "105000.00", cost: "90000.00", margin: "15000.00", utilization: "86.00", burn_rate: "90000.00", notes: "Stable delivery phase" },
    { projIdx: 1, revenue: "110000.00", cost: "92000.00", margin: "18000.00", utilization: "87.50", burn_rate: "92000.00", notes: "Integration testing sprint" },
    { projIdx: 1, revenue: "100000.00", cost: "88000.00", margin: "12000.00", utilization: "84.00", burn_rate: "88000.00", notes: "Data migration phase" },
    { projIdx: 2, revenue: "82000.00", cost: "78000.00", margin: "4000.00", utilization: "86.00", burn_rate: "78000.00", notes: "Improving margins with new tooling" },
    { projIdx: 2, revenue: "85000.00", cost: "76000.00", margin: "9000.00", utilization: "88.00", burn_rate: "76000.00", notes: "R&D investment paying off" },
    { projIdx: 2, revenue: "88000.00", cost: "75000.00", margin: "13000.00", utilization: "89.50", burn_rate: "75000.00", notes: "Retainer renewal discussions" },
    { projIdx: 4, revenue: "120000.00", cost: "95000.00", margin: "25000.00", utilization: "75.00", burn_rate: "95000.00", notes: "Project kickoff and team onboarding" },
    { projIdx: 4, revenue: "150000.00", cost: "110000.00", margin: "40000.00", utilization: "82.00", burn_rate: "110000.00", notes: "Full team ramped up" },
    { projIdx: 4, revenue: "160000.00", cost: "115000.00", margin: "45000.00", utilization: "85.00", burn_rate: "115000.00", notes: "First deliverable milestone" },
  ];

  const forecastValues: any[] = [];
  for (let i = 0; i < forecastEntries.length; i++) {
    const monthIdx = i % 3;
    const e = forecastEntries[i];
    forecastValues.push({
      project_id: projIds[e.projIdx],
      month: forecastMonths[monthIdx],
      forecast_revenue: e.revenue,
      forecast_cost: e.cost,
      forecast_margin: e.margin,
      forecast_utilization: e.utilization,
      forecast_burn_rate: e.burn_rate,
      notes: e.notes,
    });
  }

  await db("forecasts").insert(forecastValues);

  await db("milestones").insert([
    { project_id: projIds[0], name: "Requirements Sign-off", due_date: "2025-09-30", completed_date: "2025-09-28", status: "completed", amount: "200000.00", milestone_type: "payment", invoice_status: "invoiced" },
    { project_id: projIds[0], name: "Phase 1 Delivery", due_date: "2026-01-31", completed_date: "2026-01-29", status: "completed", amount: "400000.00", milestone_type: "payment", invoice_status: "invoiced" },
    { project_id: projIds[0], name: "Phase 2 Delivery", due_date: "2026-06-30", status: "pending", amount: "500000.00", milestone_type: "delivery", invoice_status: "pending" },
    { project_id: projIds[0], name: "UAT Completion", due_date: "2026-10-31", status: "pending", amount: "400000.00", milestone_type: "delivery", invoice_status: "upcoming" },
    { project_id: projIds[1], name: "Discovery Workshop", due_date: "2025-11-15", completed_date: "2025-11-14", status: "completed", amount: "72000.00", milestone_type: "payment", invoice_status: "invoiced" },
    { project_id: projIds[1], name: "System Design Approval", due_date: "2026-01-15", completed_date: null, status: "overdue", amount: "144000.00", milestone_type: "delivery", invoice_status: "delayed" },
    { project_id: projIds[1], name: "Integration Go-Live", due_date: "2026-07-31", status: "pending", amount: "288000.00", milestone_type: "delivery", invoice_status: "upcoming" },
    { project_id: projIds[2], name: "Q1 Analytics Report", due_date: "2025-06-30", completed_date: "2025-06-28", status: "completed", amount: "125000.00", milestone_type: "payment", invoice_status: "invoiced" },
    { project_id: projIds[2], name: "Q2 Analytics Report", due_date: "2025-12-31", completed_date: null, status: "overdue", amount: "125000.00", milestone_type: "payment", invoice_status: "delayed" },
    { project_id: projIds[2], name: "Q3 Analytics Report", due_date: "2026-03-31", status: "pending", amount: "125000.00", milestone_type: "payment", invoice_status: "pending" },
    { project_id: projIds[3], name: "Migration Complete", due_date: "2025-10-31", completed_date: "2025-10-28", status: "completed", amount: "310000.00", milestone_type: "delivery", invoice_status: "invoiced" },
    { project_id: projIds[4], name: "Project Charter Approval", due_date: "2026-03-15", status: "pending", amount: "105000.00", milestone_type: "delivery", invoice_status: "upcoming" },
  ]);

  await db("reference_data").insert([
    { category: "vat_category", key: "Growth", value: "Growth", display_order: 1, active: true },
    { category: "vat_category", key: "VIC", value: "VIC", display_order: 2, active: true },
    { category: "vat_category", key: "DAFF", value: "DAFF", display_order: 3, active: true },
    { category: "vat_category", key: "Emerging", value: "Emerging", display_order: 4, active: true },
    { category: "vat_category", key: "DISR", value: "DISR", display_order: 5, active: true },
    { category: "vat_category", key: "SAU", value: "SAU", display_order: 6, active: true },
    { category: "company_goal", key: "revenue_target", value: "10000000", display_order: 1, active: true },
    { category: "company_goal", key: "margin_target_percent", value: "20", display_order: 2, active: true },
    { category: "company_goal", key: "utilization_target_percent", value: "85", display_order: 3, active: true },
    { category: "company_goal", key: "pipeline_coverage_ratio", value: "3.0", display_order: 4, active: true },
    { category: "billing_type", key: "Fixed", value: "Fixed Price", display_order: 1, active: true },
    { category: "billing_type", key: "T&M", value: "Time & Materials", display_order: 2, active: true },
    { category: "billing_type", key: "LH", value: "Labour Hire", display_order: 3, active: true },
    { category: "fy_period", key: "24-25", value: "FY2024-25", display_order: 1, active: true },
    { category: "fy_period", key: "25-26", value: "FY2025-26", display_order: 2, active: true },
    { category: "fy_period", key: "26-27", value: "FY2026-27", display_order: 3, active: true },
  ]);

  const bcrypt = await import("bcryptjs");
  const adminPassword = await bcrypt.hash("admin123", 10);
  await db("users").insert([
    { username: "admin", password: adminPassword, email: "admin@company.com.au", role: "admin", display_name: "System Admin" },
  ]);

  await db("data_sources").insert([
    { name: "Employment Hero", type: "api", connection_info: "https://api.employmenthero.com/api/v1", last_sync_at: new Date("2026-02-11T14:15:00Z"), status: "active", records_processed: 3892, sync_frequency: "daily" },
    { name: "iTimesheets", type: "api", connection_info: "https://itimesheets.company.com.au/api/timesheets", last_sync_at: new Date("2026-02-11T18:00:00Z"), status: "active", records_processed: 2134, sync_frequency: "daily" },
    { name: "SharePoint", type: "api", connection_info: "https://company.sharepoint.com/sites/projects/_api", last_sync_at: new Date("2026-02-10T08:30:00Z"), status: "active", records_processed: 1245, sync_frequency: "hourly" },
  ]);

  const onboardingEmployeeId = empIds[8];
  await db("onboarding_steps").insert([
    { employee_id: onboardingEmployeeId, step_name: "Add to SC List", step_order: 1, completed: true, completed_at: new Date("2026-02-10T09:00:00Z"), notes: "Added to security clearance tracking list" },
    { employee_id: onboardingEmployeeId, step_name: "Add to RM", step_order: 2, completed: true, completed_at: new Date("2026-02-10T09:30:00Z"), notes: "Added to resource management system" },
    { employee_id: onboardingEmployeeId, step_name: "Add to EG Card", step_order: 3, completed: true, completed_at: new Date("2026-02-10T10:00:00Z"), notes: "Employee grade card created" },
    { employee_id: onboardingEmployeeId, step_name: "Add to KP Rev Tab", step_order: 4, completed: false, notes: "Pending KPI review tab setup" },
    { employee_id: onboardingEmployeeId, step_name: "Add to Resource Group", step_order: 5, completed: false, notes: "Assign to Engineering resource group" },
    { employee_id: onboardingEmployeeId, step_name: "Set Employee Location", step_order: 6, completed: false, notes: "Set primary location to Sydney" },
    { employee_id: onboardingEmployeeId, step_name: "Add to Salary Plan", step_order: 7, completed: false, notes: "Configure salary plan and payroll" },
    { employee_id: onboardingEmployeeId, step_name: "Complete Home Access", step_order: 8, completed: false, notes: "Setup VPN and home office access" },
  ]);

  const monthLabels = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const projectMonthlyData: Record<number, { rev: number[]; cost: number[] }> = {
    0: { rev: [280000, 295000, 310000, 285000, 280000, 295000, 310000, 320000, 335000, 310000, 300000, 290000], cost: [220000, 230000, 245000, 225000, 225000, 238000, 245000, 250000, 255000, 240000, 235000, 230000] },
    1: { rev: [0, 0, 0, 95000, 102000, 98000, 105000, 110000, 100000, 95000, 90000, 85000], cost: [0, 0, 0, 85500, 88000, 86500, 90000, 92000, 88000, 82000, 78000, 75000] },
    2: { rev: [65000, 72000, 78000, 68000, 65000, 72000, 78000, 82000, 85000, 88000, 80000, 75000], cost: [83000, 80000, 82000, 75000, 78000, 80000, 82000, 78000, 76000, 75000, 72000, 70000] },
    3: { rev: [48000, 52000, 55000, 50000, 48000, 52000, 55000, 0, 0, 0, 0, 0], cost: [42000, 44000, 46000, 43000, 42000, 44000, 46000, 0, 0, 0, 0, 0] },
    4: { rev: [0, 0, 0, 0, 0, 0, 0, 0, 0, 120000, 150000, 160000], cost: [0, 0, 0, 0, 0, 8000, 8500, 9000, 9500, 95000, 110000, 115000] },
  };

  const projectMonthlyValues: any[] = [];
  for (let pIdx = 0; pIdx < 5; pIdx++) {
    const data = projectMonthlyData[pIdx];
    for (let m = 0; m < 12; m++) {
      const rev = data.rev[m];
      const cost = data.cost[m];
      projectMonthlyValues.push({
        project_id: projIds[pIdx],
        fy_year: "25-26",
        month: m + 1,
        month_label: monthLabels[m],
        revenue: rev.toFixed(2),
        cost: cost.toFixed(2),
        profit: (rev - cost).toFixed(2),
      });
    }
  }

  await db("project_monthly").insert(projectMonthlyValues);

  const insertedPipeline = await db("pipeline_opportunities")
    .insert([
      { name: "DTA Digital Identity Phase 2", classification: "C", vat: "Growth", fy_year: "25-26", billing_type: "Fixed", revenue_m1: "45000.00", revenue_m2: "48000.00", revenue_m3: "52000.00", revenue_m4: "55000.00", revenue_m5: "58000.00", revenue_m6: "60000.00", revenue_m7: "62000.00", revenue_m8: "65000.00", revenue_m9: "60000.00", revenue_m10: "55000.00", revenue_m11: "50000.00", revenue_m12: "45000.00", gross_profit_m1: "9000.00", gross_profit_m2: "9600.00", gross_profit_m3: "10400.00", gross_profit_m4: "11000.00", gross_profit_m5: "11600.00", gross_profit_m6: "12000.00", gross_profit_m7: "12400.00", gross_profit_m8: "13000.00", gross_profit_m9: "12000.00", gross_profit_m10: "11000.00", gross_profit_m11: "10000.00", gross_profit_m12: "9000.00" },
      { name: "ATO Data Platform Uplift", classification: "C", vat: "Growth", fy_year: "25-26", billing_type: "T&M", revenue_m1: "120000.00", revenue_m2: "125000.00", revenue_m3: "130000.00", revenue_m4: "135000.00", revenue_m5: "140000.00", revenue_m6: "135000.00", revenue_m7: "130000.00", revenue_m8: "125000.00", revenue_m9: "120000.00", revenue_m10: "115000.00", revenue_m11: "110000.00", revenue_m12: "105000.00", gross_profit_m1: "24000.00", gross_profit_m2: "25000.00", gross_profit_m3: "26000.00", gross_profit_m4: "27000.00", gross_profit_m5: "28000.00", gross_profit_m6: "27000.00", gross_profit_m7: "26000.00", gross_profit_m8: "25000.00", gross_profit_m9: "24000.00", gross_profit_m10: "23000.00", gross_profit_m11: "22000.00", gross_profit_m12: "21000.00" },
      { name: "Services Australia CX Redesign", classification: "S", vat: "Growth", fy_year: "25-26", billing_type: "T&M", revenue_m1: "0.00", revenue_m2: "0.00", revenue_m3: "0.00", revenue_m4: "35000.00", revenue_m5: "70000.00", revenue_m6: "85000.00", revenue_m7: "90000.00", revenue_m8: "95000.00", revenue_m9: "90000.00", revenue_m10: "85000.00", revenue_m11: "80000.00", revenue_m12: "75000.00", gross_profit_m1: "0.00", gross_profit_m2: "0.00", gross_profit_m3: "0.00", gross_profit_m4: "7000.00", gross_profit_m5: "14000.00", gross_profit_m6: "17000.00", gross_profit_m7: "18000.00", gross_profit_m8: "19000.00", gross_profit_m9: "18000.00", gross_profit_m10: "17000.00", gross_profit_m11: "16000.00", gross_profit_m12: "15000.00" },
      { name: "NBN Co Analytics Advisory", classification: "S", vat: "VIC", fy_year: "25-26", billing_type: "T&M", revenue_m1: "0.00", revenue_m2: "0.00", revenue_m3: "25000.00", revenue_m4: "30000.00", revenue_m5: "35000.00", revenue_m6: "40000.00", revenue_m7: "40000.00", revenue_m8: "35000.00", revenue_m9: "30000.00", revenue_m10: "25000.00", revenue_m11: "20000.00", revenue_m12: "15000.00", gross_profit_m1: "0.00", gross_profit_m2: "0.00", gross_profit_m3: "5000.00", gross_profit_m4: "6000.00", gross_profit_m5: "7000.00", gross_profit_m6: "8000.00", gross_profit_m7: "8000.00", gross_profit_m8: "7000.00", gross_profit_m9: "6000.00", gross_profit_m10: "5000.00", gross_profit_m11: "4000.00", gross_profit_m12: "3000.00" },
      { name: "Telstra Security Uplift", classification: "DVF", vat: "Growth", fy_year: "25-26", billing_type: "Fixed", revenue_m1: "0.00", revenue_m2: "0.00", revenue_m3: "0.00", revenue_m4: "0.00", revenue_m5: "0.00", revenue_m6: "45000.00", revenue_m7: "90000.00", revenue_m8: "120000.00", revenue_m9: "120000.00", revenue_m10: "110000.00", revenue_m11: "100000.00", revenue_m12: "90000.00", gross_profit_m1: "0.00", gross_profit_m2: "0.00", gross_profit_m3: "0.00", gross_profit_m4: "0.00", gross_profit_m5: "0.00", gross_profit_m6: "11250.00", gross_profit_m7: "22500.00", gross_profit_m8: "30000.00", gross_profit_m9: "30000.00", gross_profit_m10: "27500.00", gross_profit_m11: "25000.00", gross_profit_m12: "22500.00" },
      { name: "Optus Cloud Migration", classification: "DVF", vat: "Growth", fy_year: "25-26", billing_type: "T&M", revenue_m1: "0.00", revenue_m2: "0.00", revenue_m3: "0.00", revenue_m4: "0.00", revenue_m5: "0.00", revenue_m6: "0.00", revenue_m7: "55000.00", revenue_m8: "75000.00", revenue_m9: "85000.00", revenue_m10: "90000.00", revenue_m11: "85000.00", revenue_m12: "80000.00", gross_profit_m1: "0.00", gross_profit_m2: "0.00", gross_profit_m3: "0.00", gross_profit_m4: "0.00", gross_profit_m5: "0.00", gross_profit_m6: "0.00", gross_profit_m7: "11000.00", gross_profit_m8: "15000.00", gross_profit_m9: "17000.00", gross_profit_m10: "18000.00", gross_profit_m11: "17000.00", gross_profit_m12: "16000.00" },
      { name: "VicRoads Digital Twin", classification: "DF", vat: "VIC", fy_year: "25-26", billing_type: "Fixed", revenue_m1: "0.00", revenue_m2: "0.00", revenue_m3: "0.00", revenue_m4: "0.00", revenue_m5: "0.00", revenue_m6: "0.00", revenue_m7: "0.00", revenue_m8: "40000.00", revenue_m9: "65000.00", revenue_m10: "80000.00", revenue_m11: "85000.00", revenue_m12: "90000.00", gross_profit_m1: "0.00", gross_profit_m2: "0.00", gross_profit_m3: "0.00", gross_profit_m4: "0.00", gross_profit_m5: "0.00", gross_profit_m6: "0.00", gross_profit_m7: "0.00", gross_profit_m8: "8000.00", gross_profit_m9: "13000.00", gross_profit_m10: "16000.00", gross_profit_m11: "17000.00", gross_profit_m12: "18000.00" },
      { name: "DHHS Case Management", classification: "DF", vat: "VIC", fy_year: "25-26", billing_type: "LH", revenue_m1: "0.00", revenue_m2: "0.00", revenue_m3: "0.00", revenue_m4: "0.00", revenue_m5: "0.00", revenue_m6: "0.00", revenue_m7: "0.00", revenue_m8: "0.00", revenue_m9: "35000.00", revenue_m10: "55000.00", revenue_m11: "70000.00", revenue_m12: "75000.00", gross_profit_m1: "0.00", gross_profit_m2: "0.00", gross_profit_m3: "0.00", gross_profit_m4: "0.00", gross_profit_m5: "0.00", gross_profit_m6: "0.00", gross_profit_m7: "0.00", gross_profit_m8: "0.00", gross_profit_m9: "7000.00", gross_profit_m10: "11000.00", gross_profit_m11: "14000.00", gross_profit_m12: "15000.00" },
      { name: "BHP Mine Automation Advisory", classification: "Q", vat: "Emerging", fy_year: "25-26", billing_type: "T&M", revenue_m1: "0.00", revenue_m2: "0.00", revenue_m3: "0.00", revenue_m4: "0.00", revenue_m5: "25000.00", revenue_m6: "35000.00", revenue_m7: "45000.00", revenue_m8: "50000.00", revenue_m9: "50000.00", revenue_m10: "45000.00", revenue_m11: "40000.00", revenue_m12: "35000.00", gross_profit_m1: "0.00", gross_profit_m2: "0.00", gross_profit_m3: "0.00", gross_profit_m4: "0.00", gross_profit_m5: "6250.00", gross_profit_m6: "8750.00", gross_profit_m7: "11250.00", gross_profit_m8: "12500.00", gross_profit_m9: "12500.00", gross_profit_m10: "11250.00", gross_profit_m11: "10000.00", gross_profit_m12: "8750.00" },
      { name: "Rio Tinto ESG Dashboard", classification: "Q", vat: "Emerging", fy_year: "25-26", billing_type: "T&M", revenue_m1: "0.00", revenue_m2: "0.00", revenue_m3: "0.00", revenue_m4: "0.00", revenue_m5: "0.00", revenue_m6: "20000.00", revenue_m7: "30000.00", revenue_m8: "40000.00", revenue_m9: "45000.00", revenue_m10: "40000.00", revenue_m11: "35000.00", revenue_m12: "30000.00", gross_profit_m1: "0.00", gross_profit_m2: "0.00", gross_profit_m3: "0.00", gross_profit_m4: "0.00", gross_profit_m5: "0.00", gross_profit_m6: "4000.00", gross_profit_m7: "6000.00", gross_profit_m8: "8000.00", gross_profit_m9: "9000.00", gross_profit_m10: "8000.00", gross_profit_m11: "7000.00", gross_profit_m12: "6000.00" },
      { name: "ANZ Bank API Platform", classification: "A", vat: "Growth", fy_year: "25-26", billing_type: "T&M", revenue_m1: "0.00", revenue_m2: "0.00", revenue_m3: "0.00", revenue_m4: "0.00", revenue_m5: "0.00", revenue_m6: "0.00", revenue_m7: "0.00", revenue_m8: "0.00", revenue_m9: "0.00", revenue_m10: "60000.00", revenue_m11: "80000.00", revenue_m12: "95000.00", gross_profit_m1: "0.00", gross_profit_m2: "0.00", gross_profit_m3: "0.00", gross_profit_m4: "0.00", gross_profit_m5: "0.00", gross_profit_m6: "0.00", gross_profit_m7: "0.00", gross_profit_m8: "0.00", gross_profit_m9: "0.00", gross_profit_m10: "12000.00", gross_profit_m11: "16000.00", gross_profit_m12: "19000.00" },
      { name: "Westpac Data Governance", classification: "A", vat: "Growth", fy_year: "25-26", billing_type: "LH", revenue_m1: "0.00", revenue_m2: "0.00", revenue_m3: "0.00", revenue_m4: "0.00", revenue_m5: "0.00", revenue_m6: "0.00", revenue_m7: "0.00", revenue_m8: "0.00", revenue_m9: "0.00", revenue_m10: "0.00", revenue_m11: "45000.00", revenue_m12: "65000.00", gross_profit_m1: "0.00", gross_profit_m2: "0.00", gross_profit_m3: "0.00", gross_profit_m4: "0.00", gross_profit_m5: "0.00", gross_profit_m6: "0.00", gross_profit_m7: "0.00", gross_profit_m8: "0.00", gross_profit_m9: "0.00", gross_profit_m10: "0.00", gross_profit_m11: "9000.00", gross_profit_m12: "13000.00" },
      { name: "Medicare Digital Transformation", classification: "S", vat: "Growth", fy_year: "25-26", billing_type: "T&M", revenue_m1: "0.00", revenue_m2: "0.00", revenue_m3: "0.00", revenue_m4: "0.00", revenue_m5: "45000.00", revenue_m6: "65000.00", revenue_m7: "80000.00", revenue_m8: "85000.00", revenue_m9: "80000.00", revenue_m10: "75000.00", revenue_m11: "70000.00", revenue_m12: "65000.00", gross_profit_m1: "0.00", gross_profit_m2: "0.00", gross_profit_m3: "0.00", gross_profit_m4: "0.00", gross_profit_m5: "9000.00", gross_profit_m6: "13000.00", gross_profit_m7: "16000.00", gross_profit_m8: "17000.00", gross_profit_m9: "16000.00", gross_profit_m10: "15000.00", gross_profit_m11: "14000.00", gross_profit_m12: "13000.00" },
      { name: "Qantas Loyalty Platform", classification: "DVF", vat: "Emerging", fy_year: "25-26", billing_type: "Fixed", revenue_m1: "0.00", revenue_m2: "0.00", revenue_m3: "0.00", revenue_m4: "0.00", revenue_m5: "0.00", revenue_m6: "0.00", revenue_m7: "35000.00", revenue_m8: "55000.00", revenue_m9: "70000.00", revenue_m10: "75000.00", revenue_m11: "70000.00", revenue_m12: "65000.00", gross_profit_m1: "0.00", gross_profit_m2: "0.00", gross_profit_m3: "0.00", gross_profit_m4: "0.00", gross_profit_m5: "0.00", gross_profit_m6: "0.00", gross_profit_m7: "7000.00", gross_profit_m8: "11000.00", gross_profit_m9: "14000.00", gross_profit_m10: "15000.00", gross_profit_m11: "14000.00", gross_profit_m12: "13000.00" },
      { name: "Woodside Energy IoT Monitoring", classification: "Q", vat: "Emerging", fy_year: "25-26", billing_type: "T&M", revenue_m1: "0.00", revenue_m2: "0.00", revenue_m3: "0.00", revenue_m4: "0.00", revenue_m5: "0.00", revenue_m6: "0.00", revenue_m7: "20000.00", revenue_m8: "30000.00", revenue_m9: "40000.00", revenue_m10: "45000.00", revenue_m11: "50000.00", revenue_m12: "45000.00", gross_profit_m1: "0.00", gross_profit_m2: "0.00", gross_profit_m3: "0.00", gross_profit_m4: "0.00", gross_profit_m5: "0.00", gross_profit_m6: "0.00", gross_profit_m7: "4000.00", gross_profit_m8: "6000.00", gross_profit_m9: "8000.00", gross_profit_m10: "9000.00", gross_profit_m11: "10000.00", gross_profit_m12: "9000.00" },
    ])
    .returning("*");

  const pipelineIds = insertedPipeline.map((p: any) => p.id);

  const insertedScenarios = await db("scenarios")
    .insert([
      { name: "Base Case", description: "Conservative forecast using current pipeline probabilities", fy_year: "25-26", revenue_goal: "8500000.00", margin_goal_percent: "18.00" },
      { name: "Optimistic", description: "Aggressive growth scenario with higher win rates and faster starts", fy_year: "25-26", revenue_goal: "10500000.00", margin_goal_percent: "22.00" },
    ])
    .returning("*");

  const scenarioIds = insertedScenarios.map((s: any) => s.id);

  if (scenarioIds.length >= 2 && pipelineIds.length >= 5) {
    await db("scenario_adjustments").insert([
      { scenario_id: scenarioIds[0], opportunity_id: pipelineIds[0], classification: "C", adjustment_type: "win_probability", win_probability: "90.00", notes: "High confidence - strong client relationship" },
      { scenario_id: scenarioIds[0], opportunity_id: pipelineIds[2], classification: "S", adjustment_type: "win_probability", win_probability: "60.00", notes: "Competitive tender, moderate probability" },
      { scenario_id: scenarioIds[0], opportunity_id: pipelineIds[4], classification: "DVF", adjustment_type: "win_probability", win_probability: "40.00", notes: "Early stage, uncertain timeline" },
      { scenario_id: scenarioIds[0], opportunity_id: pipelineIds[6], classification: "DF", adjustment_type: "revenue_override", revenue_override: "300000.00", notes: "Reduced scope expected" },
      { scenario_id: scenarioIds[1], opportunity_id: pipelineIds[0], classification: "C", adjustment_type: "win_probability", win_probability: "95.00", notes: "Near certain - verbal commitment received" },
      { scenario_id: scenarioIds[1], opportunity_id: pipelineIds[2], classification: "S", adjustment_type: "win_probability", win_probability: "80.00", notes: "Positive signals from client" },
      { scenario_id: scenarioIds[1], opportunity_id: pipelineIds[4], classification: "DVF", adjustment_type: "win_probability", win_probability: "65.00", notes: "Accelerated timeline expected" },
      { scenario_id: scenarioIds[1], opportunity_id: pipelineIds[4], classification: "DVF", adjustment_type: "start_month_shift", start_month_shift: -1, notes: "Start one month earlier" },
      { scenario_id: scenarioIds[1], opportunity_id: pipelineIds[8], classification: "Q", adjustment_type: "win_probability", win_probability: "50.00", notes: "Mining sector recovering" },
      { scenario_id: scenarioIds[1], opportunity_id: pipelineIds[10], classification: "A", adjustment_type: "revenue_override", revenue_override: "280000.00", notes: "Expanded scope likely" },
    ]);
  }

  console.log("Seed data created successfully");
}

async function seedPipelineAndScenarios() {
  const existingProjects = await db("projects").select("*");
  const projMap: Record<string, number> = {};
  for (const p of existingProjects) {
    projMap[p.project_code] = p.id;
  }

  for (const p of existingProjects) {
    let billingCategory = p.billing_category;
    let vat = p.vat;
    if (!billingCategory) {
      billingCategory = p.contract_type === "fixed_price" ? "Fixed" : "T&M";
    }
    if (!vat) {
      if (p.client?.includes("Defence") || p.client?.includes("Federal")) vat = "Growth";
      else if (p.client?.includes("Victoria")) vat = "VIC";
      else vat = "Emerging";
    }
    if (billingCategory !== p.billing_category || vat !== p.vat) {
      await db("projects").where("id", p.id).update({ billing_category: billingCategory, vat });
    }
  }

  const monthLabels = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  const existingProjectMonthly = await db("project_monthly").select("id").limit(1);
  if (existingProjectMonthly.length === 0) {
    const projectMonthlyData: Record<string, { rev: number[]; cost: number[] }> = {
      "PRJ-DEF-001": { rev: [280000, 295000, 310000, 285000, 280000, 295000, 310000, 320000, 335000, 310000, 300000, 290000], cost: [220000, 230000, 245000, 225000, 225000, 238000, 245000, 250000, 255000, 240000, 235000, 230000] },
      "PRJ-ACM-002": { rev: [0, 0, 0, 95000, 102000, 98000, 105000, 110000, 100000, 95000, 90000, 85000], cost: [0, 0, 0, 85500, 88000, 86500, 90000, 92000, 88000, 82000, 78000, 75000] },
      "PRJ-VIC-003": { rev: [65000, 72000, 78000, 68000, 65000, 72000, 78000, 82000, 85000, 88000, 80000, 75000], cost: [83000, 80000, 82000, 75000, 78000, 80000, 82000, 78000, 76000, 75000, 72000, 70000] },
      "PRJ-TST-004": { rev: [48000, 52000, 55000, 50000, 48000, 52000, 55000, 0, 0, 0, 0, 0], cost: [42000, 44000, 46000, 43000, 42000, 44000, 46000, 0, 0, 0, 0, 0] },
      "PRJ-FED-005": { rev: [0, 0, 0, 0, 0, 0, 0, 0, 0, 120000, 150000, 160000], cost: [0, 0, 0, 0, 0, 8000, 8500, 9000, 9500, 95000, 110000, 115000] },
    };

    const pmValues: any[] = [];
    for (const [code, data] of Object.entries(projectMonthlyData)) {
      const projId = projMap[code];
      if (!projId) continue;
      for (let m = 0; m < 12; m++) {
        const rev = data.rev[m];
        const cost = data.cost[m];
        pmValues.push({
          project_id: projId,
          fy_year: "25-26",
          month: m + 1,
          month_label: monthLabels[m],
          revenue: rev.toFixed(2),
          cost: cost.toFixed(2),
          profit: (rev - cost).toFixed(2),
        });
      }
    }

    if (pmValues.length > 0) {
      await db("project_monthly").insert(pmValues);
    }
  }

  const existingPipeline = await db("pipeline_opportunities").select("id").limit(1);
  if (existingPipeline.length > 0) return;

  const insertedPipeline = await db("pipeline_opportunities")
    .insert([
      { name: "DTA Digital Identity Phase 2", classification: "C", vat: "Growth", fy_year: "25-26", billing_type: "Fixed", revenue_m1: "45000.00", revenue_m2: "48000.00", revenue_m3: "52000.00", revenue_m4: "55000.00", revenue_m5: "58000.00", revenue_m6: "60000.00", revenue_m7: "62000.00", revenue_m8: "65000.00", revenue_m9: "60000.00", revenue_m10: "55000.00", revenue_m11: "50000.00", revenue_m12: "45000.00", gross_profit_m1: "9000.00", gross_profit_m2: "9600.00", gross_profit_m3: "10400.00", gross_profit_m4: "11000.00", gross_profit_m5: "11600.00", gross_profit_m6: "12000.00", gross_profit_m7: "12400.00", gross_profit_m8: "13000.00", gross_profit_m9: "12000.00", gross_profit_m10: "11000.00", gross_profit_m11: "10000.00", gross_profit_m12: "9000.00" },
      { name: "ATO Data Platform Uplift", classification: "C", vat: "Growth", fy_year: "25-26", billing_type: "T&M", revenue_m1: "120000.00", revenue_m2: "125000.00", revenue_m3: "130000.00", revenue_m4: "135000.00", revenue_m5: "140000.00", revenue_m6: "135000.00", revenue_m7: "130000.00", revenue_m8: "125000.00", revenue_m9: "120000.00", revenue_m10: "115000.00", revenue_m11: "110000.00", revenue_m12: "105000.00", gross_profit_m1: "24000.00", gross_profit_m2: "25000.00", gross_profit_m3: "26000.00", gross_profit_m4: "27000.00", gross_profit_m5: "28000.00", gross_profit_m6: "27000.00", gross_profit_m7: "26000.00", gross_profit_m8: "25000.00", gross_profit_m9: "24000.00", gross_profit_m10: "23000.00", gross_profit_m11: "22000.00", gross_profit_m12: "21000.00" },
    ])
    .returning("*");

  const pipelineIds = insertedPipeline.map((p: any) => p.id);

  const insertedScenarios = await db("scenarios")
    .insert([
      { name: "Base Case", description: "Conservative forecast using current pipeline probabilities", fy_year: "25-26", revenue_goal: "8500000.00", margin_goal_percent: "18.00" },
      { name: "Optimistic", description: "Aggressive growth scenario with higher win rates and faster starts", fy_year: "25-26", revenue_goal: "10500000.00", margin_goal_percent: "22.00" },
    ])
    .returning("*");

  const scenarioIds = insertedScenarios.map((s: any) => s.id);

  if (scenarioIds.length >= 2 && pipelineIds.length >= 1) {
    await db("scenario_adjustments").insert([
      { scenario_id: scenarioIds[0], opportunity_id: pipelineIds[0], classification: "C", adjustment_type: "win_probability", win_probability: "90.00", notes: "High confidence - strong client relationship" },
      { scenario_id: scenarioIds[1], opportunity_id: pipelineIds[0], classification: "C", adjustment_type: "win_probability", win_probability: "95.00", notes: "Near certain - verbal commitment received" },
    ]);
  }

  console.log("Pipeline and scenario seed data created");
}
