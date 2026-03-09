# FinanceHub — Data Rules

This document captures all business rules, data derivation logic, import mappings, matching algorithms, and configuration rules implemented across the application.

---

## 1. Global Rules

### 1.1 Australian Financial Year (FY)
- FY runs **July 1 to June 30** (e.g., FY 25-26 = 1 Jul 2025 – 30 Jun 2026).
- FY naming format: `"YY-YY"` (e.g., `"25-26"`).
- FY Month mapping: **1 = Jul, 2 = Aug, 3 = Sep, 4 = Oct, 5 = Nov, 6 = Dec, 7 = Jan, 8 = Feb, 9 = Mar, 10 = Apr, 11 = May, 12 = Jun**.
- FY month conversion from calendar month (0-indexed):
  - If `calMonth >= 6` (Jul–Dec): `fyMonth = calMonth - 6 + 1`
  - If `calMonth < 6` (Jan–Jun): `fyMonth = calMonth + 6 + 1`
- FY start year: If the calendar month is July or later, the FY start year is the current calendar year; otherwise it is the previous year.

### 1.2 Day-Level YTD Pro-Rating
All YTD calculations use day-level precision via `getElapsedFyInfo()`:
- **Completed months**: Counted in full (factor = 1.0).
- **Current (partial) month**: Scaled by `dayOfMonth / daysInMonth` (e.g., March 5 → 5/31 ≈ 0.1613).
- **Past FYs**: All 12 months count fully.
- **Future FYs**: Zero months counted.
- Applied on: Dashboard, Finance, Scenarios, VAT Overview pages.

### 1.3 FY Project Filtering
A project is considered part of an FY if it has at least one `project_monthly` record with `fy_year = 'XX-XX'`. The set of "FY projects" is derived from this, not from the project's own start/end dates.

### 1.4 VAT Canonical Values
The six canonical VAT (Value-Added Team) categories are:
- `DAFF`
- `DISR`
- `Emerging`
- `GROWTH`
- `SAU`
- `Vic Gov`

VAT normalisation logic (in `server/sharepoint-sync.ts`):
- Strips SharePoint separators (`;#`), removes anything after a pipe (`|`), trims whitespace.
- Case-insensitive lookup against a canonical map:
  - `daff` → **DAFF**
  - `disr` → **DISR**
  - `emerging` → **Emerging**
  - `growth` → **GROWTH**
  - `sau` → **SAU**
  - `vic gov`, `vicgov`, `vic-gov`, `victoria`, `victorian gov` → **Vic Gov**
- Partial matching is attempted if exact lookup fails.

### 1.5 Billing / Contract Type Normalisation
Billing categories are normalised to four canonical types:
| Input Values (case-insensitive) | Canonical Value |
|---|---|
| `fixed`, `fixed price`, `fixedprice`, `fp` | `fixed_price` |
| `t&m`, `tm`, `time & materials`, `time and materials` | `time_materials` |
| `labour hire`, `labourhire`, `labor hire`, `lh` | `labour_hire` |
| `retainer` | `retainer` |

Display labels: Fixed Price → "Fixed", Time & Materials → "T&M", Labour Hire → "LH".

### 1.6 MSSQL / PostgreSQL Dual Database Support
- Production uses **Azure SQL (MSSQL)**; development uses **PostgreSQL**.
- The `isMSSQL` flag in `server/db.ts` is set by `process.env.DB_CLIENT === "mssql"`.
- **Date handling**: MSSQL requires native `Date` objects, not ISO 8601 strings. All insert/update operations must call `sanitizeDateFields()` to convert string dates to `Date` objects before writing.
- **Batch size**: MSSQL uses batches of 150 rows; PostgreSQL uses 500.
- **SQL expression differences**: Month extraction, string concatenation, and boolean handling differ between engines and use conditional expressions keyed on `isMSSQL`.

---

## 2. Authentication & Authorisation (RBAC)

### 2.1 Session-Based Authentication
- Uses `express-session` with `connect-pg-simple` for session storage.
- Passwords hashed with `bcryptjs`.
- Azure AD SSO integration via JWT token handoff from the Launchpad app.

### 2.2 Role-Based Access Control
Five roles with fine-grained permissions:
| Role | Description |
|---|---|
| **Admin** | Full access to all resources and actions (bypasses permission checks) |
| **Executive** | Read access to all data, limited write access |
| **VAT Lead** | Full access to their VAT's reports, read access to dashboards |
| **Operations** | Manage resources, timesheets, and operational data |
| **Employee** | Submit feature requests, view assigned projects |

Permission enforcement:
- Server-side: `requirePermission(resource, action)` middleware checks `permissions` table.
- Admins bypass all permission checks.
- Client-side: `useAuth` hook provides role information for conditional UI rendering.

---

## 3. Dashboard Rules (`/`)

### 3.1 Data Sources
| API Endpoint | DB Table(s) |
|---|---|
| `/api/projects` | `projects` |
| `/api/project-monthly` | `project_monthly` |
| `/api/pipeline-opportunities` | `pipeline_opportunities` |
| `/api/dashboard/utilization` | `employees`, `timesheets`, `projects` |
| `/api/financial-targets/:fy` | `reference_data` |

### 3.2 Sold (Contracted)
- **Formula**: `SUM(projects.contract_value)` for all FY projects.
- **Scope**: Only projects that have `project_monthly` rows in the selected FY.
- Head contracts (umbrella contracts without their own monthly revenue) are excluded because they have no `project_monthly` rows. Their revenue is tracked via sub-projects.

### 3.3 Revenue Target
- **Source**: `reference_data` where `category = 'financial_targets'`.
- **Fallback**: $5,000,000 if no target is set for the selected FY.
- **YTD Target**: `Revenue Target × (completedMonths + dayFraction) / 12`.

### 3.4 YTD Revenue
- **Formula**: `SUM(project_monthly.revenue)` for months 1 through `currentFyMonth`.
- **Pro-rating**: Current month's revenue multiplied by `dayOfMonth / daysInMonth`.

### 3.5 YTD Costs
- Same formula as YTD Revenue but using `project_monthly.cost`.

### 3.6 Margin %
- **Formula**: `(YTD Revenue − YTD Costs) / YTD Revenue`.
- Returns 0 if YTD Revenue = 0.

### 3.7 Utilisation
- **Total Permanent**: Count of `employees` where `staff_type = 'Permanent'` and `status ≠ 'inactive'`.
- **Allocated Permanent**: Count of distinct `employee_id` in `timesheets` for the FY where employee is Permanent and project client is NOT `'Internal'` or `'RGT'`.
- **Formula**: `Allocated Permanent / Total Permanent`.

### 3.8 Default Financial Targets
| Metric | Default Value |
|---|---|
| Revenue Target | $5,000,000 |
| Margin Target | 20% (0.20) |
| Utilisation Target | 85% (0.85) |

### 3.9 RAG (Red-Amber-Green) Status
Applied to all four dashboard KPI cards:
- **Green (On Track)**: `actual >= target`
- **Amber (Warning)**: `actual >= target × 0.8`
- **Red (Off Track)**: `actual < target × 0.8`

The warning threshold (0.8 = 80%) is the default and is configurable per metric.

RAG presentation:
- **Card background**: Green/Amber/Red tint with matching border.
- **RAG dot**: Coloured circle indicator (green/amber/red).
- **Text colour**: Metric value text uses matching RAG colour.

### 3.10 Billing Breakdown (Pie Chart)
- Groups by `projects.billing_category` (Fixed, T&M, Other).
- Revenue/Cost per group: `SUM(project_monthly.revenue/cost)` for YTD months, pro-rated for current month.

### 3.11 Pipeline Classification (Pie Chart)
- Groups by `pipeline_opportunities.classification`.
- Revenue per opportunity: `SUM(revenue_m1 through revenue_m12)`. Falls back to `value` if all monthly fields are 0.
- Labels: C = Contracted, S = Selected, DVF = Shortlisted, DF = Submitted, Q = Qualified, A = Activity.

### 3.12 Monthly Trend (Area Chart)
- Per month: `SUM(revenue)`, `SUM(cost)`, `Profit = Revenue − Cost`.
- Shows all 12 months (not just YTD), no pro-rating.

### 3.13 Cumulative YTD vs Target (Composed Chart)
- Running sum of monthly revenue through `currentFyMonth`.
- Current month pro-rated by day-fraction.
- Target line: `Revenue Target / 12` added per month (linear).
- Future months not plotted (null values).

---

## 4. Finance Rules (`/finance`)

### 4.1 Per-Project Quarterly Revenue
- **Q1** (Jul–Sep): `SUM(revenue × dayFactor)` for months 1–3
- **Q2** (Oct–Dec): `SUM(revenue × dayFactor)` for months 4–6
- **Q3** (Jan–Mar): `SUM(revenue × dayFactor)` for months 7–9
- **Q4** (Apr–Jun): `SUM(revenue × dayFactor)` for months 10–12
- Quarters capped at `elapsedMonths`; future months excluded.
- `dayFactor`: 1.0 for completed months, `dayOfMonth/daysInMonth` for current month.

### 4.2 Finance Summary Cards
- **Total Revenue**: `SUM(all project YTD Revenue)`
- **Total Cost**: `SUM(all project YTD Cost)`
- **Gross Profit**: `Total Revenue − Total Cost`
- **GP Margin %**: `(Gross Profit / Total Revenue) × 100`

### 4.3 Finance RAG Coloring
- **GP%**: Green (≥20%), Amber (≥10%), Red (<10%)
- **GP Margin %**: Green (≥40%), Amber (≥20%), Red (<20%)

### 4.4 Sorting
- Primary: Status order (active = 0, other = 1, completed = 2)
- Secondary: Alphabetical by client name

---

## 5. What-If Scenarios Rules (`/scenarios`)

### 5.1 Pipeline Classifications & Win Probabilities
| Classification | Label | Default Win Rate |
|---|---|---|
| C | Contracted/Committed | 100% |
| S | Selected | 80% |
| DVF | Shortlisted | 50% |
| DF | Submitted | 30% |
| Q | Qualified | 15% |
| A | Activity | 5% |

Win rates are adjustable per classification via sliders. Presets: Conservative, Base Case, Optimistic.

### 5.2 SharePoint Phase → Classification Mapping
| SharePoint Phase Value | Classification Code |
|---|---|
| `1.A - Activity` | A |
| `2.Q - Qualified` | Q |
| `3.DF - Submitted` | DF |
| `4.DVF - Shortlisted` | DVF |
| `5.S - Selected` | S |

### 5.3 Pipeline FY Proration
For each pipeline opportunity:
1. If monthly revenue data exists (`revenue_m1`…`revenue_m12`), sum those values.
2. Otherwise, calculate overlap between opportunity dates and the selected FY:
   - `FY Revenue = Total Value × (months overlapping FY / total project months)`
   - If no end date, assumes 12-month duration from start date.

### 5.4 Pipeline Weighted Revenue (Remaining Months)
- For months `elapsedMonths + 1` through 12:
  `SUM(pipeline opportunity FY monthly revenue × Win Rate %)`
- Only selected classifications contribute (user can toggle each on/off).

### 5.5 GP Fallback
If a pipeline opportunity lacks specific GP data, the system uses the **YTD Actual Margin %** from project actuals as a fallback estimate for that opportunity's GP contribution.

### 5.6 Summary Cards
- **Projected Total**: `YTD Actual Revenue + Pipeline Weighted Revenue`
- **Revenue Gap**: `Revenue Goal − Projected Total`
- **Projected GP**: `YTD GP + Pipeline Weighted GP`
- **Margin Status**: `(Projected GP / Projected Total) × 100`

### 5.7 Monthly Projection Table
- Months 1 to `elapsedMonths`: Show **actuals** (from `project_monthly`, blue-tinted).
- Months `elapsedMonths + 1` to 12: Show **weighted pipeline forecast**.
- Combined row: Actual + Pipeline per month.
- Cumulative row: Running total across all months.

---

## 6. VAT Overview Rules (`/vat-overview`)

### 6.1 Per-VAT Revenue & GM
- Server-side query: Get all project IDs where `projects.vat` matches the VAT name.
- Sum `project_monthly.revenue` and `project_monthly.profit` grouped by quarterly month buckets:
  - Q1: months 1–3 (Jul–Sep)
  - Q2: months 4–6 (Oct–Dec)
  - Q3: months 7–9 (Jan–Mar)
  - Q4: months 10–12 (Apr–Jun)
- Months ≤ `elapsedMonths` → Actuals; months > `elapsedMonths` → Forecast.

### 6.2 YTD Metrics per VAT
- **YTD Revenue**: `SUM(project_monthly.revenue)` for months ≤ `elapsedMonths`
- **YTD GM Contribution**: `SUM(project_monthly.profit)` for same scope
- **YTD GM %**: `GM Contribution / Revenue` (0 if revenue is 0)

### 6.3 Target Pro-Rating & Tiers
- **Source**: `vat_targets` table stores annual tier targets per VAT per FY.
- **Tiers**: OK, Good, Great, Amazing.
- **Prorate ratio**: `(completedMonths + dayFraction) / 12`.
- **Prorated target**: `Annual Target × Prorate Ratio`.
- **Tier status badges** (compared against prorated targets):
  - YTD ≥ Amazing prorated → **"Amazing"** (purple)
  - YTD ≥ Great prorated → **"Great"** (green)
  - YTD ≥ Good prorated → **"Good"** (blue)
  - YTD ≥ OK prorated → **"OK"** (amber)
  - Otherwise → **"Below Target"** (red)

### 6.4 Pipeline What-If (Client-Side, Not Persisted)
- **Weighted Value**: `Opportunity Value × (Win Rate / 100)`
- **Projected GM**: `Weighted Value × Margin %` (default 30% if null)
- **Spread**: Divided evenly across remaining quarters in the FY.

### 6.5 Chart
- **Bars**: Quarterly cumulative actuals (solid) and forecasts (faded).
- **Dashed Lines**: Cumulative tier targets (Q1 = Annual/4, Q2 = Annual/2, etc.).
- **What-If overlay** (orange): Pipeline weighted value spread across remaining quarters.

---

## 7. Utilisation Rules (`/utilization`)

### 7.1 Standard Capacity
- Fixed at **40 hours per week**.

### 7.2 Utilisation %
- **Actual**: `(total_hours / 40) × 100`
- **Projected via Resource Plan**: Uses `allocation_percent` directly.
- **Projected via Recent Average**: If no resource plan exists, uses last 4 weeks of active project work as basis.

### 7.3 Utilisation Projection Priority (per employee)
1. **Actual timesheet data** — if timesheets exist for the week, use them.
2. **Resource plans** — if the employee has any resource plans, use `allocation_percent`. Months without plans show 0%.
3. **Timesheet extrapolation fallback** — only for employees with zero resource plans: uses average from active non-closed projects.
4. **Bench** — if none of the above apply, employee is projected as 0% utilised.

### 7.4 Billable vs Non-Billable
- **Billable Hours**: `SUM(hours_worked)` where `billable = true`.
- **Non-Billable Hours**: `SUM(hours_worked)` where `billable = false`.
- **Billable Ratio**: `billable_hours / total_hours`.
- **Default projection ratio**: 80% if no recent history.

### 7.5 Bench
- **Bench Hours per week**: `MAX(40 − total_hours, 0)`
- **Bench %**: `(total_bench_hours / total_capacity_hours) × 100`

### 7.6 Utilisation RAG Coloring
| Range | Colour |
|---|---|
| > 100% | Red (overutilised) |
| 80%–100% | Green |
| 50%–79% | Amber |
| < 50% | Red (underutilised) |

Bench RAG:
| Range | Colour |
|---|---|
| ≤ 15% | Green |
| 16%–30% | Amber |
| > 30% | Red |

---

## 8. Job Plans Rules (`/job-plans`)

### 8.1 Weekly Allocation Grid
- Per-project weekly allocation editor.
- Resource plans store `weekly_allocations` as JSON: `{"2025-02-03": 100, "2025-02-10": 50, ...}` with Monday-keyed weeks.
- Paint-to-allocate UI: click cycles **0% → 20% → 50% → 80% → 100% → 0%**; drag to paint across cells.
- Auto-saves and recalculates `plannedHours` / `plannedDays` from weekly totals.
- FY selector, week range options: 13, 26, or 52 weeks (default 52).
- Add/remove employee assignments per project.

### 8.2 Resource Plan Rate Fields
Each resource plan stores per-person per-project rates:
- `charge_out_rate`
- `discount_percent`
- `discounted_hourly_rate`
- `discounted_daily_rate`
- `hourly_gross_cost`

These are imported from job plan Excel files.

### 8.3 Contract Value Calculation
After SharePoint sync or import: `contract_value = SUM(discounted_hourly_rate × planned_hours)` across all resource plans for a project.

---

## 9. Resource Allocation Rules (`/resource-allocation`)

### 9.1 Cross-Project Aggregation
- Shows total weekly allocation per employee across **all** projects.
- Highlights over-allocation (> 100%) in red.
- Drill-down expands to show per-project contribution per week.

### 9.2 Allocation Colour Coding
| Allocation | Colour |
|---|---|
| 80%–100% | Green |
| 50%–79% | Amber |
| < 50% | Red |
| > 100% | Red (over-allocation) |

---

## 10. Data Import Rules

### 10.1 Staff SOT Import (`POST /api/import/staff-sot`)
- **Sheet**: "Staff SOT" or the first sheet.
- **Column mappings** (index-based):
  | Index | Field | Notes |
  |---|---|---|
  | 0 | Name | Split into first_name / last_name |
  | 1 | Cost Band Level | |
  | 2 | Staff Type | e.g., Permanent, Contractor |
  | 3 | Payroll Tax | "yes" → boolean true |
  | 4 | Base Cost | $/day |
  | 5 | Active Status | "active" or "inactive" |
  | 7 | JID (Job ID) | Used as employee code |
  | 8 | Schedule Start | Date |
  | 9 | Schedule End | Date |
  | 10 | Team | |
  | 12 | Location | |
- **Matching**: Upserts by employee code (JID) or name match.

### 10.2 Timesheets CSV Import (`POST /api/import/timesheets-csv`)
- **Column mappings** (index-based):
  | Index | Field |
  |---|---|
  | 0 | Date |
  | 1 | Hours Worked |
  | 2 | Sale Value |
  | 3 | Cost Value |
  | 5 | Task Description |
  | 9 | Project Description |
  | 10 | First Name |
  | 11 | Last Name |
  | 12 | Employee Code (optional fallback) |
- **Employee matching**: By `firstName + lastName` (case-insensitive), then by `employeeCode`.
- **Project matching**: By project code extracted from description, then by full project name. Auto-creates employees/projects if not found.
- **Project code extraction regex**: `^([A-Z]{2,6}\d{2,4}(?:-\d{1,3})?)` — extracts codes like "AGD001" from "AGD001 Case Management System".
- **Timesheet week ending**: Normalised to the following Sunday.

### 10.3 Project Status Excel Import (`POST /api/import/project-status`)
- **Header detection**: Case-insensitive header name matching on the first non-empty row.
- **Column mappings**:
  | Header Names | DB Field |
  |---|---|
  | `vpn`, `project code`, `projectcode`, `code` | `project_code` |
  | `a/d`, `ad`, `ad status`, `adstatus` | `ad_status` |
  | `vat` | `vat` |
  | `client` | `client` |
  | `project`, `project name` | `name` |
  | `client manager` | `client_manager` |
  | `engagement manager` | `engagement_manager` |
  | `start date` | `start_date` |
  | `end date` | `end_date` |
  | `billing category` | `billing_category` |
  | `work type` | `work_type` |
  | `panel` | `panel` |
  | `recurring` | `recurring` |
  | `work order amount` | `work_order_amount` |
  | `budget` | `budget_amount` |
  | `actual` | `actual_amount` |
  | `balance` | `balance_amount` |
- **Exact matching**: Short tokens (e.g., "ad") require exact header match to avoid false positives.
- **Project matching**: By project code first, then by name. If no match found, auto-creates with deterministic codes: `IMP00001`, `IMP00002`, etc.
- **Excel serial date numbers**: Handled natively (Excel epoch: 1899-12-30).
- **Grand total rows**: Rows with numeric-only names (e.g., "57") should be skipped — they are summary rows, not real projects.

### 10.4 Job Plans Excel Import (`scripts/import_job_plans.cjs`)
- **Header structure**: Rows 1–5 are headers (`HEADER_ROWS = 5`); Row 3 (index 2) contains column headers.
- **RESOURCE LOADING**: The script searches for a row containing "RESOURCE LOADING" to determine where the staff allocation section begins. If found, data rows start from `rlRow + 1`; otherwise from `HEADER_ROWS`.
- **Two formats supported**:

  **Standard Format:**
  | Column | Field |
  |---|---|
  | D (index 3) | Resource Name |
  | G (index 6) | Panel Hourly / Charge Out Rate |
  | H (index 7) | Discount % |
  | I (index 8) | Discounted Hourly Rate |
  | J (index 9) | Discounted Daily Rate |
  | K (index 10) | Gross Cost Rate |
  | U+ (index 20+) | Weekly date columns |

  **SAU046 Alternate Format** (detected when cell G3 contains "DISCOUNTED CHARGE OUT"):
  | Column | Field |
  |---|---|
  | B (index 1) | Resource Name |
  | E (index 4) | Charge Out Rate |
  | F (index 5) | Discount % |
  | G (index 6) | Discounted Hourly Rate |
  | H (index 7) | Gross Cost Rate |
  | K+ (index 10+) | Weekly date columns |

- **Last-row-per-person logic**: When multiple rows exist for a person, uses the last row's summary data (rates).
- **Smart sheet selection**: Prefers sheets matching `*time*plan*` pattern.

### 10.5 PPTX VAT Report Import
- Parses PowerPoint files to bulk-create VAT SC (Sales Committee) reports.
- Extracts: status summaries, risks/issues, and planner tasks from slide content.
- Creates one report per VAT per slide.

### 10.6 KPI File Import Rules
- **Sheet**: "Job Status"; headers on row 2 (index 1); data from row 3 (index 2).
- **Key columns** (index-based):
  | Index | Field |
  |---|---|
  | 3 | Project Name (with code prefix) |
  | 13 | Work Order Amount |
  | 15 | Actual |
  | 18 | Forecasted Revenue |
  | 29 | Forecasted Gross Cost |
  | 30 | To Date GP |
  | 31 | Sold GM% |
  | 32 | TD GM% |
  | 33 | GP at Completion |
  | 34 | Forecast GM% |
  | 35–46 | Revenue months R1–R12 |
  | 47–58 | Cost months C1–C12 |
  | 59–70 | Profit months P1–P12 |
- **Monthly data FY**: FY25-26.
- **Grand total row**: The last data row may be a "Grand Total" with a numeric-only name (e.g., "57") — must be skipped during import.

---

## 11. Data Derivation Rules

### 11.1 Project Financials from Timesheets (`POST /api/derive/project-financials`)
- Aggregates `timesheets` by `project_id`, `fy_year`, and `fy_month`.
- **Revenue**: `SUM(sale_value)`.
- **Cost**: `SUM(cost_value)`.
- **Profit**: `Revenue − Cost`.
- Updates project master record:
  - `actual_amount` = total actual revenue
  - `balance_amount` = `work_order_amount − actual_amount`
  - `to_date_gross_profit` = total GP
  - `to_date_gm_percent` = `(GP / Revenue) × 100`

### 11.2 FY Year Derivation
Server-side `deriveFyYear()` and `computeFyFromDate()`:
- For a given date, determines the FY year string.
- If month ≥ July (index 6): FY start = current year.
- If month < July: FY start = previous year.
- Returns format `"YY-YY"`.

---

## 12. SharePoint Sync Rules

### 12.1 Field Mappings
SharePoint internal field names (including OData hex-encoded names) are mapped to database columns:
- **Project Code**: Extracted from `FileLeafRef` (filename) using `parseProjectCode` regex.
- **VAT**: From `Team`, `VAT`, `VATCategory`, or `VAT_x0020_Category` (cleaned via VAT normalisation).
- **Value**: From `Value_x0024_exGST`, `Value_x0020__x0024__x0020_est_`, or `TotalValue`.
- **Leads**: `BidLead0` → CAS Lead, `ClientManager` → CSD Lead.
- **Phase**: Mapped via `PHASE_TO_CLASSIFICATION` (see Section 5.2).
- **Contract Type**: Mapped via billing normalisation (see Section 1.5).

### 12.2 SharePoint Job Plans Sync
Uses the same high-fidelity parser as `scripts/import_job_plans.cjs`:
- Reads weekly date columns (not monthly).
- Extracts charge-out rates and cost rates.
- Handles RESOURCE LOADING sections, SAU046 alternate format, and smart sheet selection.
- After sync: calculates project `contract_value` from `discounted_hourly_rate × planned_hours`.

---

## 13. Employee Matching Rules

### 13.1 Standard Matching (Imports)
1. **By Name**: `firstName + lastName` (case-insensitive, trimmed).
2. **By Employee Code**: Falls back to `employeeCode` or `jid` if name match fails.
3. **Auto-creation**: If no match found during import, a new employee record is created with the available data.

### 13.2 Job Plans Matching (Extended)
1. Full name match (case-insensitive).
2. "First L" pattern: e.g., "John S" matches "John Smith".
3. First name + first initial of last name.

---

## 14. Project Matching Rules

### 14.1 Matching Priority
1. **By Project Code**: Exact match on `project_code` field (e.g., "AGD001").
2. **By Name**: Case-insensitive match on `name` field.
3. **By Code Prefix**: Extract code from a description using regex `^([A-Z]{2,6}\d{2,4}(?:-\d{1,3})?)` and match against existing codes.

### 14.2 Auto-Creation
If no match found:
- Generates a deterministic code: `IMP00001`, `IMP00002`, etc.
- Increments from the highest existing `IMPnnnnn` code in the database.

---

## 15. Resources Page Rules (`/resources`)

### 15.1 Cost RAG Status
- Green: Base/Gross cost < $700/day
- Amber: $700–$800/day
- Red: > $800/day

### 15.2 Schedule RAG Status
- Red: `schedule_end` has passed or is missing
- Amber: Ending within 3 months
- Green: Ending > 3 months away

### 15.3 Average Day Rate
- `AVG(base_cost)` for all employees where `base_cost > 0`.

---

## 16. Partner View Rules (`/partner-view`)

### 16.1 Partner Splitting
- The `partner` field may contain multiple partners separated by `;`, `,`, or `#`.
- Each partner is extracted and counted separately.
- **Value attribution**: If an opportunity has N partners, each gets `value / N`.

### 16.2 Certification Keyword Matching
| Partner | Keywords (case-insensitive) |
|---|---|
| ServiceNow | `servicenow` |
| Microsoft | `azure`, `power bi`, `microsoft` |
| AWS | `aws`, `amazon` |
| Tech One | `tech one`, `techone` |
| Salesforce | `salesforce` |

- Employee `certifications` field is semicolon-separated.
- An employee matches a partner if any certification contains any of that partner's keywords.
- Only **active** employees with `staff_type` = Permanent or Contractor are counted.

---

## 17. Pipeline Display Rules (`/pipeline`)

- Direct display of `pipeline_opportunities` records.
- Filterable by FY, classification, VAT.
- Classification display mapping:
  - C = Contracted
  - S = Selected
  - DVF = Shortlisted
  - DF = Submitted
  - Q = Qualified
  - A = Activity

---

## 18. Project Status Values

| Status | Badge Variant | Sort Order |
|---|---|---|
| `active` / `Active` | default | 0 |
| `planning` / `Next FY` | outline | 1 |
| `completed` / `Closed` | secondary | 2 |

---

## 19. Feature Request System

### 19.1 Workflow
1. Employees submit feature requests via a form.
2. Admins review submissions (approve/reject/request changes).
3. On approval, a GitHub branch is automatically created using the pattern: `feature/{sanitised-title}`.
4. Status tracking: `submitted` → `in_progress` → `completed`.

### 19.2 GitHub Integration
- Branch creation via GitHub PAT (`GITHUB_PAT` env var).
- Repository: `ssengupta123/FinanceHub`.
- Branch created from `main`.

---

## 20. VAT Sales Committee Reports

### 20.1 Structure
- Web-based editable interface replicating PowerPoint VAT SC reports.
- Covers 7 VATs (the 6 canonical VATs plus any additional).
- Each report includes:
  - Status overview summary
  - Risks and issues
  - Planner tasks
  - AI-generated suggestions

### 20.2 Microsoft Planner Integration
- Tasks sync with Microsoft Planner via Graph API.
- Uses Azure credentials (`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`).

---

## 21. AI Insights

### 21.1 Configuration
- Model: GPT-4o-mini via OpenAI integration.
- Uses streaming responses for real-time display.

### 21.2 Analysis Categories
- **Risk Analysis**: Identifies project risks from financial data patterns.
- **Financial Intelligence**: Highlights trends, anomalies, and opportunities.
- **Spending Patterns**: Analyses cost distribution and burn rates.

---

## 22. Key Database Tables

| Table | Purpose | Key Consumers |
|---|---|---|
| `projects` | Project master data (contract value, billing type, VAT, status) | Dashboard, Finance, Utilisation, Scenarios |
| `project_monthly` | Monthly revenue/cost/profit per project per FY | Dashboard, Finance, Scenarios, VAT Overview |
| `pipeline_opportunities` | Pipeline deals with classification and monthly revenue/GP | Dashboard, Scenarios, VAT Overview, Partner View |
| `employees` | Staff records (cost rates, certifications, status) | Resources, Utilisation, Partner View |
| `timesheets` | Weekly time entries per employee per project | Utilisation, Resources, Timesheets |
| `resource_plans` | Forward-looking allocation % per employee per project, with weekly JSON | Job Plans, Resource Allocation, Utilisation |
| `vat_targets` | Annual tier targets per VAT (OK/Good/Great/Amazing) | VAT Overview |
| `reference_data` | Config values (financial targets, VAT categories, etc.) | Dashboard, VAT Overview |
| `scenarios` | Saved what-if scenario configurations | Scenarios |
| `scenario_adjustments` | Per-classification win rate overrides for a scenario | Scenarios |
| `permissions` | RBAC permission matrix (role × resource × action) | All protected routes |
| `feature_requests` | Employee enhancement requests with review workflow | Feature Requests |
| `vat_reports` | VAT SC report content (status, risks, tasks) | VAT Reports |
| `costs` | Direct project cost entries | Finance |
| `milestones` | Project milestone tracking | Project Detail |
