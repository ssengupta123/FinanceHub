import Knex from "knex";

const isMSSQL = process.env.DB_CLIENT === "mssql";

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
      pool: { min: 2, max: 10 },
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

  console.log("Incremental migrations completed");
}
