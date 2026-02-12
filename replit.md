# FinanceHub - Project Finance Management

## Overview
A production-grade financial and project management application that consolidates data from multiple sources (manual inputs and automated data ingestion from external systems). Tracks project burn rates, resource utilization, and financial forecasts with proper workflows. Designed for Azure deployment.

## Tech Stack
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui, wouter, TanStack Query
- **Backend**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: shadcn/ui components, dark/light theme support

## Architecture
- `shared/schema.ts` - Data models: employees, projects, rateCards, resourcePlans, timesheets, costs, kpis, forecasts, milestones, dataSources, onboardingSteps
- `server/routes.ts` - REST API endpoints with query param filtering
- `server/storage.ts` - Database storage layer with CRUD + aggregation queries
- `server/seed.ts` - Realistic demo data (5 projects, 9 employees, KPIs, timesheets, costs, milestones, forecasts, 6 data sources)
- `client/src/pages/` - 14+ pages across dashboards, management, operations, tracking
- `client/src/components/` - AppSidebar, ThemeProvider, ThemeToggle

## Key Features
1. **Dashboard** - KPI summary cards (revenue, active projects, resources, utilization)
2. **Finance Dashboard** - Revenue by project, monthly breakdown, cost analysis
3. **Utilization Dashboard** - Resource utilization, billable ratios, project hours
4. **Projects** - CRUD with detail view (tabs: Overview, KPIs, Costs, Milestones, Resource Plan)
5. **Resources/Employees** - Employee management with roles, grades, clearances
6. **Rate Cards** - Role-based billing rates with effective dates
7. **Resource Plans** - Project-resource allocation by month
8. **Timesheets** - Time entry tracking with sources (manual, i-Time, Dynamics)
9. **Costs** - Cost tracking by category (resource, R&D, overhead, subcontractor, travel)
10. **Milestones** - Project milestone tracking with status updates
11. **Forecasts** - Revenue/cost/utilization forecasts
12. **Person Onboarding** - Step-by-step onboarding workflow with progress tracking
13. **Data Sources** - External system monitoring (VAGO, Dynamics, Payroll Tax, etc.)
14. **Dark/Light Theme** - Full dark mode support

## External Data Sources (from diagram)
- VAGO Extracts (automated)
- Microsoft Dynamics (automated)
- Payroll Tax System (automated)
- Employee Location DB (automated)
- Security Clearance Registry (automated)
- i-Time System (automated)
- Robot Salary (manual input)
- Resource Plans (manual input)
- Rate Cards (manual input)

## API Endpoints
### Employees
- `GET /api/employees` - List all
- `GET /api/employees/:id` - Get single
- `POST /api/employees` - Create
- `PATCH /api/employees/:id` - Update
- `DELETE /api/employees/:id` - Delete
- `GET /api/employees/:id/onboarding` - Get onboarding steps
- `POST /api/employees/:id/onboarding` - Add onboarding step

### Projects
- `GET /api/projects` - List all
- `GET /api/projects/:id` - Get single
- `POST /api/projects` - Create
- `PATCH /api/projects/:id` - Update
- `DELETE /api/projects/:id` - Delete
- `GET /api/projects/:id/summary` - Get aggregated project summary

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

### Dashboard Aggregates
- `GET /api/dashboard/summary` - Overall KPI summary
- `GET /api/dashboard/finance` - Finance breakdown by month
- `GET /api/dashboard/utilization` - Resource utilization summary

## Frontend Routes
- `/` - Main Dashboard
- `/finance` - Finance Dashboard
- `/utilization` - Utilization Dashboard
- `/projects` - Projects list
- `/projects/:id` - Project detail
- `/resources` - Employees/Resources
- `/rate-cards` - Rate Cards
- `/resource-plans` - Resource Plans
- `/timesheets` - Timesheets
- `/costs` - Costs
- `/milestones` - Milestones
- `/forecasts` - Forecasts
- `/onboarding` - Person Onboarding
- `/data-sources` - Data Sources

## Deployment
- Designed for Azure deployment (not Replit hosting)
- Production-grade data model with proper relationships and constraints
