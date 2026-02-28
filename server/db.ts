import Knex from "knex";

export const isMSSQL = process.env.DB_CLIENT === "mssql";

const knexConfig: Knex.Knex.Config = isMSSQL
  ? {
      client: "mssql",
      connection: {
        server: process.env.AZURE_SQL_SERVER || "",
        database: process.env.AZURE_SQL_DATABASE || "",
        user: process.env.AZURE_SQL_USER || "",
        password: process.env.AZURE_SQL_PASSWORD || "",
        options: {
          encrypt: true,
          trustServerCertificate: false,
        },
      },
      pool: { min: 2, max: 10 },
    }
  : {
      client: "pg",
      connection: process.env.DATABASE_URL,
      pool: { min: 1, max: 5 },
    };

export const db = Knex(knexConfig);

export async function runMigrations() {
  const hasEmployees = await db.schema.hasTable("employees");
  if (hasEmployees) {
    const hasUsers = await db.schema.hasTable("users");
    if (!hasUsers) {
      await db.schema.createTable("users", (t) => {
        t.increments("id").primary();
        t.string("username", 255).notNullable().unique();
        t.text("password").notNullable();
        t.string("role", 50).defaultTo("user");
        t.string("email", 255);
        t.string("display_name", 255);
      });
      console.log("Created missing users table");
    }
    const hasReferenceData = await db.schema.hasTable("reference_data");
    if (!hasReferenceData) {
      await db.schema.createTable("reference_data", (t) => {
        t.increments("id").primary();
        t.text("category").notNullable();
        t.text("key").notNullable();
        t.text("value").notNullable();
        t.integer("display_order");
        t.boolean("active").defaultTo(true);
      });
      console.log("Created missing reference_data table");
    }
    const hasConversations = await db.schema.hasTable("conversations");
    if (!hasConversations) {
      await db.schema.createTable("conversations", (t) => {
        t.increments("id").primary();
        t.text("title").notNullable();
        t.timestamp("created_at").defaultTo(db.fn.now()).notNullable();
      });
      console.log("Created missing conversations table");
    }
    const hasMessages = await db.schema.hasTable("messages");
    if (!hasMessages) {
      await db.schema.createTable("messages", (t) => {
        t.increments("id").primary();
        t.integer("conversation_id").notNullable().references("id").inTable("conversations").onDelete("CASCADE");
        t.text("role").notNullable();
        t.text("content").notNullable();
        t.timestamp("created_at").defaultTo(db.fn.now()).notNullable();
      });
      console.log("Created missing messages table");
    }
    return;
  }

  await db.schema.createTable("employees", (t) => {
    t.increments("id").primary();
    t.string("employee_code", 50).notNullable().unique();
    t.text("first_name").notNullable();
    t.text("last_name").notNullable();
    t.text("email");
    t.text("role");
    t.text("cost_band_level");
    t.text("staff_type");
    t.text("grade");
    t.text("location");
    t.text("cost_center");
    t.text("security_clearance");
    t.boolean("payroll_tax").defaultTo(false);
    t.decimal("payroll_tax_rate", 5, 4);
    t.decimal("base_cost", 10, 2);
    t.decimal("gross_cost_rate", 10, 2);
    t.decimal("base_salary", 12, 2);
    t.text("status").notNullable().defaultTo("active");
    t.date("start_date");
    t.date("end_date");
    t.date("schedule_start");
    t.date("schedule_end");
    t.text("resource_group");
    t.text("team");
    t.text("jid");
    t.text("onboarding_status").defaultTo("not_started");
  });

  await db.schema.createTable("projects", (t) => {
    t.increments("id").primary();
    t.string("project_code", 50).notNullable().unique();
    t.text("name").notNullable();
    t.text("client");
    t.text("client_code");
    t.text("client_manager");
    t.text("engagement_manager");
    t.text("engagement_support");
    t.text("contract_type");
    t.text("billing_category");
    t.text("work_type");
    t.text("panel");
    t.text("recurring");
    t.text("vat");
    t.text("pipeline_status").defaultTo("C");
    t.text("ad_status").defaultTo("Active");
    t.text("status").notNullable().defaultTo("active");
    t.date("start_date");
    t.date("end_date");
    t.decimal("work_order_amount", 14, 2);
    t.decimal("budget_amount", 14, 2);
    t.decimal("contract_value", 14, 2);
    t.decimal("actual_amount", 14, 2);
    t.decimal("balance_amount", 14, 2);
    t.decimal("forecasted_revenue", 14, 2);
    t.decimal("forecasted_gross_cost", 14, 2);
    t.decimal("variance_at_completion", 14, 2);
    t.decimal("variance_percent", 8, 4);
    t.decimal("variance_to_contract_percent", 8, 4);
    t.decimal("write_off", 14, 2);
    t.decimal("sold_gm_percent", 8, 4);
    t.decimal("to_date_gross_profit", 14, 2);
    t.decimal("to_date_gm_percent", 8, 4);
    t.decimal("gp_at_completion", 14, 2);
    t.decimal("forecast_gm_percent", 8, 4);
    t.text("ops_commentary");
    t.text("description");
  });

  await db.schema.createTable("project_monthly", (t) => {
    t.increments("id").primary();
    t.integer("project_id").notNullable().references("id").inTable("projects").onDelete("CASCADE");
    t.text("fy_year");
    t.integer("month").notNullable();
    t.text("month_label");
    t.decimal("revenue", 14, 2).defaultTo(0);
    t.decimal("cost", 14, 2).defaultTo(0);
    t.decimal("profit", 14, 2).defaultTo(0);
  });

  await db.schema.createTable("rate_cards", (t) => {
    t.increments("id").primary();
    t.text("role").notNullable();
    t.text("grade");
    t.text("location");
    t.decimal("base_rate", 10, 2).notNullable();
    t.decimal("charge_rate", 10, 2).notNullable();
    t.date("effective_from").notNullable();
    t.date("effective_to");
    t.text("currency").defaultTo("AUD");
  });

  await db.schema.createTable("resource_plans", (t) => {
    t.increments("id").primary();
    t.integer("project_id").notNullable().references("id").inTable("projects").onDelete("CASCADE");
    t.integer("employee_id").notNullable().references("id").inTable("employees").onDelete("CASCADE");
    t.date("month").notNullable();
    t.decimal("planned_days", 5, 1);
    t.decimal("planned_hours", 6, 1);
    t.decimal("allocation_percent", 5, 2);
  });

  await db.schema.createTable("timesheets", (t) => {
    t.increments("id").primary();
    t.integer("employee_id").notNullable().references("id").inTable("employees").onDelete("CASCADE");
    t.integer("project_id").notNullable().references("id").inTable("projects").onDelete("CASCADE");
    t.date("week_ending").notNullable();
    t.decimal("hours_worked", 6, 2).notNullable();
    t.decimal("sale_value", 12, 2);
    t.decimal("cost_value", 12, 2);
    t.decimal("days_worked", 4, 1);
    t.boolean("billable").defaultTo(true);
    t.text("activity_type");
    t.text("source").defaultTo("manual");
    t.text("status").defaultTo("submitted");
    t.integer("fy_month");
    t.text("fy_year");
  });

  await db.schema.createTable("costs", (t) => {
    t.increments("id").primary();
    t.integer("project_id").notNullable().references("id").inTable("projects").onDelete("CASCADE");
    t.text("category").notNullable();
    t.text("description");
    t.decimal("amount", 14, 2).notNullable();
    t.date("month").notNullable();
    t.text("cost_type").notNullable().defaultTo("resource");
    t.text("source").defaultTo("calculated");
  });

  await db.schema.createTable("kpis", (t) => {
    t.increments("id").primary();
    t.integer("project_id").notNullable().references("id").inTable("projects").onDelete("CASCADE");
    t.date("month").notNullable();
    t.decimal("revenue", 14, 2);
    t.decimal("contract_rate", 10, 2);
    t.decimal("billed_amount", 14, 2);
    t.decimal("unbilled_amount", 14, 2);
    t.decimal("gross_cost", 14, 2);
    t.decimal("resource_cost", 14, 2);
    t.decimal("rd_cost", 14, 2);
    t.decimal("margin", 14, 2);
    t.decimal("margin_percent", 5, 2);
    t.decimal("burn_rate", 14, 2);
    t.decimal("utilization", 5, 2);
  });

  await db.schema.createTable("pipeline_opportunities", (t) => {
    t.increments("id").primary();
    t.text("name").notNullable();
    t.text("classification").notNullable();
    t.text("vat");
    t.text("fy_year");
    t.text("billing_type");
    for (let i = 1; i <= 12; i++) {
      t.decimal(`revenue_m${i}`, 14, 2).defaultTo(0);
    }
    for (let i = 1; i <= 12; i++) {
      t.decimal(`gross_profit_m${i}`, 14, 2).defaultTo(0);
    }
  });

  await db.schema.createTable("scenarios", (t) => {
    t.increments("id").primary();
    t.text("name").notNullable();
    t.text("description");
    t.text("fy_year").notNullable();
    t.decimal("revenue_goal", 14, 2);
    t.decimal("margin_goal_percent", 5, 2);
    t.timestamp("created_at").defaultTo(db.fn.now());
  });

  await db.schema.createTable("scenario_adjustments", (t) => {
    t.increments("id").primary();
    t.integer("scenario_id").notNullable().references("id").inTable("scenarios").onDelete("CASCADE");
    t.integer("opportunity_id").references("id").inTable("pipeline_opportunities").onDelete("CASCADE");
    t.text("classification");
    t.text("adjustment_type").notNullable();
    t.decimal("win_probability", 5, 2);
    t.decimal("revenue_override", 14, 2);
    t.integer("start_month_shift");
    t.text("notes");
  });

  await db.schema.createTable("forecasts", (t) => {
    t.increments("id").primary();
    t.integer("project_id").notNullable().references("id").inTable("projects").onDelete("CASCADE");
    t.date("month").notNullable();
    t.decimal("forecast_revenue", 14, 2);
    t.decimal("forecast_cost", 14, 2);
    t.decimal("forecast_margin", 14, 2);
    t.decimal("forecast_utilization", 5, 2);
    t.decimal("forecast_burn_rate", 14, 2);
    t.text("notes");
  });

  await db.schema.createTable("milestones", (t) => {
    t.increments("id").primary();
    t.integer("project_id").notNullable().references("id").inTable("projects").onDelete("CASCADE");
    t.text("name").notNullable();
    t.date("due_date");
    t.date("completed_date");
    t.text("status").notNullable().defaultTo("pending");
    t.decimal("amount", 14, 2);
    t.text("milestone_type");
    t.text("invoice_status");
  });

  await db.schema.createTable("data_sources", (t) => {
    t.increments("id").primary();
    t.text("name").notNullable();
    t.text("type").notNullable();
    t.text("connection_info");
    t.timestamp("last_sync_at");
    t.text("status").defaultTo("configured");
    t.integer("records_processed").defaultTo(0);
    t.text("sync_frequency").defaultTo("manual");
  });

  await db.schema.createTable("onboarding_steps", (t) => {
    t.increments("id").primary();
    t.integer("employee_id").notNullable().references("id").inTable("employees").onDelete("CASCADE");
    t.text("step_name").notNullable();
    t.integer("step_order").notNullable();
    t.boolean("completed").defaultTo(false);
    t.timestamp("completed_at");
    t.text("notes");
  });

  await db.schema.createTable("users", (t) => {
    t.increments("id").primary();
    t.string("username", 255).notNullable().unique();
    t.text("password").notNullable();
    t.string("role", 50).defaultTo("user");
    t.string("email", 255);
    t.string("display_name", 255);
  });

  await db.schema.createTable("reference_data", (t) => {
    t.increments("id").primary();
    t.text("category").notNullable();
    t.text("key").notNullable();
    t.text("value").notNullable();
    t.integer("display_order");
    t.boolean("active").defaultTo(true);
  });

  await db.schema.createTable("conversations", (t) => {
    t.increments("id").primary();
    t.text("title").notNullable();
    t.timestamp("created_at").defaultTo(db.fn.now()).notNullable();
  });

  await db.schema.createTable("messages", (t) => {
    t.increments("id").primary();
    t.integer("conversation_id").notNullable().references("id").inTable("conversations").onDelete("CASCADE");
    t.text("role").notNullable();
    t.text("content").notNullable();
    t.timestamp("created_at").defaultTo(db.fn.now()).notNullable();
  });

  console.log("Database tables created successfully");
}

export async function runIncrementalMigrations() {
  const hasBillingType = await db.schema.hasColumn("pipeline_opportunities", "billing_type");
  if (!hasBillingType) {
    await db.schema.alterTable("pipeline_opportunities", (t) => {
      t.text("billing_type");
    });
  }

  const hasMilestoneType = await db.schema.hasColumn("milestones", "milestone_type");
  if (!hasMilestoneType) {
    await db.schema.alterTable("milestones", (t) => {
      t.text("milestone_type");
      t.text("invoice_status");
    });
  }

  const hasUserRole = await db.schema.hasColumn("users", "role");
  if (!hasUserRole) {
    await db.schema.alterTable("users", (t) => {
      t.text("role").defaultTo("user");
      t.text("email");
      t.text("display_name");
    });
  }

  const hasRefData = await db.schema.hasTable("reference_data");
  if (!hasRefData) {
    await db.schema.createTable("reference_data", (t) => {
      t.increments("id").primary();
      t.text("category").notNullable();
      t.text("key").notNullable();
      t.text("value").notNullable();
      t.integer("display_order");
      t.boolean("active").defaultTo(true);
    });
  }

  const hasResourcePlans = await db.schema.hasTable("resource_plans");
  if (!hasResourcePlans) {
    await db.schema.createTable("resource_plans", (t) => {
      t.increments("id").primary();
      t.integer("project_id").notNullable().references("id").inTable("projects").onDelete("CASCADE");
      t.integer("employee_id").notNullable().references("id").inTable("employees").onDelete("CASCADE");
      t.date("month").notNullable();
      t.decimal("planned_days", 5, 1);
      t.decimal("planned_hours", 6, 1);
      t.decimal("allocation_percent", 5, 2);
    });
    console.log("Created resource_plans table");
  }

  const hasCxRatings = await db.schema.hasTable("cx_ratings");
  if (!hasCxRatings) {
    await db.schema.createTable("cx_ratings", (t) => {
      t.increments("id").primary();
      t.integer("project_id").references("id").inTable("projects").onDelete("SET NULL");
      t.integer("employee_id").references("id").inTable("employees").onDelete("SET NULL");
      t.text("engagement_name").notNullable();
      t.date("check_point_date");
      t.integer("cx_rating");
      t.text("resource_name");
      t.boolean("is_client_manager").defaultTo(false);
      t.boolean("is_delivery_manager").defaultTo(false);
      t.text("rationale");
    });
    console.log("Created cx_ratings table");
  }

  const hasResourceCosts = await db.schema.hasTable("resource_costs");
  if (!hasResourceCosts) {
    await db.schema.createTable("resource_costs", (t) => {
      t.increments("id").primary();
      t.integer("employee_id").references("id").inTable("employees").onDelete("SET NULL");
      t.text("employee_name").notNullable();
      t.text("staff_type");
      t.text("cost_phase");
      t.text("fy_year");
      for (let i = 1; i <= 12; i++) {
        t.decimal(`cost_m${i}`, 14, 2).defaultTo(0);
      }
      t.decimal("total_cost", 14, 2).defaultTo(0);
      t.text("source");
    });
    console.log("Created resource_costs table");
  }

  const hasPipelineValue = await db.schema.hasColumn("pipeline_opportunities", "value");
  if (!hasPipelineValue) {
    await db.schema.alterTable("pipeline_opportunities", (t) => {
      t.decimal("value", 14, 2);
      t.decimal("margin_percent", 5, 3);
      t.text("work_type");
      t.text("status");
      t.text("due_date");
      t.text("start_date");
      t.text("expiry_date");
      t.text("comment");
      t.text("cas_lead");
      t.text("csd_lead");
      t.text("category");
      t.text("partner");
      t.text("client_contact");
      t.text("client_code");
    });
    console.log("Added new pipeline_opportunities columns");
  }

  const hasRefFyYear = await db.schema.hasColumn("reference_data", "fy_year");
  if (!hasRefFyYear) {
    await db.schema.alterTable("reference_data", (t) => {
      t.text("fy_year");
    });
    console.log("Added fy_year column to reference_data");
  }

  const hasVatReports = await db.schema.hasTable("vat_reports");
  if (!hasVatReports) {
    await db.schema.createTable("vat_reports", (t) => {
      t.increments("id").primary();
      t.text("vat_name").notNullable();
      t.text("report_date").notNullable();
      t.text("overall_status");
      t.text("status_summary");
      t.text("open_opps_summary");
      t.text("big_plays");
      t.text("account_goals");
      t.text("relationships");
      t.text("research");
      t.text("approach_to_shortfall");
      t.text("other_activities");
      t.text("created_by");
      t.text("updated_by");
      t.timestamp("created_at").defaultTo(db.fn.now());
      t.timestamp("updated_at").defaultTo(db.fn.now());
    });
    console.log("Created vat_reports table");
  }

  const hasOpenOppsStatus = await db.schema.hasColumn("vat_reports", "open_opps_status");
  if (!hasOpenOppsStatus) {
    await db.schema.alterTable("vat_reports", (t) => {
      t.text("open_opps_status");
      t.text("big_plays_status");
      t.text("account_goals_status");
      t.text("relationships_status");
      t.text("research_status");
    });
    console.log("Added category status columns to vat_reports");
  }

  const hasVatRisks = await db.schema.hasTable("vat_risks");
  if (!hasVatRisks) {
    await db.schema.createTable("vat_risks", (t) => {
      t.increments("id").primary();
      t.integer("vat_report_id").notNullable().references("id").inTable("vat_reports").onDelete("CASCADE");
      t.text("raised_by");
      t.text("description").notNullable();
      t.text("impact");
      t.text("date_becomes_issue");
      t.text("status");
      t.text("owner");
      t.text("impact_rating");
      t.text("likelihood");
      t.text("mitigation");
      t.text("comments");
      t.text("risk_rating");
      t.text("risk_type").defaultTo("risk");
      t.integer("sort_order");
    });
    console.log("Created vat_risks table");
  }

  const hasVatActionItems = await db.schema.hasTable("vat_action_items");
  if (!hasVatActionItems) {
    await db.schema.createTable("vat_action_items", (t) => {
      t.increments("id").primary();
      t.integer("vat_report_id").notNullable().references("id").inTable("vat_reports").onDelete("CASCADE");
      t.text("section").notNullable();
      t.text("description").notNullable();
      t.text("owner");
      t.text("due_date");
      t.text("status").defaultTo("open");
      t.text("priority");
      t.integer("sort_order");
    });
    console.log("Created vat_action_items table");
  }

  const hasVatPlannerTasks = await db.schema.hasTable("vat_planner_tasks");
  if (!hasVatPlannerTasks) {
    await db.schema.createTable("vat_planner_tasks", (t) => {
      t.increments("id").primary();
      t.integer("vat_report_id").notNullable().references("id").inTable("vat_reports").onDelete("CASCADE");
      t.text("bucket_name").notNullable();
      t.text("task_name").notNullable();
      t.text("progress");
      t.text("due_date");
      t.text("priority");
      t.text("assigned_to");
      t.text("labels");
      t.integer("sort_order");
    });
    console.log("Created vat_planner_tasks table");
  }

  // Incremental migration: add external_id column for Planner sync
  const hasExternalId = await db.schema.hasColumn("vat_planner_tasks", "external_id");
  if (!hasExternalId) {
    await db.schema.alterTable("vat_planner_tasks", (t) => {
      t.text("external_id").nullable();
    });
    console.log("Added external_id column to vat_planner_tasks");
  }

  const hasVatChangeLogs = await db.schema.hasTable("vat_change_logs");
  if (!hasVatChangeLogs) {
    await db.schema.createTable("vat_change_logs", (t) => {
      t.increments("id").primary();
      t.integer("vat_report_id").references("id").inTable("vat_reports").onDelete("SET NULL");
      t.text("field_name").notNullable();
      t.text("old_value");
      t.text("new_value");
      t.text("changed_by");
      t.text("entity_type");
      t.integer("entity_id");
      t.timestamp("changed_at").defaultTo(db.fn.now());
    });
    console.log("Created vat_change_logs table");
  } else {
    try {
      const hasNotNull = await db.raw(`
        SELECT is_nullable FROM information_schema.columns
        WHERE table_name = 'vat_change_logs' AND column_name = 'vat_report_id'
      `);
      const resultRows = hasNotNull.rows || hasNotNull;
      const isNullable = resultRows?.[0]?.is_nullable;
      if (isNullable === 'NO') {
        await db.raw(`ALTER TABLE vat_change_logs DROP CONSTRAINT IF EXISTS vat_change_logs_vat_report_id_foreign`);
        await db.raw(`ALTER TABLE vat_change_logs ALTER COLUMN vat_report_id DROP NOT NULL`);
        await db.raw(`ALTER TABLE vat_change_logs ADD CONSTRAINT vat_change_logs_vat_report_id_foreign FOREIGN KEY (vat_report_id) REFERENCES vat_reports(id) ON DELETE SET NULL`);
        console.log("Updated vat_change_logs FK to SET NULL");
      }
    } catch (e) {
      console.log("vat_change_logs FK migration check skipped:", (e as Error).message);
    }
  }

  const hasVatTargets = await db.schema.hasTable("vat_targets");
  if (!hasVatTargets) {
    await db.schema.createTable("vat_targets", (t) => {
      t.increments("id").primary();
      t.text("vat_name").notNullable();
      t.text("fy_year").notNullable();
      t.text("metric").notNullable();
      t.text("target_ok");
      t.text("target_good");
      t.text("target_great");
      t.text("target_amazing");
      t.text("q1_target");
      t.text("q2_target");
      t.text("q3_target");
      t.text("q4_target");
    });
    console.log("Created vat_targets table");
  }

  const vatNameNormalization: Record<string, string> = {
    "VICGov": "VIC Gov",
    "Growth": "GROWTH",
  };
  for (const [oldName, newName] of Object.entries(vatNameNormalization)) {
    await db("reference_data").where({ category: "vat_category", key: oldName }).update({ key: newName, value: newName });
    await db("vat_targets").where({ vat_name: oldName }).update({ vat_name: newName });
  }

  const existingVatCats = await db("reference_data").where({ category: "vat_category" }).first();
  if (!existingVatCats) {
    const vatList = [
      { key: "DAFF", value: "DAFF", display_order: 1 },
      { key: "SAU", value: "SAU", display_order: 2 },
      { key: "VIC Gov", value: "VIC Gov", display_order: 3 },
      { key: "DISR", value: "DISR", display_order: 4 },
      { key: "GROWTH", value: "GROWTH", display_order: 5 },
      { key: "P&P", value: "P&P", display_order: 6 },
      { key: "Emerging", value: "Emerging", display_order: 7 },
    ];
    for (const v of vatList) {
      await db("reference_data").insert({
        category: "vat_category",
        key: v.key,
        value: v.value,
        display_order: v.display_order,
        active: true,
      });
    }
    console.log("Seeded VAT categories in reference_data");
  }

  const existingTargets = await db("vat_targets").first();
  if (!existingTargets) {
    const fy = "25-26";
    const targets = [
      { vat: "DAFF", gm_ok: "1800000", gm_good: "2250000", gm_great: "2700000", gm_amazing: "3150000", rev_ok: "5142857.14", rev_good: "6428571.43", rev_great: "7714285.71", rev_amazing: "7875000", gmp_ok: "0.35", gmp_good: "0.35", gmp_great: "0.35", gmp_amazing: "0.40" },
      { vat: "SAU", gm_ok: "900000", gm_good: "1350000", gm_great: "1800000", gm_amazing: "2250000", rev_ok: "6206896.55", rev_good: "9000000", rev_great: "12000000", rev_amazing: "11250000", gmp_ok: "0.145", gmp_good: "0.15", gmp_great: "0.15", gmp_amazing: "0.20" },
      { vat: "VIC Gov", gm_ok: "1800000", gm_good: "2250000", gm_great: "2700000", gm_amazing: "3150000", rev_ok: "6000000", rev_good: "6818181.82", rev_great: "8181818.18", rev_amazing: "9000000", gmp_ok: "0.30", gmp_good: "0.33", gmp_great: "0.33", gmp_amazing: "0.35" },
      { vat: "DISR", gm_ok: "690000", gm_good: "1200000", gm_great: "1500000", gm_amazing: "2100000", rev_ok: "2300000", rev_good: "4000000", rev_great: "5000000", rev_amazing: "6000000", gmp_ok: "0.30", gmp_good: "0.30", gmp_great: "0.30", gmp_amazing: "0.35" },
      { vat: "GROWTH", gm_ok: "1350000", gm_good: "2200000", gm_great: "3300000", gm_amazing: "4400000", rev_ok: "3648648.65", rev_good: "5500000", rev_great: "7333333.33", rev_amazing: "8800000", gmp_ok: "0.37", gmp_good: "0.40", gmp_great: "0.45", gmp_amazing: "0.50" },
      { vat: "Emerging", gm_ok: "540000", gm_good: "880000", gm_great: "1100000", gm_amazing: "1375000", rev_ok: "1350000", rev_good: "2200000", rev_great: "2750000", rev_amazing: "3437500", gmp_ok: "0.40", gmp_good: "0.40", gmp_great: "0.40", gmp_amazing: "0.40" },
      { vat: "P&P", gm_ok: "0", gm_good: "0", gm_great: "0", gm_amazing: "0", rev_ok: "0", rev_good: "0", rev_great: "0", rev_amazing: "0", gmp_ok: "0", gmp_good: "0", gmp_great: "0", gmp_amazing: "0" },
    ];
    for (const t of targets) {
      await db("vat_targets").insert({ vat_name: t.vat, fy_year: fy, metric: "gm_contribution", target_ok: t.gm_ok, target_good: t.gm_good, target_great: t.gm_great, target_amazing: t.gm_amazing });
      await db("vat_targets").insert({ vat_name: t.vat, fy_year: fy, metric: "revenue", target_ok: t.rev_ok, target_good: t.rev_good, target_great: t.rev_great, target_amazing: t.rev_amazing });
      await db("vat_targets").insert({ vat_name: t.vat, fy_year: fy, metric: "gm_percent", target_ok: t.gmp_ok, target_good: t.gmp_good, target_great: t.gmp_great, target_amazing: t.gmp_amazing });
    }
    console.log("Seeded initial VAT targets for FY 25-26");
  }

  const hasEmployeeUserId = await db.schema.hasColumn("employees", "user_id");
  if (!hasEmployeeUserId) {
    await db.schema.alterTable("employees", (t) => {
      t.integer("user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    });
    console.log("Added user_id column to employees table");
  }

  const hasRolePermissions = await db.schema.hasTable("role_permissions");
  if (!hasRolePermissions) {
    await db.schema.createTable("role_permissions", (t) => {
      t.increments("id").primary();
      t.string("role", 50).notNullable();
      t.string("resource", 100).notNullable();
      t.string("action", 50).notNullable();
      t.boolean("allowed").defaultTo(true);
      t.unique(["role", "resource", "action"]);
    });
    console.log("Created role_permissions table");

    const { DEFAULT_PERMISSIONS } = await import("@shared/schema");
    const rows: Array<{ role: string; resource: string; action: string; allowed: boolean }> = [];
    for (const [role, resources] of Object.entries(DEFAULT_PERMISSIONS)) {
      for (const [resource, actions] of Object.entries(resources)) {
        for (const action of actions) {
          rows.push({ role, resource, action, allowed: true });
        }
      }
    }
    if (rows.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        await db("role_permissions").insert(rows.slice(i, i + batchSize));
      }
    }
    console.log(`Seeded ${rows.length} default role permissions`);
  }

  const hasCertifications = await db.schema.hasColumn("employees", "certifications");
  if (!hasCertifications) {
    await db.schema.alterTable("employees", (t) => {
      t.text("certifications");
    });
    console.log("Added certifications column to employees");
  }

  console.log("Incremental migrations completed");
}
