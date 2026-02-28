import knex from "knex";

const db = knex({
  client: "pg",
  connection: process.env.DATABASE_URL,
});

async function seed() {
  console.log("Starting seed data insertion...");

  const existingEmps = await db("employees").count("id as cnt");
  if (Number(existingEmps[0].cnt) > 0) {
    console.log("Data already exists. Skipping seed to avoid duplicates.");
    console.log("To re-seed, run: psql $DATABASE_URL -c \"TRUNCATE employees, projects, timesheets, pipeline_opportunities, project_monthly, milestones, costs, cx_ratings, resource_costs, rate_cards, resource_plans CASCADE;\"");
    await db.destroy();
    return;
  }

  const VATS = ["DAFF", "SAU", "VIC Gov", "DISR", "GROWTH", "P&P", "Emerging"];
  const FY = "25-26";

  const employees = [
    { employee_code: "EMP001", first_name: "Sarah", last_name: "Mitchell", email: "sarah.mitchell@company.com.au", role: "Senior Consultant", cost_band_level: "L4", staff_type: "Permanent", grade: "Senior", location: "Canberra", cost_center: "Delivery", security_clearance: "NV1", base_cost: 850.00, gross_cost_rate: 1020.00, base_salary: 145000, status: "active", start_date: "2022-03-14", resource_group: "Advisory", team: "DAFF", certifications: "ServiceNow Certified System Administrator; ServiceNow Certified Application Developer" },
    { employee_code: "EMP002", first_name: "James", last_name: "Chen", email: "james.chen@company.com.au", role: "Principal Consultant", cost_band_level: "L5", staff_type: "Permanent", grade: "Principal", location: "Canberra", cost_center: "Delivery", security_clearance: "NV2", base_cost: 1100.00, gross_cost_rate: 1320.00, base_salary: 185000, status: "active", start_date: "2020-07-01", resource_group: "Technology", team: "SAU", certifications: "Azure Solutions Architect Expert; Azure DevOps Engineer Expert" },
    { employee_code: "EMP003", first_name: "Emily", last_name: "Nguyen", email: "emily.nguyen@company.com.au", role: "Consultant", cost_band_level: "L3", staff_type: "Permanent", grade: "Mid", location: "Melbourne", cost_center: "Delivery", security_clearance: "Baseline", base_cost: 650.00, gross_cost_rate: 780.00, base_salary: 110000, status: "active", start_date: "2023-01-09", resource_group: "Advisory", team: "VIC Gov", certifications: "ServiceNow Certified Implementation Specialist" },
    { employee_code: "EMP004", first_name: "Michael", last_name: "Patel", email: "michael.patel@company.com.au", role: "Senior Consultant", cost_band_level: "L4", staff_type: "Permanent", grade: "Senior", location: "Canberra", cost_center: "Delivery", security_clearance: "NV1", base_cost: 900.00, gross_cost_rate: 1080.00, base_salary: 150000, status: "active", start_date: "2021-08-16", resource_group: "Technology", team: "DISR", certifications: "AWS Solutions Architect Associate; Azure Fundamentals" },
    { employee_code: "EMP005", first_name: "Rachel", last_name: "Thompson", email: "rachel.thompson@company.com.au", role: "Graduate Consultant", cost_band_level: "L1", staff_type: "Permanent", grade: "Graduate", location: "Sydney", cost_center: "Delivery", security_clearance: "Baseline", base_cost: 420.00, gross_cost_rate: 504.00, base_salary: 72000, status: "active", start_date: "2025-02-03", resource_group: "Advisory", team: "GROWTH", certifications: "Azure Fundamentals" },
    { employee_code: "EMP006", first_name: "David", last_name: "Williams", email: "david.williams@company.com.au", role: "Engagement Manager", cost_band_level: "L6", staff_type: "Permanent", grade: "Manager", location: "Canberra", cost_center: "Management", security_clearance: "NV2", base_cost: 1350.00, gross_cost_rate: 1620.00, base_salary: 220000, status: "active", start_date: "2019-04-01", resource_group: "Management", team: "DAFF", certifications: "PRINCE2 Practitioner; PMP; ServiceNow Certified System Administrator" },
    { employee_code: "EMP007", first_name: "Lisa", last_name: "Kumar", email: "lisa.kumar@company.com.au", role: "Senior Consultant", cost_band_level: "L4", staff_type: "Permanent", grade: "Senior", location: "Melbourne", cost_center: "Delivery", security_clearance: "NV1", base_cost: 870.00, gross_cost_rate: 1044.00, base_salary: 148000, status: "active", start_date: "2022-06-20", resource_group: "Data & Analytics", team: "SAU", certifications: "Azure Data Engineer Associate; Power BI Data Analyst Associate" },
    { employee_code: "EMP008", first_name: "Tom", last_name: "Anderson", email: "tom.anderson@company.com.au", role: "Consultant", cost_band_level: "L3", staff_type: "Permanent", grade: "Mid", location: "Canberra", cost_center: "Delivery", security_clearance: "Baseline", base_cost: 680.00, gross_cost_rate: 816.00, base_salary: 115000, status: "active", start_date: "2023-07-10", resource_group: "Technology", team: "P&P", certifications: "Tech One Certified Consultant; Azure Fundamentals" },
    { employee_code: "EMP009", first_name: "Priya", last_name: "Sharma", email: "priya.sharma@company.com.au", role: "Principal Consultant", cost_band_level: "L5", staff_type: "Permanent", grade: "Principal", location: "Canberra", cost_center: "Delivery", security_clearance: "NV2", base_cost: 1050.00, gross_cost_rate: 1260.00, base_salary: 178000, status: "active", start_date: "2021-01-18", resource_group: "Advisory", team: "Emerging", certifications: "Azure AI Engineer Associate; AWS Machine Learning Specialty" },
    { employee_code: "EMP010", first_name: "Ben", last_name: "O'Brien", email: "ben.obrien@company.com.au", role: "Consultant", cost_band_level: "L3", staff_type: "Permanent", grade: "Mid", location: "Sydney", cost_center: "Delivery", security_clearance: "NV1", base_cost: 670.00, gross_cost_rate: 804.00, base_salary: 112000, status: "active", start_date: "2024-03-04", resource_group: "Technology", team: "GROWTH", certifications: "Tech One Certified Developer; Azure Developer Associate" },
    { employee_code: "EMP011", first_name: "Karen", last_name: "Lee", email: "karen.lee@company.com.au", role: "Senior Consultant", cost_band_level: "L4", staff_type: "Contractor", grade: "Senior", location: "Canberra", cost_center: "Delivery", security_clearance: "NV1", base_cost: 950.00, gross_cost_rate: 1140.00, base_salary: 0, status: "active", start_date: "2024-09-01", resource_group: "Advisory", team: "DAFF", certifications: "ServiceNow Certified System Administrator; ITIL v4 Foundation" },
    { employee_code: "EMP012", first_name: "Mark", last_name: "Taylor", email: "mark.taylor@company.com.au", role: "Graduate Consultant", cost_band_level: "L2", staff_type: "Permanent", grade: "Analyst", location: "Melbourne", cost_center: "Delivery", security_clearance: "Baseline", base_cost: 520.00, gross_cost_rate: 624.00, base_salary: 85000, status: "active", start_date: "2025-01-13", resource_group: "Data & Analytics", team: "VIC Gov", certifications: "Azure Fundamentals; Power BI Data Analyst Associate" },
    { employee_code: "EMP013", first_name: "Sophie", last_name: "Brown", email: "sophie.brown@company.com.au", role: "Engagement Manager", cost_band_level: "L6", staff_type: "Permanent", grade: "Manager", location: "Canberra", cost_center: "Management", security_clearance: "NV2", base_cost: 1300.00, gross_cost_rate: 1560.00, base_salary: 210000, status: "active", start_date: "2020-02-17", resource_group: "Management", team: "SAU", certifications: "PMP; SAFe Agilist; ServiceNow Certified System Administrator" },
    { employee_code: "EMP014", first_name: "Alex", last_name: "Wright", email: "alex.wright@company.com.au", role: "Consultant", cost_band_level: "L3", staff_type: "Permanent", grade: "Mid", location: "Canberra", cost_center: "Delivery", security_clearance: "NV1", base_cost: 700.00, gross_cost_rate: 840.00, base_salary: 118000, status: "active", start_date: "2023-04-24", resource_group: "Technology", team: "DISR", certifications: "Azure Solutions Architect Expert; Tech One Certified Developer" },
    { employee_code: "EMP015", first_name: "Jessica", last_name: "Garcia", email: "jessica.garcia@company.com.au", role: "Senior Consultant", cost_band_level: "L4", staff_type: "Permanent", grade: "Senior", location: "Sydney", cost_center: "Delivery", security_clearance: "NV1", base_cost: 880.00, gross_cost_rate: 1056.00, base_salary: 152000, status: "active", start_date: "2022-09-05", resource_group: "Advisory", team: "P&P", certifications: "PRINCE2 Foundation; Azure Fundamentals" },
    { employee_code: "EMP016", first_name: "Daniel", last_name: "Russo", email: "daniel.russo@company.com.au", role: "Consultant", cost_band_level: "L3", staff_type: "Permanent", grade: "Mid", location: "Canberra", cost_center: "Bench", security_clearance: "NV1", base_cost: 660.00, gross_cost_rate: 792.00, base_salary: 108000, status: "active", start_date: "2024-06-17", resource_group: "Advisory", team: "Emerging" },
    { employee_code: "EMP017", first_name: "Grace", last_name: "Kim", email: "grace.kim@company.com.au", role: "Principal Consultant", cost_band_level: "L5", staff_type: "Permanent", grade: "Principal", location: "Canberra", cost_center: "Delivery", security_clearance: "NV2", base_cost: 1080.00, gross_cost_rate: 1296.00, base_salary: 180000, status: "active", start_date: "2021-05-10", resource_group: "Data & Analytics", team: "DAFF", certifications: "Azure Data Engineer Associate; Azure Solutions Architect Expert; ServiceNow Certified Application Developer" },
    { employee_code: "EMP018", first_name: "Chris", last_name: "McDonald", email: "chris.mcdonald@company.com.au", role: "Senior Consultant", cost_band_level: "L4", staff_type: "Permanent", grade: "Senior", location: "Melbourne", cost_center: "Delivery", security_clearance: "NV1", base_cost: 860.00, gross_cost_rate: 1032.00, base_salary: 146000, status: "active", start_date: "2022-11-28", resource_group: "Technology", team: "VIC Gov", certifications: "Tech One Certified Consultant; Tech One Certified Developer" },
    { employee_code: "EMP019", first_name: "Hannah", last_name: "Scott", email: "hannah.scott@company.com.au", role: "Consultant", cost_band_level: "L3", staff_type: "Permanent", grade: "Mid", location: "Canberra", cost_center: "Delivery", security_clearance: "Baseline", base_cost: 640.00, gross_cost_rate: 768.00, base_salary: 105000, status: "active", start_date: "2024-01-15", resource_group: "Advisory", team: "GROWTH", certifications: "Azure Fundamentals; AWS Cloud Practitioner" },
    { employee_code: "EMP020", first_name: "Ryan", last_name: "Johnson", email: "ryan.johnson@company.com.au", role: "Engagement Manager", cost_band_level: "L6", staff_type: "Permanent", grade: "Manager", location: "Canberra", cost_center: "Management", security_clearance: "NV2", base_cost: 1280.00, gross_cost_rate: 1536.00, base_salary: 205000, status: "active", start_date: "2019-11-04", resource_group: "Management", team: "DISR", certifications: "PRINCE2 Practitioner; PMP; Azure Solutions Architect Expert; ServiceNow Certified System Administrator" },
  ];

  console.log("Inserting 20 employees...");
  const insertedEmps = await db("employees").insert(employees).returning("*");
  const empMap: Record<string, number> = {};
  for (const e of insertedEmps) {
    empMap[e.employee_code] = e.id;
  }

  const projects = [
    { project_code: "DAFF2501", name: "DAFF Digital Transformation Program", client: "Dept Agriculture Fisheries Forestry", client_code: "DAFF", client_manager: "Sarah Mitchell", engagement_manager: "David Williams", contract_type: "time_materials", billing_category: "Billable", work_type: "Advisory", vat: "DAFF", pipeline_status: "C", ad_status: "Active", status: "active", start_date: "2025-07-01", end_date: "2026-06-30", work_order_amount: 1800000, budget_amount: 1800000, actual_amount: 980000, forecasted_revenue: 1750000, sold_gm_percent: 0.35, to_date_gross_profit: 343000, to_date_gm_percent: 0.35, forecast_gm_percent: 0.34 },
    { project_code: "DAFF2502", name: "DAFF Biosecurity Data Platform", client: "Dept Agriculture Fisheries Forestry", client_code: "DAFF", client_manager: "Grace Kim", engagement_manager: "David Williams", contract_type: "fixed_price", billing_category: "Billable", work_type: "Technology", vat: "DAFF", pipeline_status: "C", ad_status: "Active", status: "active", start_date: "2025-09-01", end_date: "2026-03-31", work_order_amount: 650000, budget_amount: 650000, actual_amount: 320000, forecasted_revenue: 640000, sold_gm_percent: 0.40, to_date_gross_profit: 128000, to_date_gm_percent: 0.40, forecast_gm_percent: 0.38 },
    { project_code: "SAU2501", name: "Services Australia CX Improvement", client: "Services Australia", client_code: "SAU", client_manager: "James Chen", engagement_manager: "Sophie Brown", contract_type: "time_materials", billing_category: "Billable", work_type: "Advisory", vat: "SAU", pipeline_status: "C", ad_status: "Active", status: "active", start_date: "2025-07-01", end_date: "2026-06-30", work_order_amount: 2200000, budget_amount: 2200000, actual_amount: 1250000, forecasted_revenue: 2150000, sold_gm_percent: 0.32, to_date_gross_profit: 400000, to_date_gm_percent: 0.32, forecast_gm_percent: 0.31 },
    { project_code: "SAU2502", name: "Services Australia Cloud Migration", client: "Services Australia", client_code: "SAU", client_manager: "Lisa Kumar", engagement_manager: "Sophie Brown", contract_type: "time_materials", billing_category: "Billable", work_type: "Technology", vat: "SAU", pipeline_status: "C", ad_status: "Active", status: "active", start_date: "2025-10-01", end_date: "2026-06-30", work_order_amount: 900000, budget_amount: 900000, actual_amount: 380000, forecasted_revenue: 880000, sold_gm_percent: 0.38, to_date_gross_profit: 144400, to_date_gm_percent: 0.38, forecast_gm_percent: 0.36 },
    { project_code: "VIC2501", name: "VIC Gov Service Delivery Review", client: "Victorian Government", client_code: "VIC", client_manager: "Emily Nguyen", engagement_manager: "Chris McDonald", contract_type: "fixed_price", billing_category: "Billable", work_type: "Advisory", vat: "VIC Gov", pipeline_status: "C", ad_status: "Active", status: "active", start_date: "2025-08-01", end_date: "2026-02-28", work_order_amount: 520000, budget_amount: 520000, actual_amount: 310000, forecasted_revenue: 510000, sold_gm_percent: 0.30, to_date_gross_profit: 93000, to_date_gm_percent: 0.30, forecast_gm_percent: 0.29 },
    { project_code: "DISR2501", name: "DISR Industry Policy Analytics", client: "Dept Industry Science Resources", client_code: "DISR", client_manager: "Michael Patel", engagement_manager: "Ryan Johnson", contract_type: "time_materials", billing_category: "Billable", work_type: "Data & Analytics", vat: "DISR", pipeline_status: "C", ad_status: "Active", status: "active", start_date: "2025-07-01", end_date: "2026-06-30", work_order_amount: 1400000, budget_amount: 1400000, actual_amount: 750000, forecasted_revenue: 1380000, sold_gm_percent: 0.33, to_date_gross_profit: 247500, to_date_gm_percent: 0.33, forecast_gm_percent: 0.32 },
    { project_code: "DISR2502", name: "DISR Grant Management System", client: "Dept Industry Science Resources", client_code: "DISR", client_manager: "Alex Wright", engagement_manager: "Ryan Johnson", contract_type: "fixed_price", billing_category: "Billable", work_type: "Technology", vat: "DISR", pipeline_status: "S", ad_status: "Active", status: "active", start_date: "2026-01-06", end_date: "2026-06-30", work_order_amount: 480000, budget_amount: 480000, actual_amount: 85000, forecasted_revenue: 470000, sold_gm_percent: 0.36, to_date_gross_profit: 30600, to_date_gm_percent: 0.36, forecast_gm_percent: 0.35 },
    { project_code: "GRW2501", name: "Growth Markets Entry Strategy", client: "Multiple Clients", client_code: "GRW", client_manager: "Hannah Scott", engagement_manager: "Rachel Thompson", contract_type: "time_materials", billing_category: "Billable", work_type: "Advisory", vat: "GROWTH", pipeline_status: "C", ad_status: "Active", status: "active", start_date: "2025-09-01", end_date: "2026-06-30", work_order_amount: 350000, budget_amount: 350000, actual_amount: 160000, forecasted_revenue: 340000, sold_gm_percent: 0.28, to_date_gross_profit: 44800, to_date_gm_percent: 0.28, forecast_gm_percent: 0.27 },
    { project_code: "PP2501", name: "P&P Portfolio Optimisation", client: "Internal", client_code: "PP", client_manager: "Jessica Garcia", engagement_manager: "Tom Anderson", contract_type: "time_materials", billing_category: "Billable", work_type: "Advisory", vat: "P&P", pipeline_status: "C", ad_status: "Active", status: "active", start_date: "2025-07-01", end_date: "2026-06-30", work_order_amount: 600000, budget_amount: 600000, actual_amount: 320000, forecasted_revenue: 580000, sold_gm_percent: 0.30, to_date_gross_profit: 96000, to_date_gm_percent: 0.30, forecast_gm_percent: 0.29 },
    { project_code: "EMG2501", name: "Emerging Tech AI Governance Framework", client: "Multiple Clients", client_code: "EMG", client_manager: "Priya Sharma", engagement_manager: "Daniel Russo", contract_type: "fixed_price", billing_category: "Billable", work_type: "Advisory", vat: "Emerging", pipeline_status: "C", ad_status: "Active", status: "active", start_date: "2025-10-01", end_date: "2026-04-30", work_order_amount: 280000, budget_amount: 280000, actual_amount: 110000, forecasted_revenue: 275000, sold_gm_percent: 0.42, to_date_gross_profit: 46200, to_date_gm_percent: 0.42, forecast_gm_percent: 0.40 },
    { project_code: "INT001", name: "Internal - Leave & Training", client: "Internal", client_code: "INT", contract_type: "time_materials", billing_category: "Non-Billable", work_type: "Internal", pipeline_status: "C", ad_status: "Active", status: "active", start_date: "2025-07-01", end_date: "2026-06-30", work_order_amount: 0, budget_amount: 0, actual_amount: 0 },
    { project_code: "INT002", name: "Internal - Business Development", client: "Internal", client_code: "INT", contract_type: "time_materials", billing_category: "Non-Billable", work_type: "Internal", pipeline_status: "C", ad_status: "Active", status: "active", start_date: "2025-07-01", end_date: "2026-06-30", work_order_amount: 0, budget_amount: 0, actual_amount: 0 },
    { project_code: "RGT001", name: "RGT Platform Support", client: "Internal", client_code: "RGT", contract_type: "time_materials", billing_category: "Non-Billable", work_type: "Internal", pipeline_status: "C", ad_status: "Active", status: "active", start_date: "2025-07-01", end_date: "2026-06-30", work_order_amount: 0, budget_amount: 0, actual_amount: 0 },
  ];

  console.log("Inserting 13 projects...");
  const insertedProjs = await db("projects").insert(projects).returning("*");
  const projMap: Record<string, number> = {};
  for (const p of insertedProjs) {
    projMap[p.project_code] = p.id;
  }

  const fyMonths = [
    { month: 1, label: "Jul", monthNum: 7 },
    { month: 2, label: "Aug", monthNum: 8 },
    { month: 3, label: "Sep", monthNum: 9 },
    { month: 4, label: "Oct", monthNum: 10 },
    { month: 5, label: "Nov", monthNum: 11 },
    { month: 6, label: "Dec", monthNum: 12 },
    { month: 7, label: "Jan", monthNum: 1 },
    { month: 8, label: "Feb", monthNum: 2 },
  ];

  console.log("Inserting project monthly data...");
  const monthlyData: any[] = [];
  const activeProjects = ["DAFF2501", "DAFF2502", "SAU2501", "SAU2502", "VIC2501", "DISR2501", "DISR2502", "GRW2501", "PP2501", "EMG2501"];
  const monthlyRevenues: Record<string, number[]> = {
    DAFF2501: [140000, 155000, 160000, 145000, 130000, 110000, 70000, 70000],
    DAFF2502: [0, 0, 75000, 85000, 80000, 80000, 0, 0],
    SAU2501: [170000, 180000, 175000, 190000, 185000, 165000, 100000, 85000],
    SAU2502: [0, 0, 0, 80000, 90000, 85000, 65000, 60000],
    VIC2501: [0, 55000, 65000, 70000, 60000, 60000, 0, 0],
    DISR2501: [100000, 110000, 115000, 120000, 105000, 100000, 50000, 50000],
    DISR2502: [0, 0, 0, 0, 0, 0, 45000, 40000],
    GRW2501: [0, 0, 30000, 35000, 30000, 25000, 20000, 20000],
    PP2501: [45000, 50000, 55000, 50000, 45000, 40000, 20000, 15000],
    EMG2501: [0, 0, 0, 20000, 25000, 30000, 20000, 15000],
  };

  for (const code of activeProjects) {
    const revs = monthlyRevenues[code];
    for (let mi = 0; mi < fyMonths.length; mi++) {
      const rev = revs[mi];
      if (rev === 0) continue;
      const gmPercent = 0.28 + Math.random() * 0.12;
      const cost = rev * (1 - gmPercent);
      monthlyData.push({
        project_id: projMap[code],
        fy_year: FY,
        month: fyMonths[mi].month,
        month_label: fyMonths[mi].label,
        revenue: rev.toFixed(2),
        cost: cost.toFixed(2),
        profit: (rev - cost).toFixed(2),
      });
    }
  }
  await db("project_monthly").insert(monthlyData);

  console.log("Inserting timesheets...");
  const timesheets: any[] = [];
  const weekEndings: string[] = [];
  const startDate = new Date("2025-07-06");
  for (let w = 0; w < 34; w++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + w * 7);
    weekEndings.push(d.toISOString().split("T")[0]);
  }

  const empProjectAssignments: Record<string, string[]> = {
    EMP001: ["DAFF2501", "INT002"],
    EMP002: ["SAU2501", "INT002"],
    EMP003: ["VIC2501", "INT001"],
    EMP004: ["DISR2501", "INT002"],
    EMP005: ["GRW2501", "INT001"],
    EMP006: ["DAFF2501", "DAFF2502", "INT002"],
    EMP007: ["SAU2502", "SAU2501"],
    EMP008: ["PP2501", "INT001"],
    EMP009: ["EMG2501", "INT002"],
    EMP010: ["GRW2501", "DISR2501"],
    EMP011: ["DAFF2501", "DAFF2502"],
    EMP012: ["VIC2501", "INT001"],
    EMP013: ["SAU2501", "SAU2502", "INT002"],
    EMP014: ["DISR2501", "DISR2502"],
    EMP015: ["PP2501", "INT002"],
    EMP016: ["EMG2501", "INT001"],
    EMP017: ["DAFF2501", "DAFF2502"],
    EMP018: ["VIC2501", "INT001"],
    EMP019: ["GRW2501", "INT001"],
    EMP020: ["DISR2501", "DISR2502", "INT002"],
  };

  function getFyMonth(weekEnding: string): { fyMonth: number; fyYear: string } {
    const d = new Date(weekEnding);
    const m = d.getMonth() + 1;
    const fyMonth = m >= 7 ? m - 6 : m + 6;
    return { fyMonth, fyYear: FY };
  }

  for (const [empCode, projectCodes] of Object.entries(empProjectAssignments)) {
    const empId = empMap[empCode];
    const emp = employees.find(e => e.employee_code === empCode)!;
    for (const we of weekEndings) {
      const { fyMonth, fyYear } = getFyMonth(we);
      const totalHours = 40;
      let remaining = totalHours;
      for (let pi = 0; pi < projectCodes.length; pi++) {
        const pCode = projectCodes[pi];
        const projId = projMap[pCode];
        const isLast = pi === projectCodes.length - 1;
        const isInternal = pCode.startsWith("INT") || pCode.startsWith("RGT");
        let hours: number;
        if (isLast) {
          hours = remaining;
        } else {
          hours = Math.min(remaining, 24 + Math.floor(Math.random() * 12));
        }
        if (hours <= 0) continue;
        remaining -= hours;
        const days = +(hours / 8).toFixed(1);
        const chargeRate = isInternal ? 0 : emp.gross_cost_rate * 1.5;
        timesheets.push({
          employee_id: empId,
          project_id: projId,
          week_ending: we,
          hours_worked: hours,
          sale_value: isInternal ? 0 : +(hours * chargeRate / 8).toFixed(2),
          cost_value: +(hours * emp.gross_cost_rate / 8).toFixed(2),
          days_worked: days,
          billable: !isInternal,
          activity_type: isInternal ? "Non-Billable" : "Billable",
          source: "seed",
          status: "approved",
          fy_month: fyMonth,
          fy_year: fyYear,
        });
      }
    }
  }

  for (let i = 0; i < timesheets.length; i += 500) {
    await db("timesheets").insert(timesheets.slice(i, i + 500));
  }
  console.log(`Inserted ${timesheets.length} timesheet records.`);

  console.log("Inserting pipeline opportunities...");
  const pipeline = [
    { name: "DAFF Regulatory Compliance Phase 2", classification: "S", vat: "DAFF", fy_year: FY, billing_type: "T&M", value: 750000, margin_percent: 0.35, work_type: "Advisory", status: "Active", start_date: "2026-04-01", cas_lead: "Sarah Mitchell", csd_lead: "David Williams", category: "Extension", partner: "ServiceNow", revenue_m10: 125000, revenue_m11: 187500, revenue_m12: 187500, gross_profit_m10: 43750, gross_profit_m11: 65625, gross_profit_m12: 65625 },
    { name: "SAU Digital Identity Program", classification: "P", vat: "SAU", fy_year: FY, billing_type: "Fixed", value: 1200000, margin_percent: 0.30, work_type: "Technology", status: "Active", start_date: "2026-07-01", cas_lead: "James Chen", csd_lead: "Sophie Brown", category: "New Business", partner: "Microsoft", revenue_m1: 0, revenue_m2: 0, revenue_m3: 0 },
    { name: "VIC Gov Shared Services Platform", classification: "S", vat: "VIC Gov", fy_year: FY, billing_type: "T&M", value: 420000, margin_percent: 0.32, work_type: "Technology", status: "Active", start_date: "2026-03-01", cas_lead: "Emily Nguyen", csd_lead: "Chris McDonald", category: "New Business", partner: "Tech One; Microsoft", revenue_m9: 105000, revenue_m10: 105000, revenue_m11: 105000, revenue_m12: 105000, gross_profit_m9: 33600, gross_profit_m10: 33600, gross_profit_m11: 33600, gross_profit_m12: 33600 },
    { name: "DISR Critical Minerals Data Hub", classification: "H", vat: "DISR", fy_year: FY, billing_type: "Fixed", value: 580000, margin_percent: 0.38, work_type: "Data & Analytics", status: "Active", start_date: "2026-07-01", cas_lead: "Michael Patel", csd_lead: "Ryan Johnson", category: "New Business", partner: "AWS; Microsoft" },
    { name: "Growth Markets Regional Expansion", classification: "P", vat: "GROWTH", fy_year: FY, billing_type: "T&M", value: 320000, margin_percent: 0.25, work_type: "Advisory", status: "Active", start_date: "2026-05-01", cas_lead: "Ben O'Brien", csd_lead: "Hannah Scott", category: "New Business", partner: "Salesforce", revenue_m11: 106667, revenue_m12: 106667, gross_profit_m11: 26667, gross_profit_m12: 26667 },
    { name: "P&P Risk Management Framework", classification: "C", vat: "P&P", fy_year: FY, billing_type: "T&M", value: 180000, margin_percent: 0.30, work_type: "Advisory", status: "Active", start_date: "2026-01-01", cas_lead: "Jessica Garcia", csd_lead: "Tom Anderson", category: "Extension", partner: "Tech One", revenue_m7: 30000, revenue_m8: 30000, revenue_m9: 30000, revenue_m10: 30000, revenue_m11: 30000, revenue_m12: 30000, gross_profit_m7: 9000, gross_profit_m8: 9000, gross_profit_m9: 9000, gross_profit_m10: 9000, gross_profit_m11: 9000, gross_profit_m12: 9000 },
    { name: "Emerging AI Ethics Advisory", classification: "S", vat: "Emerging", fy_year: FY, billing_type: "T&M", value: 250000, margin_percent: 0.40, work_type: "Advisory", status: "Active", start_date: "2026-04-01", cas_lead: "Priya Sharma", csd_lead: "Daniel Russo", category: "New Business", partner: "Microsoft; AWS", revenue_m10: 62500, revenue_m11: 62500, revenue_m12: 62500, gross_profit_m10: 25000, gross_profit_m11: 25000, gross_profit_m12: 25000 },
    { name: "DAFF Supply Chain Traceability", classification: "H", vat: "DAFF", fy_year: FY, billing_type: "Fixed", value: 950000, margin_percent: 0.33, work_type: "Technology", status: "Active", start_date: "2026-07-01", cas_lead: "Grace Kim", csd_lead: "David Williams", category: "New Business", partner: "ServiceNow; Microsoft" },
  ];
  await db("pipeline_opportunities").insert(pipeline);

  console.log("Inserting milestones...");
  const milestones = [
    { project_id: projMap.DAFF2501, name: "Phase 1 Complete", due_date: "2025-12-15", status: "completed", completed_date: "2025-12-12", amount: 450000, milestone_type: "Delivery", invoice_status: "Invoiced" },
    { project_id: projMap.DAFF2501, name: "Phase 2 Kickoff", due_date: "2026-01-15", status: "completed", completed_date: "2026-01-14", amount: 0, milestone_type: "Delivery", invoice_status: null },
    { project_id: projMap.DAFF2501, name: "UAT Sign-off", due_date: "2026-04-30", status: "in_progress", amount: 450000, milestone_type: "Billing", invoice_status: "Not Invoiced" },
    { project_id: projMap.DAFF2501, name: "Go Live", due_date: "2026-06-15", status: "not_started", amount: 450000, milestone_type: "Delivery", invoice_status: "Not Invoiced" },
    { project_id: projMap.SAU2501, name: "Discovery Complete", due_date: "2025-09-30", status: "completed", completed_date: "2025-09-28", amount: 550000, milestone_type: "Billing", invoice_status: "Invoiced" },
    { project_id: projMap.SAU2501, name: "Design Approval", due_date: "2025-12-20", status: "completed", completed_date: "2025-12-18", amount: 550000, milestone_type: "Billing", invoice_status: "Invoiced" },
    { project_id: projMap.SAU2501, name: "Implementation Complete", due_date: "2026-04-30", status: "in_progress", amount: 550000, milestone_type: "Delivery", invoice_status: "Not Invoiced" },
    { project_id: projMap.SAU2501, name: "Final Delivery", due_date: "2026-06-30", status: "not_started", amount: 550000, milestone_type: "Billing", invoice_status: "Not Invoiced" },
    { project_id: projMap.VIC2501, name: "Interim Report", due_date: "2025-11-15", status: "completed", completed_date: "2025-11-14", amount: 260000, milestone_type: "Billing", invoice_status: "Invoiced" },
    { project_id: projMap.VIC2501, name: "Final Report", due_date: "2026-02-28", status: "in_progress", amount: 260000, milestone_type: "Billing", invoice_status: "Not Invoiced" },
    { project_id: projMap.DISR2501, name: "Sprint 5 Demo", due_date: "2026-02-14", status: "in_progress", amount: 350000, milestone_type: "Delivery", invoice_status: "Not Invoiced" },
    { project_id: projMap.DISR2501, name: "Platform Launch", due_date: "2026-05-31", status: "not_started", amount: 350000, milestone_type: "Delivery", invoice_status: "Not Invoiced" },
    { project_id: projMap.EMG2501, name: "Framework Draft", due_date: "2026-01-31", status: "completed", completed_date: "2026-01-29", amount: 140000, milestone_type: "Billing", invoice_status: "Invoiced" },
    { project_id: projMap.EMG2501, name: "Final Framework", due_date: "2026-04-30", status: "in_progress", amount: 140000, milestone_type: "Billing", invoice_status: "Not Invoiced" },
  ];
  await db("milestones").insert(milestones);

  console.log("Inserting costs...");
  const costs: any[] = [];
  const costMonths = ["2025-07-01", "2025-08-01", "2025-09-01", "2025-10-01", "2025-11-01", "2025-12-01", "2026-01-01", "2026-02-01"];
  for (const code of activeProjects) {
    for (const month of costMonths) {
      const baseCost = 5000 + Math.floor(Math.random() * 8000);
      costs.push({
        project_id: projMap[code],
        category: "Travel & Accommodation",
        description: "Team travel expenses",
        amount: baseCost,
        month,
        cost_type: "direct",
        source: "seed",
      });
      if (Math.random() > 0.5) {
        costs.push({
          project_id: projMap[code],
          category: "Software & Licensing",
          description: "Tool licensing costs",
          amount: 1500 + Math.floor(Math.random() * 3000),
          month,
          cost_type: "direct",
          source: "seed",
        });
      }
    }
  }
  await db("costs").insert(costs);

  console.log("Inserting CX ratings...");
  const cxRatings = [
    { project_id: projMap.DAFF2501, employee_id: empMap.EMP001, engagement_name: "DAFF Digital Transformation", check_point_date: "2025-12-15", cx_rating: 9, resource_name: "Sarah Mitchell", is_client_manager: true, rationale: "Excellent stakeholder management and delivery quality" },
    { project_id: projMap.DAFF2501, employee_id: empMap.EMP006, engagement_name: "DAFF Digital Transformation", check_point_date: "2025-12-15", cx_rating: 8, resource_name: "David Williams", is_delivery_manager: true, rationale: "Strong leadership, minor scheduling adjustments needed" },
    { project_id: projMap.SAU2501, employee_id: empMap.EMP002, engagement_name: "SAU CX Improvement", check_point_date: "2025-11-30", cx_rating: 8, resource_name: "James Chen", is_client_manager: true, rationale: "Good technical depth, client very satisfied" },
    { project_id: projMap.SAU2501, employee_id: empMap.EMP013, engagement_name: "SAU CX Improvement", check_point_date: "2025-11-30", cx_rating: 9, resource_name: "Sophie Brown", is_delivery_manager: true, rationale: "Proactive risk management, strong client relationships" },
    { project_id: projMap.VIC2501, employee_id: empMap.EMP003, engagement_name: "VIC Gov Service Review", check_point_date: "2026-01-15", cx_rating: 7, resource_name: "Emily Nguyen", is_client_manager: true, rationale: "Solid work, some communication gaps with stakeholders" },
    { project_id: projMap.DISR2501, employee_id: empMap.EMP004, engagement_name: "DISR Policy Analytics", check_point_date: "2026-01-20", cx_rating: 9, resource_name: "Michael Patel", is_client_manager: true, rationale: "Outstanding data analytics delivery, exceeding expectations" },
    { project_id: projMap.EMG2501, employee_id: empMap.EMP009, engagement_name: "AI Governance Framework", check_point_date: "2026-01-31", cx_rating: 10, resource_name: "Priya Sharma", is_client_manager: true, rationale: "Exceptional thought leadership, framework widely praised" },
    { project_id: projMap.PP2501, employee_id: empMap.EMP008, engagement_name: "P&P Portfolio Optimisation", check_point_date: "2025-12-20", cx_rating: 7, resource_name: "Tom Anderson", is_client_manager: true, rationale: "Good technical delivery, engagement could be more proactive" },
  ];
  await db("cx_ratings").insert(cxRatings);

  console.log("Inserting rate cards...");
  const rateCards = [
    { role: "Graduate Consultant", grade: "Graduate", location: "Canberra", base_rate: 420, charge_rate: 850, effective_from: "2025-07-01", currency: "AUD" },
    { role: "Graduate Consultant", grade: "Analyst", location: "Canberra", base_rate: 520, charge_rate: 950, effective_from: "2025-07-01", currency: "AUD" },
    { role: "Consultant", grade: "Mid", location: "Canberra", base_rate: 680, charge_rate: 1200, effective_from: "2025-07-01", currency: "AUD" },
    { role: "Consultant", grade: "Mid", location: "Melbourne", base_rate: 650, charge_rate: 1150, effective_from: "2025-07-01", currency: "AUD" },
    { role: "Consultant", grade: "Mid", location: "Sydney", base_rate: 670, charge_rate: 1180, effective_from: "2025-07-01", currency: "AUD" },
    { role: "Senior Consultant", grade: "Senior", location: "Canberra", base_rate: 900, charge_rate: 1600, effective_from: "2025-07-01", currency: "AUD" },
    { role: "Senior Consultant", grade: "Senior", location: "Melbourne", base_rate: 870, charge_rate: 1550, effective_from: "2025-07-01", currency: "AUD" },
    { role: "Senior Consultant", grade: "Senior", location: "Sydney", base_rate: 880, charge_rate: 1580, effective_from: "2025-07-01", currency: "AUD" },
    { role: "Principal Consultant", grade: "Principal", location: "Canberra", base_rate: 1100, charge_rate: 2000, effective_from: "2025-07-01", currency: "AUD" },
    { role: "Principal Consultant", grade: "Principal", location: "Melbourne", base_rate: 1050, charge_rate: 1900, effective_from: "2025-07-01", currency: "AUD" },
    { role: "Engagement Manager", grade: "Manager", location: "Canberra", base_rate: 1350, charge_rate: 2400, effective_from: "2025-07-01", currency: "AUD" },
  ];
  await db("rate_cards").insert(rateCards);

  console.log("Inserting resource costs...");
  const resourceCosts: any[] = [];
  for (const emp of insertedEmps) {
    if (emp.staff_type === "Contractor") continue;
    const monthlyCost = +(emp.base_salary / 12).toFixed(2);
    const onCosts = +(monthlyCost * 0.2).toFixed(2);
    resourceCosts.push({
      employee_id: emp.id,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      staff_type: emp.staff_type,
      cost_phase: "FY 25-26",
      fy_year: FY,
      cost_m1: monthlyCost + onCosts,
      cost_m2: monthlyCost + onCosts,
      cost_m3: monthlyCost + onCosts,
      cost_m4: monthlyCost + onCosts,
      cost_m5: monthlyCost + onCosts,
      cost_m6: monthlyCost + onCosts,
      cost_m7: monthlyCost + onCosts,
      cost_m8: monthlyCost + onCosts,
      cost_m9: monthlyCost + onCosts,
      cost_m10: monthlyCost + onCosts,
      cost_m11: monthlyCost + onCosts,
      cost_m12: monthlyCost + onCosts,
      total_cost: +((monthlyCost + onCosts) * 12).toFixed(2),
      source: "seed",
    });
  }
  await db("resource_costs").insert(resourceCosts);

  console.log("Inserting resource plans...");
  const resourcePlans: any[] = [];
  const planMonths = [
    "2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01",
  ];
  const planAssignments = [
    { emp: "EMP001", proj: "DAFF2501", pct: 80 },
    { emp: "EMP002", proj: "SAU2501", pct: 100 },
    { emp: "EMP003", proj: "VIC2501", pct: 60 },
    { emp: "EMP004", proj: "DISR2501", pct: 80 },
    { emp: "EMP005", proj: "GRW2501", pct: 100 },
    { emp: "EMP006", proj: "DAFF2501", pct: 50 },
    { emp: "EMP006", proj: "DAFF2502", pct: 30 },
    { emp: "EMP007", proj: "SAU2502", pct: 60 },
    { emp: "EMP007", proj: "SAU2501", pct: 40 },
    { emp: "EMP009", proj: "EMG2501", pct: 80 },
    { emp: "EMP010", proj: "GRW2501", pct: 50 },
    { emp: "EMP010", proj: "DISR2501", pct: 50 },
    { emp: "EMP014", proj: "DISR2502", pct: 100 },
    { emp: "EMP015", proj: "PP2501", pct: 80 },
    { emp: "EMP017", proj: "DAFF2501", pct: 60 },
    { emp: "EMP017", proj: "DAFF2502", pct: 40 },
  ];

  for (const pa of planAssignments) {
    for (const month of planMonths) {
      const daysInMonth = 22;
      const plannedDays = +(daysInMonth * pa.pct / 100).toFixed(1);
      resourcePlans.push({
        project_id: projMap[pa.proj],
        employee_id: empMap[pa.emp],
        month,
        planned_days: plannedDays,
        planned_hours: +(plannedDays * 8).toFixed(1),
        allocation_percent: pa.pct,
      });
    }
  }
  await db("resource_plans").insert(resourcePlans);

  console.log("\n=== Seed Data Summary ===");
  console.log(`Employees: ${insertedEmps.length}`);
  console.log(`Projects: ${insertedProjs.length} (10 billable + 3 internal)`);
  console.log(`Monthly financials: ${monthlyData.length} records`);
  console.log(`Timesheets: ${timesheets.length} records`);
  console.log(`Pipeline opportunities: ${pipeline.length}`);
  console.log(`Milestones: ${milestones.length}`);
  console.log(`Costs: ${costs.length}`);
  console.log(`CX Ratings: ${cxRatings.length}`);
  console.log(`Rate Cards: ${rateCards.length}`);
  console.log(`Resource Costs: ${resourceCosts.length}`);
  console.log(`Resource Plans: ${resourcePlans.length}`);
  console.log("========================\n");
  console.log("Seed data inserted successfully!");

  await db.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
