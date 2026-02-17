# FinanceHub - Project Finance Management

A production-grade financial and project management application that consolidates data from multiple sources. Tracks project burn rates, resource utilization, and financial forecasts with proper workflows. Matches Excel data structure with pipeline classifications, VAT categories, billing types, and Australian FY format. Designed for Azure deployment.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, Tailwind CSS, shadcn/ui, wouter, TanStack Query |
| Backend | Express.js, Node.js, express-session |
| Database | PostgreSQL (dev) / Azure SQL MSSQL (prod) via Knex.js |
| Authentication | Session-based with bcryptjs password hashing |
| Charts | Recharts (Pie, Area, Bar) |
| AI | OpenAI via Replit AI Integrations (SSE streaming) |
| Styling | shadcn/ui components, dark/light theme |

## Key Concepts

- **Australian Financial Year** - Runs Jul to Jun, formatted as "25-26" (FY2025-26)
- **Pipeline Classifications** - C (100%), S (80%), DVF (50%), DF (30%), Q (15%), A (5%) win probabilities
- **Risk Ratings** - Low (C, S = 80-100%), Medium (DVF, DF = 30-50%), High (Q, A = 5-15%)
- **VAT Categories** - Growth, VIC, DAFF, Emerging, DISR, SAU
- **Billing Types** - Fixed (Fixed Price), T&M (Time & Materials), LH (Labour Hire)
- **Monthly Breakdown** - M1 = Jul through M12 = Jun, with Revenue, Cost, and Profit per month
- **GM (Gross Margin)** - Displayed as both dollar amount (GM $) and percentage (GM %)
- **RAG Indicators** - Red/Amber/Green status dots for target tracking against forecasts
- **Milestone Types** - Payment Invoice (with invoice status tracking) and Delivery Milestone (with timesheet integration)

## Features

### Authentication & Access Control
- **User Authentication** - Login and registration with session-based authentication
- **Role-Based Access** - Admin and user roles with server-side guards
- **Session Management** - PostgreSQL-backed sessions via connect-pg-simple
- **Default Admin** - Pre-seeded admin account (admin/admin123) for initial setup

### Dashboards
- **Main Dashboard** - KPI summary cards with RAG indicators, interactive charts (Revenue by Billing Type, Pipeline by Classification, Monthly Trend, Project Margin vs Target), target tracking with progress bars, monthly snapshot table
- **Finance Dashboard** - Client summary with Q1-Q4 quarterly breakdown, YTD financials (Revenue/Cost/GP/GP%), column toggles, RAG indicators on GP%, VAT category breakdown, billing type split
- **Utilization Dashboard** - Rolling 13-week forward resource utilization view (based on resource plan allocations), color-coded utilization percentages (green >80%, amber 50-80%, red <50%), bench time KPI tracking, capacity summary row, resource utilization actuals with billable ratios and project hours

### Management
- **Projects (Job Status)** - Excel-style view with filters (VAT, Billing, Status), column toggles, expandable monthly R/C/P details, A/D status tracking, work order/actual/balance/forecast, RAG indicators on margin and balance
- **Resources (Staff SOT)** - Schedule of Tasks with JID, Cost Band, Staff Type, Base/Gross Cost rates, Payroll Tax, schedule dates, team assignments, column toggles, RAG indicators on gross cost and schedule dates
- **Rate Cards** - Role-based billing rates with effective dates

### Operations
- **Resource Plans** - Project-resource allocation by month
- **Timesheets** - Time entry tracking with source integration (manual, iTimesheets, Dynamics)
- **Costs** - Tracking by category (resource, R&D, overhead, subcontractor, travel)
- **Milestones & Invoices** - Tabbed view with All, Payment Invoices, and Delivery Milestones. Payment invoices track status (Draft/Sent/Paid/Overdue) with payment totals and paid amounts. Delivery milestones integrate with timesheet data. Summary KPI cards for financial tracking.

### Pipeline & Forecasting
- **Pipeline** - Sales pipeline with VAT category summary table (revenue/cost/GM by VAT), risk status aggregation table (Low/Medium/High with opportunity counts and weighted values), GM $ and GM % columns, billing type column, classification summary cards (C/S/DVF/DF/Q/A), opportunity table with M1-M12 revenue, column toggles, RAG indicators, classification and VAT filtering, weighted pipeline KPIs
- **What-If Scenarios** - FY period selector from reference data, what-if analysis by risk rating with color-coded labels (green/amber/red), interactive win rate sliders (0-100%), real-time weighted revenue/GP calculations, raw vs weighted revenue comparison, revenue and margin goal tracking, presets (Conservative/Base/Optimistic), scenario save/load
- **Forecasts & Variance Analysis** - Toggle between standard forecasts and variance analysis view. Variance analysis compares forecast vs actual by project with revenue/cost/margin variance and percentage calculations. Color-coded positive/negative indicators.

### Administration
- **Reference Data Management** - Admin-only page for managing system reference data across four categories: VAT categories, company goals, billing types, and FY periods. Full CRUD operations with sortable table display.
- **AI Insights** - AI-powered analysis with SSE streaming: pipeline health assessment, project status review, executive overview summaries

### Other
- **Data Sources** - External system monitoring (Employment Hero, iTimesheets, SharePoint, VAGO, Dynamics, Payroll Tax)
- **Dark/Light Theme** - Full dark mode support across all pages

## External Data Sources

| Source | Type | Sync Frequency |
|--------|------|---------------|
| Employment Hero | API | Daily |
| iTimesheets | API | Daily |
| SharePoint | API | Hourly |

## Project Structure

```
client/
  src/
    pages/             # 17+ page components (dashboard, pipeline, admin, etc.)
    components/        # AppSidebar (role-aware), ThemeProvider, UI components
    hooks/             # use-auth (session auth), use-toast, use-mobile
    lib/               # Query client, utilities
  index.html
server/
  index.ts             # Express server entry with session middleware
  routes.ts            # REST API endpoints + auth routes + admin guards
  storage.ts           # Database CRUD layer (IStorage interface via Knex)
  seed.ts              # Demo data seeding (projects, employees, pipeline, admin user, reference data)
  db.ts                # Knex database connection + incremental migrations
shared/
  schema.ts            # Zod data models + insert/select types
  models/
    chat.ts            # AI conversation schema
scripts/
  sync-to-github.ts    # GitHub sync utility via Octokit API
```

## Database Schema

### Core Tables
| Table | Description |
|-------|-------------|
| `users` | User accounts with hashed passwords and roles (admin/user) |
| `employees` | Staff records with cost bands, staff types, rates, teams, schedules |
| `projects` | Project records with client codes, billing categories, VAT, financial tracking |
| `project_monthly` | Monthly revenue/cost/profit breakdown (M1-M12) per project per FY |
| `pipeline_opportunities` | Sales pipeline with classifications, VAT, billing types, M1-M12 revenue/GP |
| `milestones` | Project milestones with type (payment/delivery) and invoice status tracking |
| `scenarios` | What-if scenario definitions with base revenue/margin |
| `scenario_adjustments` | Per-classification win rate adjustments for scenarios |
| `reference_data` | Admin-managed reference data (VAT categories, company goals, billing types, FY periods) |

### Supporting Tables
| Table | Description |
|-------|-------------|
| `rate_cards` | Role-based billing rates with effective dates |
| `resource_plans` | Project-resource allocation percentages by month |
| `timesheets` | Time entries with source tracking (manual, iTimesheets, Dynamics) |
| `costs` | Cost entries by category (resource, R&D, overhead, subcontractor, travel) |
| `kpis` | Key performance indicator records |
| `forecasts` | Revenue/cost/margin forecasts by project and period |
| `data_sources` | External system sync status and configuration |
| `onboarding_steps` | Employee onboarding workflow tracking (table preserved, UI removed) |
| `conversations` / `messages` | AI chat conversation history |
| `session` | PostgreSQL session store (connect-pg-simple) |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with username/password |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Get current authenticated user |

### Core Resources
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List all employees |
| POST | `/api/employees` | Create employee |
| PATCH | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee |
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/:id/summary` | Aggregated project summary |

### Financial Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/project-monthly` | Monthly R/C/P breakdown (supports `?projectId=`) |
| GET | `/api/pipeline-opportunities` | Pipeline data (supports `?classification=`, `?vat=`) |
| POST | `/api/pipeline-opportunities` | Create opportunity (includes billingType) |
| DELETE | `/api/pipeline-opportunities/:id` | Delete opportunity |
| GET | `/api/rate-cards` | Billing rate cards |
| GET | `/api/kpis` | KPI metrics |
| GET | `/api/costs` | Cost entries |
| GET | `/api/forecasts` | Forecast data |
| GET | `/api/milestones` | Milestones (supports milestoneType, invoiceStatus) |

### Scenarios
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scenarios` | List all scenarios |
| POST | `/api/scenarios` | Create scenario |
| GET | `/api/scenarios/:id` | Get scenario with adjustments |
| DELETE | `/api/scenarios/:id` | Delete scenario |
| POST | `/api/scenarios/:id/adjustments` | Add adjustment |
| DELETE | `/api/scenario-adjustments/:id` | Delete adjustment |

### Reference Data (Admin Only for Mutations)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reference-data` | List all (supports `?category=` filter) |
| POST | `/api/reference-data` | Create reference data (admin only) |
| PATCH | `/api/reference-data/:id` | Update reference data (admin only) |
| DELETE | `/api/reference-data/:id` | Delete reference data (admin only) |

### Dashboard Aggregates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Overall KPI summary |
| GET | `/api/dashboard/finance` | Finance breakdown by month |
| GET | `/api/dashboard/utilization` | Resource utilization summary |

### AI Insights
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/insights` | Generate AI analysis (SSE streaming). Body: `{ type: "pipeline" \| "projects" \| "overview" }` |

## Frontend Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | KPIs, charts, target tracking, monthly snapshot |
| `/finance` | Finance | Client summary, VAT breakdown, billing split |
| `/utilization` | Utilization | Rolling 13-week view, bench time, capacity summary |
| `/projects` | Job Status | Project list with financial tracking |
| `/projects/:id` | Project Detail | Individual project view |
| `/resources` | Staff SOT | Employee schedule and cost data |
| `/pipeline` | Pipeline | VAT summary, risk status, GM $/%,  billing type, classification cards |
| `/scenarios` | What-If | FY period selection, risk rating view, win rate sliders |
| `/rate-cards` | Rate Cards | Billing rate management |
| `/resource-plans` | Resource Plans | Resource allocation |
| `/timesheets` | Timesheets | Time entry tracking |
| `/costs` | Costs | Cost management |
| `/milestones` | Milestones & Invoices | Payment invoice / delivery milestone tabs |
| `/forecasts` | Forecasts & Variance | Forecast list and variance analysis toggle |
| `/data-sources` | Data Sources | External system monitoring |
| `/ai-insights` | AI Insights | AI-powered analysis (pipeline, projects, overview) |
| `/admin` | Reference Data | Admin-only reference data management |

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
- **Admin**: username `admin`, password `admin123`
- Admin users can access the Reference Data Management page and perform CRUD operations on system reference data.

### Database
The application uses Knex.js with PostgreSQL. On first startup, it automatically:
1. Creates all required tables via incremental migrations
2. Seeds demo data: 5 projects, 9 employees, 15 pipeline opportunities, 2 scenarios, 60 monthly financial records, 16 reference data records, and 1 admin user

### GitHub Sync
To sync the codebase to GitHub:
```bash
npx tsx scripts/sync-to-github.ts
```
Requires a configured GitHub connection via Replit's integration system.

## Deployment

- Designed for Azure deployment with Azure SQL Database (MSSQL) in production
- Knex.js configured for dual database support: PostgreSQL (development) and MSSQL (production)
- Session-based authentication with secure cookie configuration for production environments
- Production-grade data model with proper relationships and constraints

## License

Private - All rights reserved.
