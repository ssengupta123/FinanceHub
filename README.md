# FinanceHub - Project Finance Management

A production-grade financial and project management application that consolidates data from multiple sources. Tracks project burn rates, resource utilization, and financial forecasts with proper workflows. Matches Excel data structure with pipeline classifications, VAT categories, billing types, and Australian FY format.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, Tailwind CSS, shadcn/ui, wouter, TanStack Query |
| Backend | Express.js, Node.js |
| Database | PostgreSQL with Drizzle ORM |
| Charts | Recharts (Pie, Area, Bar) |
| Styling | shadcn/ui components, dark/light theme |

## Key Concepts

- **Australian Financial Year** - Runs Jul to Jun, formatted as "25-26" (FY2025-26)
- **Pipeline Classifications** - C (100%), S (80%), DVF (50%), DF (30%), Q (15%), A (5%) win probabilities
- **VAT Categories** - Growth, VIC, DAFF, Emerging, DISR, SAU
- **Billing Types** - Fixed (Fixed Price), T&M (Time & Materials)
- **Monthly Breakdown** - M1 = Jul through M12 = Jun, with Revenue, Cost, and Profit per month
- **RAG Indicators** - Red/Amber/Green status dots for target tracking against forecasts

## Features

### Dashboards
- **Main Dashboard** - KPI summary cards with RAG indicators, interactive charts (Revenue by Billing Type, Pipeline by Classification, Monthly Trend, Project Margin vs Target), target tracking with progress bars, monthly snapshot table
- **Finance Dashboard** - Client summary with Q1-Q4 quarterly breakdown, YTD financials (Revenue/Cost/GP/GP%), column toggles, RAG indicators on GP%, VAT category breakdown, billing type split
- **Utilization Dashboard** - Resource utilization rates, billable ratios, project hours tracking

### Management
- **Projects (Job Status)** - Excel-style view with filters (VAT, Billing, Status), column toggles, expandable monthly R/C/P details, A/D status tracking, work order/actual/balance/forecast, RAG indicators on margin and balance
- **Resources (Staff SOT)** - Schedule of Tasks with JID, Cost Band, Staff Type, Base/Gross Cost rates, Payroll Tax, schedule dates, team assignments, column toggles, RAG indicators on gross cost and schedule dates
- **Rate Cards** - Role-based billing rates with effective dates

### Operations
- **Resource Plans** - Project-resource allocation by month
- **Timesheets** - Time entry tracking with source integration (manual, iTimesheets)
- **Costs** - Tracking by category (resource, R&D, overhead, subcontractor, travel)
- **Milestones** - Project milestone tracking with status updates

### Pipeline & Forecasting
- **Pipeline** - Sales pipeline with classification summary cards, opportunity table with M1-M12 revenue, column toggles, RAG indicators, classification and VAT filtering
- **What-If Scenarios** - Interactive win rate sliders (0-100%), real-time weighted revenue/GP calculations, revenue and margin goal tracking, presets (Conservative/Base/Optimistic), scenario save/load
- **Forecasts** - Revenue, cost, and utilization forecasting

### Other
- **Person Onboarding** - Step-by-step onboarding workflow with progress tracking
- **Data Sources** - External system monitoring (Employment Hero, iTimesheets, SharePoint)
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
    pages/           # 16+ page components
    components/      # AppSidebar, ThemeProvider, UI components
    hooks/           # Custom React hooks
    lib/             # Query client, utilities
  index.html
server/
  index.ts           # Express server entry
  routes.ts          # REST API endpoints
  storage.ts         # Database CRUD layer
  seed.ts            # Demo data seeding
  db.ts              # Database connection
shared/
  schema.ts          # Drizzle ORM data models
```

## API Endpoints

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
| GET | `/api/rate-cards` | Billing rate cards |
| GET | `/api/kpis` | KPI metrics |
| GET | `/api/costs` | Cost entries |
| GET | `/api/forecasts` | Forecast data |

### Scenarios
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scenarios` | List all scenarios |
| POST | `/api/scenarios` | Create scenario |
| GET | `/api/scenarios/:id` | Get scenario with adjustments |
| POST | `/api/scenarios/:id/adjustments` | Add adjustment |

### Dashboard Aggregates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Overall KPI summary |
| GET | `/api/dashboard/finance` | Finance breakdown by month |
| GET | `/api/dashboard/utilization` | Resource utilization summary |

## Frontend Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | KPIs, charts, target tracking, monthly snapshot |
| `/finance` | Finance | Client summary, VAT breakdown, billing split |
| `/utilization` | Utilization | Resource utilization metrics |
| `/projects` | Job Status | Project list with financial tracking |
| `/projects/:id` | Project Detail | Individual project view |
| `/resources` | Staff SOT | Employee schedule and cost data |
| `/pipeline` | Pipeline | Sales opportunities by classification |
| `/scenarios` | What-If | Interactive scenario modeling |
| `/rate-cards` | Rate Cards | Billing rate management |
| `/resource-plans` | Resource Plans | Resource allocation |
| `/timesheets` | Timesheets | Time entry tracking |
| `/costs` | Costs | Cost management |
| `/milestones` | Milestones | Milestone tracking |
| `/forecasts` | Forecasts | Revenue/cost forecasting |
| `/onboarding` | Onboarding | Employee onboarding workflow |
| `/data-sources` | Data Sources | External system monitoring |

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

### Database
The application uses Drizzle ORM with PostgreSQL. On first startup, it automatically seeds demo data including 5 projects, 9 employees, 15 pipeline opportunities, 2 scenarios, and 60 monthly financial records.

## Deployment

Designed for Azure deployment with a production-grade data model featuring proper relationships and constraints.

## License

Private - All rights reserved.
