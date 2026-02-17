# FinanceHub - Project Finance Management

## Overview
A production-grade financial and project management application that consolidates data from multiple sources (manual inputs and automated data ingestion from external systems). Tracks project burn rates, resource utilization, and financial forecasts with proper workflows. Matches Excel data structure with pipeline classifications, VAT categories, billing types, and Australian FY format. Designed for Azure deployment.

## Tech Stack
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui, wouter, TanStack Query
- **Backend**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: shadcn/ui components, dark/light theme support

## Architecture
- `shared/schema.ts` - Data models: employees, projects, projectMonthly, rateCards, resourcePlans, timesheets, costs, kpis, forecasts, milestones, dataSources, onboardingSteps, pipelineOpportunities, scenarios, scenarioAdjustments, conversations, messages, users, referenceData
- `shared/models/chat.ts` - Chat/conversation schema for AI integration (conversations + messages tables)
- `server/routes.ts` - REST API endpoints with query param filtering, auth routes, reference data CRUD
- `server/storage.ts` - Database storage layer with CRUD + aggregation queries
- `server/seed.ts` - Realistic demo data (5 projects, 9 employees, 15 pipeline opportunities, 2 scenarios, 60 monthly records, KPIs, timesheets, costs, milestones, forecasts, 6 data sources, 16 reference data records, admin user)
- `client/src/pages/` - 17+ pages across dashboards, management, operations, tracking, pipeline & forecasting, admin
- `client/src/components/` - AppSidebar, ThemeProvider, ThemeToggle
- `client/src/hooks/use-auth.tsx` - Auth context/provider with useAuth hook (session-based)

## Key Concepts
- **Australian FY**: Financial year runs Jul-Jun, format "25-26" (FY2025-26)
- **Pipeline Classifications**: C(100%), S(80%), DVF(50%), DF(30%), Q(15%), A(5%) win probabilities
- **VAT Categories**: Growth, VIC, DAFF, Emerging, DISR, SAU
- **Billing Types**: Fixed (Fixed Price), T&M (Time & Materials), LH (Labour Hire)
- **Monthly Breakdown**: M1=Jul through M12=Jun, with R (revenue), C (cost), P (profit) per month

## Key Features
1. **Dashboard** - KPI summary (Sold, Budgeted, Revenue, Margin) with RAG indicators, recharts visualizations (Revenue by Billing Type pie, Pipeline Classification pie, Monthly Revenue/Cost/Profit area chart, Project Margin vs Target bar chart), Target Tracking with progress bars, Monthly Snapshot (M1-M12)
2. **Finance Dashboard** - Client Summary with Q1-Q4 quarterly breakdown, YTD Revenue/Cost/GP/GP%, column toggles, RAG dots on GP%, RAG borders on KPI cards, VAT Category Breakdown, Billing Type Split (Fixed vs T&M)
3. **Utilization Dashboard** - Resource utilization, billable ratios, project hours
4. **Projects (Job Status)** - Excel-style job status view with filters (VAT, Billing, Status), column toggles, expandable monthly R/C/P details, A/D status, work order/actual/balance/forecast tracking, RAG dots on margin column, RAG color coding on balance
5. **Resources (Staff SOT)** - Staff Schedule of Tasks with JID, Cost Band, Staff Type, Base/Gross Cost rates, Payroll Tax, Schedule dates, team, summary cards, column toggles, RAG indicators on gross cost and schedule end dates
6. **Pipeline** - Sales Pipeline with classification summary cards (C/S/DVF/DF/Q/A), opportunity table with monthly revenue (M1-M12), column toggles, RAG dots based on total revenue, filtering by classification/VAT
7. **What-If Scenarios** - Interactive win rate sliders (0-100%), real-time weighted revenue/GP, revenue/margin goal tracking, presets (Conservative/Base/Optimistic), monthly projections, scenario save/load
8. **Rate Cards** - Role-based billing rates with effective dates
9. **Resource Plans** - Project-resource allocation by month
10. **Timesheets** - Time entry tracking with sources (manual, i-Time, Dynamics)
11. **Costs** - Cost tracking by category (resource, R&D, overhead, subcontractor, travel)
12. **Milestones** - Project milestone tracking with status updates
13. **Forecasts** - Revenue/cost/utilization forecasts
14. **Person Onboarding** - Step-by-step onboarding workflow with progress tracking
15. **Data Sources** - External system monitoring (VAGO, Dynamics, Payroll Tax, etc.)
16. **Dark/Light Theme** - Full dark mode support

## External Data Sources
- Employment Hero (API, daily sync)
- iTimesheets (API, daily sync)
- SharePoint (API, hourly sync)

## API Endpoints
### Employees
- `GET /api/employees` - List all (includes costBandLevel, staffType, baseCost, grossCost, team, jid, scheduleStart/End)
- `GET /api/employees/:id` - Get single
- `POST /api/employees` - Create
- `PATCH /api/employees/:id` - Update
- `DELETE /api/employees/:id` - Delete
- `GET /api/employees/:id/onboarding` - Get onboarding steps
- `POST /api/employees/:id/onboarding` - Add onboarding step

### Projects
- `GET /api/projects` - List all (includes clientCode, billingCategory, vat, pipelineStatus, adStatus, workOrderAmount, actualAmount, balanceAmount, forecastedRevenue, opsCommentary)
- `GET /api/projects/:id` - Get single
- `POST /api/projects` - Create
- `PATCH /api/projects/:id` - Update
- `DELETE /api/projects/:id` - Delete
- `GET /api/projects/:id/summary` - Get aggregated project summary

### Project Monthly
- `GET /api/project-monthly` - List all (supports `?projectId=` filter). Returns month 1-12, monthLabel, revenue, cost, profit per project per FY
- `POST /api/project-monthly` - Create

### Pipeline Opportunities
- `GET /api/pipeline-opportunities` - List all (supports `?classification=` and `?vat=` filters). Returns monthly revenue M1-M12 and gross profit M1-M12
- `POST /api/pipeline-opportunities` - Create
- `DELETE /api/pipeline-opportunities/:id` - Delete

### Scenarios
- `GET /api/scenarios` - List all
- `POST /api/scenarios` - Create
- `GET /api/scenarios/:id` - Get with adjustments
- `DELETE /api/scenarios/:id` - Delete
- `POST /api/scenarios/:id/adjustments` - Add adjustment
- `DELETE /api/scenario-adjustments/:id` - Delete adjustment

### Rate Cards
- `GET /api/rate-cards` - List all
- `POST /api/rate-cards` - Create
- `PATCH /api/rate-cards/:id` - Update
- `DELETE /api/rate-cards/:id` - Delete

### Resource Plans, Timesheets, Costs, KPIs, Forecasts, Milestones
- `GET /api/{entity}` - List all (supports `?projectId=` and `?employeeId=` filtering)
- `POST /api/{entity}` - Create
- `PATCH /api/{entity}/:id` - Update (where applicable)
- `DELETE /api/{entity}/:id` - Delete (where applicable)

### Data Sources
- `GET /api/data-sources` - List all
- `POST /api/data-sources` - Create
- `PATCH /api/data-sources/:id` - Update (for sync status)

### AI Insights
- `POST /api/ai/insights` - Generate AI analysis (SSE streaming). Body: `{ type: "pipeline" | "projects" | "overview" }`. Uses OpenAI via Replit AI Integrations.

### Dashboard Aggregates
- `GET /api/dashboard/summary` - Overall KPI summary
- `GET /api/dashboard/finance` - Finance breakdown by month
- `GET /api/dashboard/utilization` - Resource utilization summary

## Frontend Routes
- `/` - Main Dashboard (KPIs, Engagement Margin, Classification Forecast, Monthly Snapshot)
- `/finance` - Finance Dashboard (Client Summary Q1-Q4, VAT Breakdown, Billing Split)
- `/utilization` - Utilization Dashboard
- `/pipeline` - Sales Pipeline (by Classification)
- `/scenarios` - What-If Scenarios
- `/projects` - Job Status (project list with financial tracking)
- `/projects/:id` - Project detail
- `/resources` - Staff SOT (Schedule of Tasks)
- `/rate-cards` - Rate Cards
- `/resource-plans` - Resource Plans
- `/timesheets` - Timesheets
- `/costs` - Costs
- `/milestones` - Milestones
- `/forecasts` - Forecasts
- `/onboarding` - Person Onboarding
- `/data-sources` - Data Sources
- `/ai-insights` - AI Insights (AI-powered pipeline health, project status, executive overview analysis)

## Deployment
- Designed for Azure deployment (not Replit hosting)
- Production-grade data model with proper relationships and constraints
