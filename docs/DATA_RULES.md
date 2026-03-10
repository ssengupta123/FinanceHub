# FinanceHub Data Rules

This document defines the data calculation rules, thresholds, and business logic applied across the FinanceHub application. These rules were established by the COO and implemented across all relevant pages.

---

## 1. Dashboard RAG Thresholds

**Location:** Dashboard page (`/`)

- **Green:** Actual meets or exceeds target
- **Amber:** Actual is within 90% of target (i.e. actual >= target * 0.9)
- **Red:** Actual is below 90% of target

The amber zone represents the warning threshold at 90% of the target value.

---

## 2. Finance Page GP% RAG Thresholds

**Location:** Finance page (`/finance`)

- **Green:** GP% >= 30%
- **Amber:** GP% >= 15% and < 30%
- **Red:** GP% < 15%

These thresholds apply to:
- GP% RAG dot indicators on project rows
- GM colour classes for financial summaries
- GP margin border styling on summary cards

---

## 3. YTD Revenue & Costs Calculation

**Location:** Dashboard, Finance, Scenarios pages

YTD revenue and cost figures use **raw timesheet data** from `project_monthly` records without any day-level pro-rating.

- The current month's data from `project_monthly` is included as-is (no dayFraction multiplier)
- Revenue and cost are summed directly for all elapsed months (FY month 1 through current month)
- This applies across Dashboard totals, Finance project rows, and Scenarios YTD actuals

---

## 4. GP Fallback for Pipeline Opportunities

**Location:** Scenarios page (`/scenarios`)

When pipeline opportunities do not have GP data available, a **fixed 20% margin** is applied as the fallback rate.

- This replaces the previous dynamic approach that used the YTD actual margin ratio
- Opportunities using the fallback are flagged in the UI with an amber indicator and the text: "GP estimated using default 20% margin where pipeline GP data is missing"

---

## 5. Scenarios Projected Total Formula

**Location:** Scenarios page (`/scenarios`)

The Projected Total Revenue is calculated as:

```
Projected Total = YTD Actual Revenue + Remaining Contracted Revenue + Pipeline Weighted Revenue
```

**Components:**
- **YTD Actual Revenue:** Sum of `project_monthly` revenue for all elapsed FY months
- **Remaining Contracted Revenue:** Total Sold (sum of `budgetAmount` across FY projects — same as the Dashboard "Sold" card) minus YTD Actual Revenue. Formula: `Remaining = Sold - YTD Revenue`. GP uses a weighted average GM% across projects.

### Cost Derivation from Job Plans
When deriving project financials from timesheets, cost is calculated using the **daily gross cost rate** from resource plans (job plans), not the `cost_value` stored on individual timesheet entries:
- Daily cost rate = `hourly_gross_cost × 8` (from `resource_plans` per employee per project)
- Cost = `days_worked × daily_cost_rate`
- This ensures that even if a permanent employee works more than 8 hours, the cost is capped at the daily rate
- Profit = Revenue - Cost
- **Pipeline Weighted Revenue:** Sum of pipeline opportunity values multiplied by win probability percentages

The same formula applies to GP:
```
Projected GP = YTD Actual GP + Remaining Contracted GP + Pipeline Weighted GP
```

A dedicated "Remaining Contracted" summary card is displayed between the YTD and Pipeline cards.

---

## 6. Monthly Trend Chart Projections

**Location:** Dashboard page (`/`)

The monthly trend chart displays:
- **Solid lines:** Actual data for elapsed months (Revenue, Cost, Profit)
- **Dashed lines:** Projected data for future months (Projected Revenue, Projected Cost, Projected Profit)

**Projection logic:**
- If `project_monthly` data exists for a future month, that value is used
- Otherwise, the historical average (mean of all elapsed months) is used as the projection
- Both actual and projected series are shown simultaneously on the chart

---

## 7. Project Status Excel Import Rules

**Location:** Data Sources page, Project Status import (`POST /api/import/project-status`)

When importing from the Project Status Excel file:
- **Imported columns:** VPN (project code), A/D status, VAT, Client, Project name, Client Manager, Engagement Manager, Start date, End date, Billing Category, Work Type, Panel, Recurring, Work Order Amount
- **Skipped columns:** Budget, Actual, Balance

Budget, Actual, and Balance values are **not** imported from Excel. These are derived exclusively from timesheet data via the `POST /api/derive/project-financials` endpoint, which aggregates timesheets into `project_monthly` records and updates project totals.

---

## 8. KPI / Job Status Excel Import Rules

**Location:** Data Sources page, Job Status/KPI import

When importing from the Job Status Excel file, the following columns are **skipped** (not imported):
- Column 15: Actual Amount
- Column 18: Forecasted Revenue
- Column 20: Variance Percent
- Column 30: To-Date Gross Profit
- Column 32: To-Date GM%
- Column 33: GP at Completion
- Column 34: Forecast GM%
- Columns 35-70: Monthly breakdown data

These values are all derived from timesheets and `project_monthly` via the derive endpoint. Monthly data creation from the KPI file is also skipped entirely.

**Imported columns include:** Project code, name, VAT, client, managers, dates, billing category, work type, contract value, variance at completion, variance to contract %, write-off, ops commentary, sold GM%.

---

## 9. Partner View Filtering

**Location:** Partner View page (`/partner-view`)

Pipeline opportunities are included in the Partner View if **either** condition is met:
- The `partner` field is populated (non-empty, non-blank)
- The `category` field contains the word "partner" (case-insensitive)

This ensures opportunities tagged via the category field are visible even if the dedicated partner field is empty.

---

## 10. VAT Overview Forecast (Q4 and Future Quarters)

**Location:** VAT Overview page (`/vat-overview`)

Forecast for future quarters combines data from two sources:

1. **Committed Work (project_monthly):** Revenue and GM from `project_monthly` records for future months that already have forecast data
2. **Job Plans (resource_plans):** Revenue projected from resource plan weekly allocations using `discounted_hourly_rate`, and cost projected using `hourly_gross_cost`

The combined forecast provides a more complete picture of expected Q4 performance by including both existing project commitments and planned resource allocations from job plans.

---

## Financial Year Convention

All calculations use the **Australian Financial Year** (July to June):
- FY Month 1 = July, FY Month 12 = June
- Q1 = Jul-Sep (months 1-3), Q2 = Oct-Dec (months 4-6), Q3 = Jan-Mar (months 7-9), Q4 = Apr-Jun (months 10-12)
- FY notation: "24-25" represents July 2024 through June 2025

---

## Derive Endpoint

`POST /api/derive/project-financials`

This is the single source of truth for project financial aggregation:
- Aggregates timesheets into `project_monthly` (revenue/cost/profit by FY month)
- Updates project `actual_amount`, `balance_amount`, `to_date_gm_percent`
- Should be run after timesheet imports to refresh all derived financial data

---

*Last updated: March 2026*
