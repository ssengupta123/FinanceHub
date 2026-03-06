# FinanceHub — Data Derivation Rules

This document describes, view by view, exactly which database fields are queried and what calculation rules transform them into the values displayed on screen. Use this to verify correctness and consistency.

---

## Global Rules

### Australian Financial Year (FY)
- FY runs **July to June** (e.g., FY 25-26 = 1 Jul 2025 – 30 Jun 2026).
- FY Month mapping: **1 = Jul, 2 = Aug, … 6 = Dec, 7 = Jan, 8 = Feb, 9 = Mar, … 12 = Jun**.

### Day-Level YTD Pro-Rating (`getElapsedFyInfo`)
All YTD calculations use day-level precision:
- **Completed months** are counted in **full** (factor = 1.0).
- The **current (partial) month** is scaled by **`dayOfMonth / daysInMonth`**  
  (e.g., March 5 → 5/31 ≈ 0.1613 of March's values are included).
- **Past FYs**: All 12 months count fully (factor = 1.0 each).
- **Future FYs**: Zero months counted.
- This rule applies to: Dashboard, Scenarios, Finance, and VAT Overview pages.

### FY Project Filtering
A project is considered part of an FY if it has at least one row in `project_monthly` with `fy_year = 'XX-XX'`. The set of "FY projects" is derived from this, not from the project's own dates.

---

## 1. Dashboard (`/`)

### Data Sources
| API Endpoint | DB Table(s) | Key Columns |
|---|---|---|
| `/api/projects` | `projects` | `id`, `contract_value`, `budget_amount`, `billing_category`, `vat`, `status` |
| `/api/project-monthly` | `project_monthly` | `project_id`, `fy_year`, `month`, `revenue`, `cost`, `profit` |
| `/api/pipeline-opportunities` | `pipeline_opportunities` | `classification`, `value`, `revenue_m1`…`revenue_m12`, `fy_year` |
| `/api/utilization/weekly` | `employees`, `timesheets`, `projects` | `staff_type`, `status`, `employee_id`, `client` |
| `/api/reference-data` | `reference_data` | `category = 'financial_targets'`, `value` (JSON) |

### Derived Values

#### Sold (Contracted)
- **Formula**: `SUM(projects.contract_value)` for all FY projects
- **Scope**: Only projects that have `project_monthly` rows in the selected FY
- **Note**: Head contracts (umbrella contracts without their own monthly revenue) are excluded because they have no `project_monthly` rows. Their revenue is tracked via sub-projects.

#### Revenue Target
- **Source**: `reference_data` where `category = 'financial_targets'`
- **Fallback**: $5,000,000 if no target is set for the selected FY
- **YTD Target**: `Revenue Target × (completedMonths + dayFraction) / 12`

#### YTD Revenue
- **Formula**: `SUM(project_monthly.revenue)` for months 1 through `currentFyMonth`
- **Pro-rating**: Current month's revenue is multiplied by `dayOfMonth / daysInMonth`
- **Scope**: All `project_monthly` rows where `fy_year` matches the selected FY

#### YTD Costs
- **Formula**: `SUM(project_monthly.cost)` for months 1 through `currentFyMonth`
- **Pro-rating**: Same day-fraction rule as YTD Revenue

#### Margin %
- **Formula**: `(YTD Revenue − YTD Costs) / YTD Revenue`
- **Display**: As percentage (e.g., 29.7%)
- **Edge case**: Returns 0 if YTD Revenue = 0

#### Utilisation
- **Total Permanent**: Count of `employees` where `staff_type = 'Permanent'` and `status ≠ 'inactive'`
- **Allocated Permanent**: Count of distinct `employee_id` in `timesheets` for the FY where employee is Permanent and project client is NOT 'Internal' or 'RGT'
- **Formula**: `Allocated Permanent / Total Permanent`

#### Billing Breakdown (Pie Chart)
- **Groups**: Based on `projects.billing_category` (Fixed, T&M, Other)
- **Revenue per group**: `SUM(project_monthly.revenue)` for YTD months, pro-rated for current month
- **Cost per group**: Same logic using `project_monthly.cost`
- **GP per group**: `Revenue − Cost`
- **GM% per group**: `GP / Revenue`

#### Pipeline Classification (Pie Chart)
- **Groups**: `pipeline_opportunities.classification` (S, DVF, DF, Q, A)
- **Revenue per opportunity**: `SUM(revenue_m1 through revenue_m12)`. If all monthly values are 0, uses the `value` column instead.
- **Classification labels**: S = Selected, DVF = Shortlisted, DF = Submitted, Q = Qualified, A = Activity

#### Monthly Trend (Area Chart)
- **Per month**: `SUM(revenue)`, `SUM(cost)`, `Profit = Revenue − Cost`
- **Scope**: All 12 months of the selected FY (not just YTD)
- **No pro-rating**: Shows full monthly values for all months

#### Cumulative YTD vs Target (Composed Chart)
- **Cumulative Revenue**: Running sum of monthly revenue, months 1 through `currentFyMonth`
- **Current month**: Pro-rated by day-fraction
- **Target line**: `Revenue Target / 12` added per month (linear)
- **Future months**: Not plotted (null)

#### RAG (Red-Amber-Green) Status
- Sold card: Compared against Revenue Target
- YTD Revenue card: Compared against prorated YTD Target
- Margin card: Compared against Margin Target (default 40%)

---

## 2. Finance (`/finance`)

### Data Sources
| API Endpoint | DB Table(s) | Key Columns |
|---|---|---|
| `/api/projects` | `projects` | Same as Dashboard |
| `/api/project-monthly` | `project_monthly` | Same as Dashboard |

### Derived Values

#### Per-Project Row (Client Table)
Each project gets a row with:
- **Q1 Revenue** (Jul-Sep): `SUM(revenue × dayFactor)` for months 1-3
- **Q2 Revenue** (Oct-Dec): `SUM(revenue × dayFactor)` for months 4-6
- **Q3 Revenue** (Jan-Mar): `SUM(revenue × dayFactor)` for months 7-9
- **Q4 Revenue** (Apr-Jun): `SUM(revenue × dayFactor)` for months 10-12
- All quarters capped at `elapsedMonths` (future months excluded)
- **dayFactor**: 1.0 for completed months, `dayOfMonth/daysInMonth` for current month
- **YTD Revenue**: Q1 + Q2 + Q3 + Q4
- **YTD Cost**: `SUM(cost × dayFactor)` for months 1 through `elapsedMonths`
- **YTD GP**: `YTD Revenue − YTD Cost`
- **GP%**: `(YTD GP / YTD Revenue) × 100` (0 if revenue is 0)

#### Summary Cards
- **Total Revenue**: `SUM(all project YTD Revenue)`
- **Total Cost**: `SUM(all project YTD Cost)`
- **Gross Profit**: `Total Revenue − Total Cost`
- **GP Margin %**: `(Gross Profit / Total Revenue) × 100`

#### Monthly Snapshot
- Per-month totals across all FY projects: Revenue, Cost, Profit, GM%
- Full months (no pro-rating applied here — shows raw monthly values)

#### Sorting
- Primary: Status order (active = 0, other = 1, completed = 2)
- Secondary: Alphabetical by client name

#### RAG Coloring
- **GP%**: Green (≥20%), Amber (≥10%), Red (<10%)
- **GP Margin %**: Green (≥40%), Amber (≥20%), Red (<20%)

---

## 3. What-If Scenarios (`/scenarios`)

### Data Sources
| API Endpoint | DB Table(s) | Key Columns |
|---|---|---|
| `/api/project-monthly` | `project_monthly` | `revenue`, `cost`, `month`, `fy_year` |
| `/api/pipeline-opportunities` | `pipeline_opportunities` | `value`, `margin_percent`, `classification`, `start_date`, `expiry_date`, `revenue_m1`-`m12`, `gross_profit_m1`-`m12` |
| `/api/scenarios` | `scenarios`, `scenario_adjustments` | Saved goals and custom win rates |

### Derived Values

#### YTD Actual Revenue
- **Formula**: `SUM(project_monthly.revenue)` for months 1 through `currentFyMonth`
- **Pro-rating**: Current month scaled by `dayOfMonth / daysInMonth`
- **Monthly breakdown**: Revenue per FY month stored in 12-element array

#### YTD GP
- **Formula**: `SUM(revenue − cost)` for YTD months, pro-rated same way

#### Pipeline FY Proration Logic
For each pipeline opportunity:
1. If monthly revenue data exists (`revenue_m1`…`m12`), sum those values
2. Otherwise, calculate overlap between opportunity dates and the selected FY:
   - `FY Revenue = Total Value × (months overlapping FY / total project months)`
   - If no end date, assumes 12-month duration from start date

#### Win Rate Weights
| Classification | Default Weight |
|---|---|
| S (Selected) | 80% |
| DVF (Shortlisted) | 50% |
| DF (Submitted) | 30% |
| Q (Qualified) | 15% |
| A (Activity) | 5% |

Users can adjust these via sliders. Presets: Conservative, Base Case, Optimistic.

#### Pipeline Weighted Revenue (Remaining Months)
- For months `elapsedMonths+1` through 12:
  `SUM(pipeline opportunity FY monthly revenue × Win Rate %)`
- Only selected classifications contribute (user can toggle each)

#### Summary Cards
- **Projected Total**: `YTD Actual Revenue + Pipeline Weighted Revenue`
- **Revenue Gap**: `Revenue Goal − Projected Total`
- **Projected GP**: `YTD GP + Pipeline Weighted GP`
- **Margin Status**: `(Projected GP / Projected Total) × 100`

#### GP Fallback
- If a pipeline opportunity lacks specific GP data, the system uses the **YTD Actual Margin %** as a fallback estimate for that opportunity's GP contribution.

#### Monthly Projection Table
- Months 1 to `elapsedMonths`: Show **actuals** (from `project_monthly`, blue-tinted)
- Months `elapsedMonths+1` to 12: Show **weighted pipeline forecast**
- Combined row: Actual + Pipeline for each month
- Cumulative row: Running total across all months

---

## 4. VAT Overview (`/vat-overview`)

### Data Sources
| API Endpoint | DB Table(s) | Key Columns |
|---|---|---|
| `/api/vat-overview` | `project_monthly`, `projects`, `vat_targets`, `reference_data` | `revenue`, `profit`, `vat`, `fy_year`, `month` |
| `/api/pipeline-opportunities` | `pipeline_opportunities` | `value`, `classification`, `margin_percent`, `vat` |

### Server-Side Query (Per VAT)
1. Get all project IDs where `projects.vat` matches the VAT name
2. Sum `project_monthly.revenue` and `project_monthly.profit` grouped by quarterly month buckets:
   - Q1: months 1-3 (Jul-Sep)
   - Q2: months 4-6 (Oct-Dec)
   - Q3: months 7-9 (Jan-Mar)
   - Q4: months 10-12 (Apr-Jun)
3. Months ≤ `elapsedMonths` → Actuals; months > `elapsedMonths` → Forecast

### Derived Values

#### YTD Revenue per VAT
- `SUM(project_monthly.revenue)` for the VAT's projects, months ≤ `elapsedMonths`

#### YTD GM Contribution per VAT
- `SUM(project_monthly.profit)` for the same scope

#### YTD GM %
- `YTD GM Contribution / YTD Revenue` (0 if revenue is 0)

#### Target Pro-Rating
- **Source**: `vat_targets` table stores annual tier targets per VAT per FY
- **Tiers**: OK, Good, Great, Amazing
- **Prorate ratio**: `(completedMonths + dayFraction) / 12`
- **Prorated target**: `Annual Target × Prorate Ratio`

#### Tier Status Badges
- Compare YTD actual against prorated targets:
  - If YTD ≥ Amazing prorated → "Amazing" (purple)
  - If YTD ≥ Great prorated → "Great" (green)
  - If YTD ≥ Good prorated → "Good" (blue)
  - If YTD ≥ OK prorated → "OK" (amber)
  - Otherwise → "Below Target" (red)

#### Chart
- **Bars**: Quarterly cumulative actuals (solid) and forecasts (faded)
- **Dashed Lines**: Cumulative tier targets (Q1 = Annual/4, Q2 = Annual/2, etc.)
- **What-If Overlay (orange)**: Pipeline weighted value spread across remaining quarters

#### Pipeline What-If (Client-Side Only — Not Saved)
- **Weighted Value**: `Opportunity Value × (Win Rate / 100)`
- **Projected GM**: `Weighted Value × Margin %` (default 30% if null)
- **Spread**: Divided evenly across remaining quarters in the FY

---

## 5. Utilisation (`/utilization`)

### Data Sources
| API Endpoint | DB Table(s) | Key Columns |
|---|---|---|
| `/api/employees` | `employees` | `id`, `first_name`, `last_name`, `staff_type`, `status`, `role` |
| `/api/timesheets` | `timesheets` | `employee_id`, `project_id`, `week_ending`, `hours_worked`, `billable` |
| `/api/projects` | `projects` | `id`, `name`, `client`, `status`, `start_date`, `end_date` |
| `/api/resource-plans` | `resource_plans` | `employee_id`, `project_id`, `month`, `allocation_percent` |
| `/api/timesheets/weekly-utilization` | `timesheets` (aggregated) | `employee_id`, `week_ending`, `total_hours`, `billable_hours` |

### Derived Values

#### Standard Weekly Capacity
- Fixed at **40 hours**

#### Utilisation %
- **Actual**: `(total_hours / 40) × 100`
- **Projected via Resource Plan**: Uses `allocation_percent` directly
- **Projected via Recent Average**: If no resource plan exists, looks at last 4 weeks of active project work; if project was active in last 2 weeks, projects average weekly hours forward

#### Billable vs Non-Billable
- **Billable Hours**: Sum of `hours_worked` where `timesheet.billable = true`
- **Non-Billable Hours**: Sum where `billable = false`
- **Billable Ratio**: `billable_hours / total_hours`
- **Default projection ratio**: 80% if no recent history available

#### Bench
- **Bench Hours per week**: `MAX(40 − total_hours, 0)`
- **Bench %**: `(total_bench_hours / total_capacity_hours) × 100`

#### FY Filtering
- Timesheets filtered by `week_ending` date range matching the selected FY (Jul 1 – Jun 30)

---

## 6. Resources (`/resources`)

### Data Sources
| API Endpoint | DB Table(s) | Key Columns |
|---|---|---|
| `/api/employees` | `employees` | All fields including `base_cost`, `gross_cost`, `staff_type`, `team`, `status`, `schedule_start`, `schedule_end`, `certifications` |
| `/api/timesheets/available-fys` | `timesheets` | Distinct FY values |
| `/api/timesheets?fy=XX-XX` | `timesheets` | Used to identify active employees in FY |

### Derived Values

#### Cost RAG Status
- **Base Cost / Gross Cost**: Displayed as $/day
- Green: < $700
- Amber: $700 – $800
- Red: > $800

#### Schedule RAG Status
- Red: `schedule_end` has passed or is missing
- Amber: Ending within 3 months
- Green: Ending > 3 months away

#### Average Day Rate
- `AVG(base_cost)` for all employees where `base_cost > 0`

#### FY Staff Filtering
- If an FY is selected, only employees with recorded timesheets in that FY are shown

---

## 7. Partner View (`/partner-view`)

### Data Sources
| API Endpoint | DB Table(s) | Key Columns |
|---|---|---|
| `/api/pipeline-opportunities` | `pipeline_opportunities` | `name`, `classification`, `vat`, `fy_year`, `value`, `partner` |
| `/api/employees` | `employees` | `first_name`, `last_name`, `staff_type`, `status`, `certifications` |

### Derived Values

#### Partner Splitting
- The `partner` field may contain multiple partners separated by `;`, `,`, or `#`
- Each partner is extracted and counted separately
- **Value attribution**: If an opportunity has N partners, each gets `value / N`

#### Certification Matching
| Partner | Keywords (case-insensitive) |
|---|---|
| ServiceNow | `servicenow` |
| Microsoft | `azure`, `power bi`, `microsoft` |
| AWS | `aws`, `amazon` |
| Tech One | `tech one`, `techone` |
| Salesforce | `salesforce` |

- Employee `certifications` field is semicolon-separated
- An employee matches a partner if any certification contains any of that partner's keywords
- Only **active** employees with `staff_type` = Permanent or Contractor are counted

#### Partner Directory
- **Opportunity Count**: Number of pipeline opportunities mentioning this partner
- **Pipeline Value**: Sum of `value / N` for each opportunity (split among partners)
- **Certified Staff**: Count of employees matching this partner's certification keywords

---

## 8. Pipeline (`/pipeline`)

### Data Sources
| API Endpoint | DB Table(s) | Key Columns |
|---|---|---|
| `/api/pipeline-opportunities` | `pipeline_opportunities` | All fields |

### Display Rules
- Direct display of `pipeline_opportunities` records
- Filterable by FY, classification, VAT
- Classification display mapping: C = Contracted, S = Selected, DVF = Shortlisted, DF = Submitted, Q = Qualified, A = Activity

---

## 9. Projects (`/projects`, `/projects/:id`)

### Data Sources
| API Endpoint | DB Table(s) | Key Columns |
|---|---|---|
| `/api/projects` | `projects` | All fields |
| `/api/project-monthly` | `project_monthly` | Filtered by `project_id` |
| `/api/milestones` | `milestones` | Filtered by `project_id` |

### Display Rules
- Project list shows all projects with key fields
- Project detail shows monthly revenue/cost/profit breakdown
- Milestones displayed per project

---

## 10. Timesheets (`/timesheets`)

### Data Sources
| API Endpoint | DB Table(s) | Key Columns |
|---|---|---|
| `/api/timesheets?fy=XX-XX` | `timesheets` | `employee_id`, `project_id`, `week_ending`, `hours_worked`, `billable`, `cost_value`, `sale_value` |

### FY Filtering
- Server-side filter: `week_ending` between FY start (Jul 1) and FY end (Jun 30)
- Reduces data transfer by only returning timesheets for the selected FY

---

## Summary of Key Database Tables

| Table | Purpose | Key Consumers |
|---|---|---|
| `projects` | Project master data (contract value, billing type, VAT, status) | Dashboard, Finance, Utilisation, Scenarios |
| `project_monthly` | Monthly revenue/cost/profit per project per FY | Dashboard, Finance, Scenarios, VAT Overview |
| `pipeline_opportunities` | Pipeline deals with classification and monthly revenue/GP | Dashboard, Scenarios, VAT Overview, Partner View |
| `employees` | Staff records (cost rates, certifications, status) | Resources, Utilisation, Partner View |
| `timesheets` | Weekly time entries per employee per project | Utilisation, Resources, Timesheets |
| `vat_targets` | Annual tier targets per VAT (OK/Good/Great/Amazing) | VAT Overview |
| `reference_data` | Config values (financial targets, VAT categories, etc.) | Dashboard, VAT Overview |
| `scenarios` | Saved what-if scenario configurations | Scenarios |
| `kpis` | Imported KPI snapshots from Job Status | Dashboard (legacy) |
| `resource_plans` | Forward-looking allocation % per employee per month | Utilisation projections |
