# FinanceHub - Project Finance Management

A production-grade financial and project management application that consolidates data from multiple sources (manual entry, Excel imports, SharePoint, Microsoft Planner). It tracks project burn rates, resource utilisation, financial forecasts, customer experience ratings, and resource costs. Tailored for Australian Financial Year (Jul-Jun) with pipeline classifications, VAT categories, and billing types. Designed for Azure deployment with Azure AD SSO.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Key Business Concepts](#key-business-concepts)
- [Pages and Business Logic](#pages-and-business-logic)
  - [Main Dashboard](#1-main-dashboard)
  - [Finance Dashboard](#2-finance-dashboard)
  - [Utilisation Dashboard](#3-utilisation-dashboard)
  - [VAT Overview](#4-vat-overview)
  - [Pipeline](#5-pipeline)
  - [What-If Scenarios](#6-what-if-scenarios)
  - [Projects (Job Status)](#7-projects-job-status)
  - [Resources (Staff SOT)](#8-resources-staff-sot)
  - [Milestones and Invoices](#9-milestones-and-invoices)
  - [VAT Sales Committee Reports](#10-vat-sales-committee-reports)
  - [Partner View](#11-partner-view)
  - [Feature Requests](#12-feature-requests)
  - [AI Insights](#13-ai-insights)
  - [Data Upload (Excel Import)](#14-data-upload-excel-import)
  - [Administration](#15-administration)
- [Authentication and Access Control](#authentication-and-access-control)
- [Database Tables](#database-tables)
- [API Endpoints](#api-endpoints)
- [Frontend Routes](#frontend-routes)
- [External Integrations](#external-integrations)
- [Test Coverage](#test-coverage)
- [Getting Started](#getting-started)
- [Deployment](#deployment)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, Tailwind CSS, shadcn/ui, wouter (routing), TanStack Query (data fetching) |
| Backend | Express.js, Node.js, express-session |
| Database | PostgreSQL (dev) / Azure SQL MSSQL (prod) via Knex.js |
| Authentication | Session-based with bcryptjs + Azure AD SSO + JWT token handoff |
| Charts | Recharts (Pie, Area, Bar, ComposedChart) |
| AI | OpenAI GPT-4o-mini via Replit AI Integrations (SSE streaming) |
| File Parsing | xlsx (SheetJS) for Excel, JSZip for PPTX |

---

## Key Business Concepts

| Concept | How It Works |
|---------|-------------|
| **Australian Financial Year (FY)** | Runs Jul to Jun. Written as "25-26" meaning Jul 2025 to Jun 2026. Month 1 = July, Month 12 = June. |
| **Pipeline Classifications** | Each sales opportunity has a classification that indicates how likely it is to close: **C** (Contracted, 100%), **S** (Selected, 80%), **DVF** (Shortlisted, 50%), **DF** (Submitted, 30%), **Q** (Qualified, 15%), **A** (Activity, 5%). |
| **Risk Ratings** | Derived from classification: **Low** (C, S), **Medium** (DVF, DF), **High** (Q, A). |
| **VAT Categories** | Business units: DAFF, SAU, VIC Gov, DISR, Growth, P&P, Emerging. Each project and pipeline opportunity belongs to one VAT. |
| **Billing Types** | **Fixed** (Fixed Price), **T&M** (Time & Materials), **LH** (Labour Hire). |
| **Gross Margin (GM)** | The profit after direct costs. Shown as **GM $** (dollar amount = Revenue - Cost) and **GM %** (percentage = GM $ / Revenue). |
| **RAG Indicators** | Red/Amber/Green status dots used throughout to show performance against targets. |
| **Elapsed Months** | How many months of the current FY have passed. Used to prorate annual targets and determine what is "actual" vs "forecast". |

---

## Pages and Business Logic

### 1. Main Dashboard

**Page:** `/` | **Purpose:** High-level overview of the business

#### Where the data comes from

| What you see | Data source (table) | How it is calculated |
|-------------|---------------------|---------------------|
| **Sold (Total Contracted)** | `projects` | Sum of `contractValue` for all projects in the selected FY. |
| **YTD Revenue** | `project_monthly` | Sum of `revenue` for months 1 through the current elapsed month. |
| **Margin %** | `project_monthly` | `(Total Revenue - Total Cost) / Total Revenue` using YTD data. |
| **Utilisation %** | `timesheets` + `employees` | Count of permanent employees who logged time against non-internal active projects, divided by total active permanent staff. |
| **Revenue by Billing Type (pie chart)** | `projects` + `project_monthly` | Groups projects by their `billingCategory` (Fixed, T&M, LH) and sums YTD revenue for each. |
| **Pipeline by Classification (pie chart)** | `pipeline_opportunities` | Groups opportunities by `classification` (C/S/DVF/DF/Q/A) and sums their monthly revenue fields (`revenueM1` to `revenueM12`). |
| **Monthly Trend (area chart)** | `project_monthly` | Plots `revenue` and `cost` for each month (1-12) of the selected FY. |
| **Cumulative YTD vs Target** | `project_monthly` + `reference_data` | Running total of monthly revenue. Target line = annual target divided by 12, multiplied by month number. |
| **Target tracking progress bars** | `reference_data` | Fetches targets from `reference_data` (category `financial_target`). Defaults: $5M revenue, 20% margin, 85% utilisation. |
| **Monthly snapshot table** | `projects` | Top 5 active projects showing `forecastGmPercent` with RAG against margin target. |

**RAG logic for targets:**
- Green: actual >= 100% of target
- Amber: actual >= 80% of target
- Red: actual < 80% of target

---

### 2. Finance Dashboard

**Page:** `/finance` | **Purpose:** Client-by-client financial performance with quarterly breakdown

#### Where the data comes from

| What you see | Data source (table) | How it is calculated |
|-------------|---------------------|---------------------|
| **Client rows** | `projects` + `project_monthly` | Each row represents a project. Revenue, cost, and profit are summed from `project_monthly` records for the selected FY. |
| **Q1-Q4 columns** | `project_monthly` | Q1 = sum of months 1-3, Q2 = months 4-6, Q3 = months 7-9, Q4 = months 10-12. Only includes months up to the current elapsed month. |
| **YTD Revenue** | `project_monthly` | Sum of all `revenue` up to the current elapsed month. |
| **YTD Cost** | `project_monthly` | Sum of all `cost` up to the current elapsed month. |
| **YTD GP (Gross Profit)** | Calculated | `YTD Revenue - YTD Cost`. |
| **GP%** | Calculated | `(YTD GP / YTD Revenue) * 100`. |
| **VAT breakdown** | `projects` | Groups clients by their `vat` field and sums their financials. |
| **Billing type split** | `projects` | Groups by `billingCategory` (Fixed vs T&M). |

**GP% RAG indicators:**
- Green: GP% >= 20%
- Amber: GP% >= 10%
- Red: GP% < 10%

---

### 3. Utilisation Dashboard

**Page:** `/utilization` | **Purpose:** Rolling 13-week forward view of staff utilisation

#### Where the data comes from

| What you see | Data source (table) | How it is calculated |
|-------------|---------------------|---------------------|
| **Employee rows** | `employees` | Only **Permanent** staff are shown (excludes contractors and placeholders). |
| **Historical weeks (actual)** | `timesheets` | Actual hours worked per employee per week. Retrieved via `/api/utilization/weekly?fy=XX-XX` which joins `timesheets` with `employees`. |
| **Projected weeks** | `resource_plans` + `timesheets` | Uses a 3-tier fallback (see below). |
| **Billable ratio** | `timesheets` | `Total Billable Hours / Total Hours Worked` across all permanent staff. |
| **Bench time** | Calculated | `Max(40 - Hours Worked or Projected, 0)` per employee per week. |

**How projections work (3-tier fallback for each future week):**

1. **Actual data first:** If the week already has timesheet entries, those actual hours are used.
2. **Resource plan:** If no actuals exist, the system checks `resource_plans` for an allocation matching the employee and month. Projected hours = `(allocation % / 100) * 40`.
3. **Recent activity pattern:** If no resource plan exists, the system looks at the employee's last 4 weeks of timesheets. It finds active external projects where the employee averaged at least 0.5 hours/week and was seen within the last 2 weeks. It projects those hours forward.
4. **Default:** If none of the above apply, the week is projected at 0% (full bench time).

**Colour coding:**
- Green: 80-100% utilisation
- Amber: 50-79% utilisation
- Red: below 50% or above 100% (over-allocated)
- Projected weeks use the same colours but at 70% opacity

**Standard capacity:** 40 hours per week per employee.

---

### 4. VAT Overview

**Page:** `/vat-overview` | **Purpose:** Cumulative YTD performance vs targets for each VAT business unit

#### Where the data comes from

| What you see | Data source (table) | How it is calculated |
|-------------|---------------------|---------------------|
| **VAT list** | `reference_data` | VATs come from `reference_data` where category = `vat_category`. |
| **Quarterly actuals (Q1-Q3 bars)** | `project_monthly` + `projects` | For each VAT, finds all projects with matching `vat` field. Sums `revenue` and `profit` from `project_monthly` for quarters where months <= elapsed months. |
| **Q4 forecast bar** | `project_monthly` | For future quarters (months > elapsed months), queries the same `project_monthly` table for months 10-12. This data comes from budget/forecast figures uploaded via Excel. Displayed as a lighter, semi-transparent bar with a "Forecast" badge. |
| **Tier target lines (OK/Good/Great/Amazing)** | `vat_targets` | Annual targets stored per VAT, per metric (GM Contribution, Revenue, GM%). Prorated to quarter: `annual target * (quarter number / 4)`. |
| **Tier status badges** | `vat_targets` | Compares YTD actual against prorated annual target: `target * (elapsed months / 12)`. Thresholds: Amazing > Great > Good > OK > Below Target. |
| **What-If Scenario panel** | `pipeline_opportunities` | Filters pipeline by classification (DVF, DF, Q, A) and VAT. Applies user-adjustable win rates to compute weighted pipeline value. Spreads the weighted value across remaining quarters. |
| **YTD summary cards** | Calculated | Total GM = sum of quarterly `gmContribution`. Total Revenue = sum of quarterly `revenue`. Blended GM% = `Total GM / Total Revenue`. |

**What-If calculation:**
- Weighted Revenue = `Opportunity Value * (Win Rate / 100)`
- Weighted GM = `Opportunity Value * (Win Rate / 100) * Margin %`
- Per Quarter = `Weighted Total / Remaining Quarters`

---

### 5. Pipeline

**Page:** `/pipeline` | **Purpose:** Sales pipeline with classification and VAT breakdowns

#### Where the data comes from

| What you see | Data source (table) | How it is calculated |
|-------------|---------------------|---------------------|
| **Opportunity list** | `pipeline_opportunities` | All opportunities for the selected FY. Columns include name, classification, VAT, value, margin %, billing type, and monthly revenue/GP (M1-M12). |
| **Classification summary cards** | `pipeline_opportunities` | Groups by `classification` (C/S/DVF/DF/Q/A). Shows count and total value per classification. |
| **VAT summary table** | `pipeline_opportunities` | Groups by `vat` field. For each VAT: count, raw total value, weighted value, GM $, and average GM%. |
| **Weighted pipeline value** | Calculated | `Raw Value * Win Probability` where win probability comes from classification (C=100%, S=80%, DVF=50%, DF=30%, Q=15%, A=5%). |
| **Weighted GM $** | Calculated | `Raw Value * Margin % * Win Probability`. |
| **Risk status aggregation** | `pipeline_opportunities` | Counts opportunities by RAG status (Good/Fair/Risk). |

---

### 6. What-If Scenarios

**Page:** `/scenarios` | **Purpose:** Model different business outcomes by adjusting win rates

#### Where the data comes from

| What you see | Data source (table) | How it is calculated |
|-------------|---------------------|---------------------|
| **Pipeline opportunities** | `pipeline_opportunities` | Source data. Each opportunity has a classification, value, and margin %. |
| **Classification breakdown** | Calculated | For each classification, sums: Raw Revenue (from monthly fields `revenueM1`-`revenueM12`), Weighted Revenue (`revenue * win rate / 100`), Raw GP, and Weighted GP. |
| **Win rate sliders** | User input | Adjustable 0-100% per classification. Changes recalculate weighted values in real time. |
| **Revenue gap** | Calculated | `Revenue Goal - Total Weighted Revenue`. |
| **Weighted margin** | Calculated | `(Total Weighted GP / Total Weighted Revenue) * 100`. |
| **Saved scenarios** | `scenarios` + `scenario_adjustments` | Saves name, FY, revenue goal, margin goal. Loaded from the database. |

**Presets:**
- **Conservative:** Lower win rates (S=60%, DVF=35%, DF=15%, Q=5%, A=0%)
- **Base:** Standard rates (S=80%, DVF=50%, DF=30%, Q=15%, A=5%)
- **Optimistic:** Higher rates (S=90%, DVF=70%, DF=50%, Q=25%, A=10%)

---

### 7. Projects (Job Status)

**Page:** `/projects` | **Purpose:** Excel-style project list with financial details

#### Where the data comes from

| What you see | Data source (table) | How it is calculated |
|-------------|---------------------|---------------------|
| **Project list** | `projects` | All projects with code, name, client, VAT, billing type, status, A/D status. |
| **Monthly R/C/P breakdown** | `project_monthly` | Revenue, Cost, and Profit for each month (M1-M12) of the selected FY. Expandable per project. |
| **Work Order / Actual / Balance / Forecast** | `projects` | Stored directly on the project record from Excel imports. |
| **Forecast GM%** | `projects` | `forecastGmPercent` field on the project, imported from Excel. |

**Filters available:** VAT category, Billing type, Status, A/D status.

---

### 8. Resources (Staff SOT)

**Page:** `/resources` | **Purpose:** Schedule of Tasks showing employee cost and schedule data

#### Where the data comes from

| What you see | Data source (table) | How it is calculated |
|-------------|---------------------|---------------------|
| **Employee list** | `employees` | All employees with name, cost band, staff type, base cost rate, gross cost rate, payroll tax, schedule dates, team. |
| **Linked user info** | `employees` joined with `users` | Shows linked user role and username if the employee is connected to a system user account. |

---

### 9. Milestones and Invoices

**Page:** `/milestones` | **Purpose:** Track payment invoices and delivery milestones

#### Where the data comes from

| What you see | Data source (table) | How it is calculated |
|-------------|---------------------|---------------------|
| **All milestones** | `milestones` | Combined view of payment invoices and delivery milestones. |
| **Payment invoices** | `milestones` (where `milestoneType` = "Payment Invoice") | Tracks status (Draft/Sent/Paid/Overdue), invoice amount, paid amount. |
| **Delivery milestones** | `milestones` (where `milestoneType` = "Delivery Milestone") | Tracks completion status with optional timesheet integration. |
| **Summary KPIs** | Calculated | Total invoice value, total paid, outstanding amount, and payment completion %. |

---

### 10. VAT Sales Committee Reports

**Page:** `/vat-reports` | **Purpose:** Web-based editable interface replicating PowerPoint VAT SC Reports

#### Where the data comes from

| What you see | Data source (table) | How it is calculated |
|-------------|---------------------|---------------------|
| **Report list** | `vat_reports` | One report per VAT per reporting period. Contains overall RAG status and text summaries for 5 sections (Open Opps, Big Plays, Account Goals, Relationships, Research). |
| **Risks/Issues table** | `vat_risks` | Each risk has description, impact, likelihood, rating, mitigation, status, owner. Linked to a report via `vat_report_id`. |
| **Action items** | `vat_action_items` | Actions by section with description, owner, due date. Linked to a report via `vat_report_id`. |
| **Planner tasks** | `vat_planner_tasks` | Synced from Microsoft Planner. Fields: task name, bucket, assignee, priority, progress, due date, `external_id` (link to Planner). |
| **Change history** | `vat_change_logs` | Every edit is logged with old value, new value, timestamp, and username. |
| **AI suggestions** | `pipeline_opportunities` + OpenAI | AI analyses pipeline data for the specific VAT and generates draft text for each report section. |

**Microsoft Planner Sync:**
- Uses Azure AD client credentials to call Microsoft Graph API
- Fetches tasks from `/planner/plans/{planId}/tasks` and buckets from `/planner/plans/{planId}/buckets`
- Maps Planner priority (1=Urgent, 3=High, 5=Medium, 9=Low) and percentComplete (0%/50%/100%)
- Matches tasks by `external_id` — creates new, updates existing, removes orphaned tasks
- Generates sync insights: "What's New", "What's Changed", "Newly Completed"

**RAG status sections (per report):** Open Opps, Big Plays, Account Goals, Relationships, Research — each has its own Red/Amber/Green selector. Pre-populated from the previous report when creating a new one.

**PPTX import:** Upload a PowerPoint file and the parser (`server/pptx-parser.ts`) extracts slide XML to identify VAT groups, parse status tables, risks, and planner tasks. Preview before importing.

---

### 11. Partner View

**Page:** `/partner-view` | **Purpose:** Pipeline opportunities involving partners and certified staff

#### Where the data comes from

| What you see | Data source (table) | How it is calculated |
|-------------|---------------------|---------------------|
| **Partner directory** | `pipeline_opportunities` | Extracts unique partner names from the `partner` field (split by `;`, `,`, `#`). |
| **Opportunity count & pipeline value per partner** | `pipeline_opportunities` | Counts opportunities and sums `value` for each partner. If an opportunity has multiple partners, the value is split equally. |
| **Certified staff count** | `employees` | Counts active permanent/contractor employees whose `certifications` field matches partner keywords. |
| **Certification matching** | `employees` (certifications field) | Semicolon-separated certification names checked against keyword mapping (case-insensitive). |
| **Partner-Certified Staff Overview table** | `employees` | Lists all active employees with partner-relevant certifications, colour-coded by partner. |

**Certification keyword mapping:**

| Partner | Keywords matched in employee certifications |
|---------|----------------------------------------------|
| ServiceNow | `servicenow` |
| Microsoft | `azure`, `power bi`, `microsoft` |
| AWS | `aws`, `amazon` |
| Tech One | `tech one`, `techone` |
| Salesforce | `salesforce` |

---

### 12. Feature Requests

**Page:** `/feature-requests` | **Purpose:** Employee-facing submission form for enhancement requests

#### Where the data comes from

| What you see | Data source (table) | How it is calculated |
|-------------|---------------------|---------------------|
| **Request list** | `feature_requests` | All submitted requests with title, description, category, priority, area, status. |
| **Status workflow** | `feature_requests` | Submitted -> Under Review -> In Progress -> Deployed. |
| **GitHub branch creation** | GitHub API | Admin clicks "Start Work" which creates a branch named `feature/fr-{id}-{slug}` via the GitHub API. |

---

### 13. AI Insights

**Page:** `/ai-insights` | **Purpose:** AI-powered analysis using OpenAI GPT-4o-mini

#### Where the data comes from

| Insight Type | Data fed to AI | Source table |
|-------------|---------------|-------------|
| **Risk Register** | Project statuses, margins, milestones | `projects`, `milestones` |
| **Pipeline Risks** | Pipeline classifications, values, margins | `pipeline_opportunities` |
| **Project Risks** | Active project financials, burn rates | `projects`, `project_monthly` |
| **Spending Patterns** | Monthly revenue/cost trends | `project_monthly` |
| **Financial Advice** | YTD financials, targets, pipeline | `project_monthly`, `reference_data`, `pipeline_opportunities` |
| **Spending Forecast** | Historical spending patterns | `project_monthly`, `costs` |

Responses are streamed via SSE (Server-Sent Events) for real-time display.

---

### 14. Data Upload (Excel Import)

**Page:** `/upload` | **Purpose:** Bulk import from multi-sheet Excel workbooks

#### What each sheet does

| Sheet Name | Target Table | What it imports | Cross-referencing |
|-----------|-------------|----------------|-------------------|
| **Job Status** | `projects` + `project_monthly` | Project details (code, client, manager) and monthly Revenue/Cost/Profit (M1-M12). | Matches by project code or name. Creates new if not found. |
| **Staff SOT** | `employees` | Employee name, cost band, staff type, base/gross cost rates, payroll tax, schedule dates. | Matches by first name + last name. Auto-generates employee code if new. |
| **Pipeline Revenue** | `pipeline_opportunities` | Opportunity name, classification, VAT, 12-month revenue forecast. | Matches by opportunity name. |
| **Gross Profit** | `pipeline_opportunities` | Same opportunities but with 12-month GP forecast columns. | Updates existing records matched by name. |
| **Personal Hours** | `timesheets` + `employees` + `projects` | Hours worked, cost/sale value per employee per project per week. | Matches employee by name, project by name/code. Auto-creates both if not found. Internal projects detected by "Reason" prefix. |
| **Project Hours** | `kpis` + `projects` | Project KPIs: revenue, gross cost, margin, utilisation. | Matches project by name. Auto-creates if not found. |
| **CX Master List** | `cx_ratings` | Engagement name, CX rating, rationale, client/delivery manager. | Fuzzy matches project by name, then base code, then substring. Matches employee by full name or last name. |
| **Resource Cost** | `resource_costs` | Employee name, staff type, monthly costs for a specific FY. | Matches employee by name. |
| **Open Opportunities** | `pipeline_opportunities` | Strategic pipeline: value, margin %, dates, leads (CAS/CSD), status. | Deletes existing "open_opps" records for the FY before importing. |

**PPTX Import** (separate): Upload PowerPoint VAT SC Reports. Parser extracts slide XML to create `vat_reports`, `vat_risks`, and `vat_planner_tasks` records.

---

### 15. Administration

**Page:** `/admin` | **Purpose:** System configuration (admin role only)

#### What it manages

| Section | Data source (table) | What it does |
|---------|---------------------|-------------|
| **Reference Data** | `reference_data` | Manage VAT categories, company goals, billing types, and FY periods. Full CRUD. |
| **User Management** | `users` | View and manage user accounts, assign roles. |
| **Permissions Matrix** | `role_permissions` | Toggle permissions per role for each resource/action combination. |
| **VAT Financial Targets** | `vat_targets` | Set OK/Good/Great/Amazing tier targets per VAT per FY for GM Contribution, Revenue, and GM%. |

---

## Authentication and Access Control

### Authentication Methods
1. **Username/Password:** Session-based login with bcryptjs password hashing. Sessions stored in PostgreSQL via `connect-pg-simple`.
2. **Azure AD SSO:** Integration with Azure Active Directory for single sign-on. Auto-provisions user accounts on first SSO login.
3. **JWT Token Handoff:** For iframe embedding. A Launchpad app issues a JWT containing the user's identity, which FinanceHub validates and creates a session from. Requires matching `SSO_HANDOFF_SECRET` on both apps.

### RBAC (Role-Based Access Control)

**5 Roles:**

| Role | Description |
|------|-------------|
| **Admin** | Full access to everything. Bypasses all permission checks. |
| **Executive** | Broad viewing rights across all dashboards and finance. Can manage scenarios and feature requests. |
| **VAT Lead** | Focused on VAT reporting with full CRUD on VAT reports. Can edit projects and milestones. |
| **Operations** | Administrative focus with create/edit/delete rights across projects, resources, rate cards, data sources. |
| **Employee** | Most restricted. Can view dashboards and projects, create feature requests. |

**How it works:**
- **Server-side:** Every API route uses `requirePermission(resource, action)` middleware. It checks the user's role against the `role_permissions` table. Admin role bypasses all checks.
- **Client-side:** The `can(resource, action)` function from the `useAuth` hook controls what UI elements are shown. Sidebar items, action buttons (Add, Edit, Delete), and entire pages are hidden if the user lacks permission.
- **Permissions storage:** The `role_permissions` table stores `(role, resource, action, allowed)` tuples with a unique constraint. Admins can edit the permissions matrix from the Administration page.

---

## Database Tables

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | User accounts | `username` (unique), `password` (hashed), `role`, `email`, `displayName` |
| `employees` | Staff records | `employeeCode` (unique), `firstName`, `lastName`, `costBand`, `staffType`, `baseCostRate`, `grossCostRate`, `certifications`, `user_id` (FK to users) |
| `projects` | Project records | `projectCode` (unique), `name`, `client`, `vat`, `billingCategory`, `status`, `contractValue`, `forecastGmPercent` |
| `project_monthly` | Monthly revenue/cost/profit per project | `projectId` (FK), `fyYear`, `month` (1-12), `revenue`, `cost`, `profit` |
| `pipeline_opportunities` | Sales pipeline | `name`, `classification`, `vat`, `value`, `marginPercent`, `partner`, `revenueM1`-`revenueM12`, `grossProfitM1`-`grossProfitM12` |
| `milestones` | Project milestones | `projectId` (FK), `name`, `milestoneType`, `invoiceStatus`, `amount`, `paidAmount` |
| `scenarios` | What-if scenarios | `name`, `fyYear`, `revenueGoal`, `marginGoalPercent` |
| `scenario_adjustments` | Per-scenario adjustments | `scenarioId` (FK), `opportunityId` (FK), `adjustmentType`, `winProbability` |
| `reference_data` | Admin-managed lookups | `category`, `key`, `value`, `displayOrder`, `active` |

### Supporting Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `rate_cards` | Role-based billing rates | `role`, `baseRate`, `chargeRate`, `effectiveFrom` |
| `resource_plans` | Monthly allocation % | `projectId` (FK), `employeeId` (FK), `month`, `allocationPercent` |
| `timesheets` | Time entries | `employeeId` (FK), `projectId` (FK), `weekEnding`, `hoursWorked`, `billable`, `source` |
| `costs` | Cost entries | `projectId` (FK), `category`, `amount`, `month` |
| `kpis` | Performance indicators | `projectId` (FK), `month`, various KPI fields |
| `forecasts` | Revenue/cost forecasts | `projectId` (FK), `month`, `revenue`, `cost`, `margin` |
| `cx_ratings` | Customer experience | `projectId` (FK), `employeeId` (FK), `engagementName`, `cxRating`, `rationale` |
| `resource_costs` | Staff cost tracking | `employeeId` (FK), `employeeName`, monthly cost fields |
| `data_sources` | External system config | `name`, `type`, `lastSyncAt`, `status` |
| `feature_requests` | Enhancement requests | `title`, `description`, `category`, `priority`, `status`, `githubBranch` |

### VAT Reports Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `vat_reports` | Report metadata + text | `vatName`, `reportDate`, `overallStatus`, section RAG statuses, section text summaries |
| `vat_risks` | Risks per report | `vatReportId` (FK), `description`, `impact`, `likelihood`, `riskRating`, `mitigation`, `status` |
| `vat_action_items` | Actions per report | `vatReportId` (FK), `section`, `description`, `owner`, `dueDate` |
| `vat_planner_tasks` | Planner-synced tasks | `vatReportId` (FK), `taskName`, `bucketName`, `assignee`, `priority`, `progress`, `externalId` |
| `vat_change_logs` | Audit trail | `vatReportId` (FK), `fieldName`, `oldValue`, `newValue`, `changedBy`, `changedAt` |
| `vat_targets` | Per-VAT tier targets | `vatName`, `fyYear`, `metric`, `targetOk`, `targetGood`, `targetGreat`, `targetAmazing` |

### System Tables

| Table | Purpose |
|-------|---------|
| `role_permissions` | RBAC permissions: `role`, `resource`, `action`, `allowed` (unique constraint on role+resource+action) |
| `session` | PostgreSQL session store for express-session |
| `conversations` + `messages` | AI chat conversation history |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Login with username/password |
| POST | `/api/register` | Register new user |
| POST | `/api/logout` | Destroy session |
| GET | `/api/user` | Get current authenticated user |
| GET | `/api/permissions` | Get permissions for current user's role |

### Employees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List all employees |
| GET | `/api/employees/:id` | Get single employee |
| POST | `/api/employees` | Create employee |
| PATCH | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee |
| PATCH | `/api/employees/:id/link-user` | Link employee to user account |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| GET | `/api/projects/:id` | Get single project |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/:id/summary` | Aggregated project summary |

### Financial Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/project-monthly` | Monthly R/C/P data (supports `?projectId=`) |
| GET | `/api/pipeline-opportunities` | Pipeline data (supports `?classification=`, `?vat=`) |
| POST | `/api/pipeline-opportunities` | Create opportunity |
| DELETE | `/api/pipeline-opportunities/:id` | Delete opportunity |
| GET | `/api/rate-cards` | Billing rate cards |
| GET | `/api/costs` | Cost entries |
| GET | `/api/forecasts` | Forecast data |
| GET | `/api/milestones` | Milestones (supports `?milestoneType=`, `?invoiceStatus=`) |
| GET | `/api/kpis` | KPI metrics |

### Utilisation and Timesheets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/timesheets` | Timesheet entries (supports `?fy=`) |
| GET | `/api/timesheets/available-fys` | List of FYs with timesheet data |
| GET | `/api/utilization/weekly` | Weekly utilisation data (supports `?fy=`) |
| GET | `/api/resource-plans` | Resource allocation plans |
| GET | `/api/resource-allocations` | Detailed allocation data |

### VAT Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vat-reports` | List all reports |
| GET | `/api/vat-reports/latest` | Latest report per VAT |
| POST | `/api/vat-reports` | Create report |
| PATCH | `/api/vat-reports/:id` | Update report (with change logging) |
| DELETE | `/api/vat-reports/:id` | Delete report |
| GET | `/api/vat-reports/:id/full` | Full report with risks, actions, tasks |
| POST | `/api/vat-reports/:reportId/planner/sync` | Sync with Microsoft Planner |
| POST | `/api/vat-reports/ai-suggest-fields` | AI draft generation |
| POST | `/api/vat-reports/ai-chat` | AI chat assistant |

### VAT Overview and Targets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vat-overview?fy=&elapsedMonths=` | Quarterly actuals + forecast per VAT |
| GET | `/api/vat-targets?fyYear=` | Targets by FY |
| POST | `/api/vat-targets` | Create/update target |
| DELETE | `/api/vat-targets/:id` | Delete target |

### Dashboard and AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Overall KPI summary |
| GET | `/api/financial-targets/:fy` | Revenue/margin/utilisation targets |
| POST | `/api/ai/insights` | AI analysis (SSE streaming) |

### Data Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Excel file upload and import |
| POST | `/api/upload/vat-pptx/preview` | Preview PPTX import |
| POST | `/api/upload/vat-pptx/import` | Execute PPTX import |

### Feature Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/feature-requests` | List all requests |
| POST | `/api/feature-requests` | Submit new request |
| PATCH | `/api/feature-requests/:id` | Update request |
| POST | `/api/feature-requests/:id/create-branch` | Create GitHub branch |

### Administration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reference-data` | List reference data (supports `?category=`) |
| POST | `/api/reference-data` | Create reference data |
| PATCH | `/api/reference-data/:id` | Update reference data |
| DELETE | `/api/reference-data/:id` | Delete reference data |
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/:id/role` | Change user role |
| GET | `/api/permissions/all` | Get all role permissions |
| POST | `/api/permissions` | Update permission |

---

## Frontend Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | KPIs, charts, target tracking, monthly snapshot |
| `/finance` | Finance Dashboard | Client summary, quarterly breakdown, VAT/billing splits |
| `/utilization` | Utilisation Dashboard | Rolling 13-week view, bench time, capacity |
| `/projects` | Job Status | Project list with monthly financial details |
| `/projects/:id` | Project Detail | Individual project deep dive |
| `/resources` | Staff SOT | Employee schedule and cost data |
| `/rate-cards` | Rate Cards | Billing rate management |
| `/resource-plans` | Resource Plans | Monthly allocation management |
| `/timesheets` | Timesheets | Time entry tracking |
| `/costs` | Costs | Cost management |
| `/milestones` | Milestones & Invoices | Payment and delivery milestone tracking |
| `/forecasts` | Forecasts & Variance | Forecast list and variance analysis |
| `/pipeline` | Pipeline | VAT summary, risk status, classification cards |
| `/scenarios` | What-If Scenarios | Win rate modelling with presets |
| `/vat-reports` | VAT SC Reports | Editable VAT committee reports with Planner sync |
| `/vat-overview` | VAT Overview | Cumulative YTD vs targets with Q4 forecast |
| `/partner-view` | Partner View | Partner pipeline and certified staff |
| `/ai-insights` | AI Insights | AI-powered analysis (6 types) |
| `/data-sources` | Data Sources | External system monitoring |
| `/upload` | Data Upload | Excel and PPTX import |
| `/feature-requests` | Feature Requests | Enhancement request tracking |
| `/admin` | Administration | Reference data, users, permissions, VAT targets |

---

## External Integrations

| System | Purpose | How |
|--------|---------|-----|
| **Azure Active Directory** | SSO authentication | OAuth2/OIDC via MSAL. Auto-provisions user accounts. |
| **Microsoft Planner** | Task sync for VAT reports | Graph API client credentials flow. Syncs tasks by external ID. |
| **GitHub** | Feature branch creation | Creates `feature/fr-{id}-{slug}` branches via GitHub API. Codebase sync via `scripts/sync-to-github.ts`. |
| **OpenAI** | AI insights and report drafting | GPT-4o-mini via Replit AI Integrations. SSE streaming responses. |
| **SharePoint** | Data synchronisation | Hourly sync of project/pipeline data. |
| **Employment Hero** | Staff data sync | Daily API sync. |
| **iTimesheets** | Timesheet data sync | Daily API sync. |

---

## Test Coverage

- **690 tests** across 7 test files using Vitest with V8 coverage provider
- Run: `npx vitest run` (tests only) or `npx vitest run --coverage` (with LCOV report)
- Coverage areas: data transformation, date validation, Excel import helpers, AI prompt builders, Excel record builders, lookup map builders, Planner sync helpers, PPTX parser, SharePoint sync, financial analytics, utility helpers

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
The application starts on port 5000, serving both the Express API and the Vite frontend.

### Default Credentials
- **Admin:** username `admin`, password `admin123`

### Seed Demo Data
```bash
npx tsx scripts/seed-data.ts
```
Seeds: 20 employees (with certifications), 13 projects, 1360 timesheets, 8 pipeline opportunities (with partners), 14 milestones, costs, CX ratings, rate cards, resource costs, and resource plans.

### Database
On first startup, the application automatically:
1. Creates all required tables via incremental migrations in `server/db.ts`
2. Seeds the admin user and default role permissions

### GitHub Sync
```bash
npx tsx scripts/sync-to-github.ts "description" "commit message"
```

---

## Deployment

- **Target:** Azure with Azure SQL Database (MSSQL)
- **Build:** `npm run build` produces `dist/index.cjs` (server) and `dist/public/` (frontend)
- **Run:** `node ./dist/index.cjs`
- **Config:** Autoscale deployment via Replit, with build step `npm run build`
- **Database:** Knex.js configured for dual support: PostgreSQL (dev) and MSSQL (production)
- **Sessions:** Secure cookie configuration for production environments
- **Environment Variables:** `DATABASE_URL`, `SESSION_SECRET`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `GITHUB_PAT`, `SSO_HANDOFF_SECRET`

---

## License

Private - All rights reserved.
