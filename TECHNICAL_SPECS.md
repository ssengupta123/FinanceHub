# FinanceHub - Technical Specification

This document is a complete technical reference for anyone supporting, maintaining, or extending the FinanceHub application. It describes every layer of the system, where each piece lives, and what to change for common tasks.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Directory Structure](#2-directory-structure)
3. [Database Schema](#3-database-schema)
4. [Backend: Server Layer](#4-backend-server-layer)
5. [Frontend: Client Layer](#5-frontend-client-layer)
6. [Data Flow](#6-data-flow)
7. [Business Logic & Domain Rules](#7-business-logic--domain-rules)
8. [RAG (Red/Amber/Green) Indicators](#8-rag-redambergreen-indicators)
9. [Charts & Visualizations](#9-charts--visualizations)
10. [Column Toggle System](#10-column-toggle-system)
11. [Seed Data](#11-seed-data)
12. [Environment & Configuration](#12-environment--configuration)
13. [Common Support Tasks (Where to Change What)](#13-common-support-tasks-where-to-change-what)
14. [Dependency Reference](#14-dependency-reference)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│   React + Vite SPA (port 5000)                          │
│   wouter routing, TanStack Query, recharts, shadcn/ui   │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP (same origin, no proxy)
┌───────────────────────▼─────────────────────────────────┐
│                  Express.js Server                       │
│   server/index.ts  →  server/routes.ts                   │
│                       ↓                                  │
│              server/storage.ts (IStorage interface)       │
│                       ↓                                  │
│              server/db.ts (Drizzle ORM + pg Pool)         │
└───────────────────────┬─────────────────────────────────┘
                        │ SQL via pg driver
┌───────────────────────▼─────────────────────────────────┐
│                  PostgreSQL (Neon)                        │
│   Connection: DATABASE_URL env var                       │
│   Schema pushed via: npm run db:push                     │
└─────────────────────────────────────────────────────────┘
```

The application is a monolith. The Express server serves both the REST API (`/api/*`) and the Vite-built React frontend on the same port (5000). In development, Vite's dev server middleware is attached to the Express HTTP server. In production, pre-built static files are served.

---

## 2. Directory Structure

```
/
├── client/                         # Frontend source
│   ├── src/
│   │   ├── App.tsx                 # Root component, routing, layout shell
│   │   ├── main.tsx                # React entry point
│   │   ├── index.css               # Tailwind base styles, CSS variables, theme
│   │   ├── components/
│   │   │   ├── app-sidebar.tsx     # Navigation sidebar (5 groups, 16 items)
│   │   │   ├── theme-provider.tsx  # Dark/light theme context
│   │   │   ├── theme-toggle.tsx    # Theme switch button
│   │   │   └── ui/                 # shadcn/ui primitives (button, card, table, etc.)
│   │   ├── hooks/
│   │   │   └── use-toast.ts        # Toast notification hook
│   │   ├── lib/
│   │   │   ├── queryClient.ts      # TanStack Query setup, apiRequest helper
│   │   │   └── utils.ts            # cn() class merger utility
│   │   └── pages/                  # One file per page (see Section 5)
│   └── index.html                  # HTML shell
│
├── server/
│   ├── index.ts                    # Express app setup, middleware, startup
│   ├── routes.ts                   # All API route handlers
│   ├── storage.ts                  # IStorage interface + DatabaseStorage class
│   ├── db.ts                       # Database connection pool
│   ├── seed.ts                     # Demo data seeder
│   ├── vite.ts                     # Vite dev server integration (DO NOT MODIFY)
│   └── static.ts                   # Production static file serving
│
├── shared/
│   └── schema.ts                   # Drizzle ORM table definitions + Zod schemas + types
│
├── drizzle.config.ts               # Drizzle Kit config (DO NOT MODIFY)
├── package.json                    # Dependencies and scripts
├── tailwind.config.ts              # Tailwind configuration
├── tsconfig.json                   # TypeScript configuration
└── vite.config.ts                  # Vite bundler config (DO NOT MODIFY)
```

---

## 3. Database Schema

All tables are defined in `shared/schema.ts`. The database uses auto-incrementing `serial` integer primary keys throughout.

### 3.1 Table Reference

| Table | File Location | Primary Purpose | Key Relationships |
|-------|--------------|-----------------|-------------------|
| `employees` | schema.ts:6 | Staff records with cost rates, schedules, security clearance | Parent of: resource_plans, timesheets, onboarding_steps |
| `projects` | schema.ts:39 | Project records with financial tracking fields | Parent of: project_monthly, resource_plans, timesheets, costs, kpis, forecasts, milestones |
| `project_monthly` | schema.ts:83 | Monthly R/C/P breakdown per project per FY | FK: projectId → projects |
| `rate_cards` | schema.ts:98 | Billing rates by role/grade/location | Standalone |
| `resource_plans` | schema.ts:114 | Monthly resource allocation per project/employee | FK: projectId → projects, employeeId → employees |
| `timesheets` | schema.ts:128 | Weekly time entries | FK: projectId → projects, employeeId → employees |
| `costs` | schema.ts:149 | Cost entries by category | FK: projectId → projects |
| `kpis` | schema.ts:164 | Monthly KPI metrics per project | FK: projectId → projects |
| `pipeline_opportunities` | schema.ts:185 | Sales pipeline with M1-M12 revenue/GP columns | Standalone |
| `scenarios` | schema.ts:221 | What-If scenario definitions | Parent of: scenario_adjustments |
| `scenario_adjustments` | schema.ts:235 | Per-opportunity adjustments within a scenario | FK: scenarioId → scenarios, opportunityId → pipeline_opportunities |
| `forecasts` | schema.ts:251 | Revenue/cost/utilization forecasts | FK: projectId → projects |
| `milestones` | schema.ts:267 | Project milestones with amounts | FK: projectId → projects |
| `data_sources` | schema.ts:281 | External system connection tracking | Standalone |
| `onboarding_steps` | schema.ts:296 | Employee onboarding workflow steps | FK: employeeId → employees |
| `users` | schema.ts:310 | Application users (auth) | Standalone |

### 3.2 Key Column Details

#### employees (schema.ts:6-33)
| Column | Type | Notes |
|--------|------|-------|
| employeeCode | varchar(50) | Unique identifier (e.g., "EMP001") |
| costBandLevel | text | Cost band (C1-C5 Consultant, E1-E4 Engineer) |
| staffType | text | "Consultant", "Engineer", "Contractor" |
| baseCost | numeric(10,2) | Daily base cost rate in AUD |
| grossCost | numeric(10,2) | Daily gross cost rate including overheads |
| payrollTax | boolean | Whether payroll tax applies |
| payrollTaxRate | numeric(5,4) | Rate as decimal (e.g., 0.0485 = 4.85%) |
| scheduleStart/End | date | FY assignment period |
| team | text | Team code (e.g., "CSD") |
| jid | text | Job ID reference |
| onboardingStatus | text | "not_started", "in_progress", "completed" |

#### projects (schema.ts:39-77)
| Column | Type | Notes |
|--------|------|-------|
| projectCode | varchar(50) | Unique (e.g., "PRJ-DEF-001") |
| billingCategory | text | "Fixed" or "T&M" |
| vat | text | VAT category: Growth, VIC, DAFF, Emerging, DISR, SAU |
| pipelineStatus | text | Classification: C, S, DVF, DF, Q, A |
| adStatus | text | "Active", "Closed", "Pipeline" |
| workOrderAmount | numeric(14,2) | Total contracted amount |
| actualAmount | numeric(14,2) | Amount spent to date |
| balanceAmount | numeric(14,2) | workOrderAmount - actualAmount |
| forecastedRevenue | numeric(14,2) | Expected total revenue |
| soldGmPercent | numeric(8,4) | Sold gross margin as decimal |
| toDateGmPercent | numeric(8,4) | Current gross margin as decimal |
| forecastGmPercent | numeric(8,4) | Forecasted gross margin as decimal |

#### pipeline_opportunities (schema.ts:185-215)
Has 12 monthly revenue columns (`revenueM1` through `revenueM12`) and 12 monthly gross profit columns (`grossProfitM1` through `grossProfitM12`), all numeric(14,2) defaulting to "0". M1=Jul, M12=Jun per Australian FY.

#### project_monthly (schema.ts:83-92)
| Column | Type | Notes |
|--------|------|-------|
| month | integer | 1-12 where 1=Jul, 12=Jun |
| monthLabel | text | Display label (e.g., "Jul", "Aug") |
| fyYear | text | Financial year (e.g., "25-26") |
| revenue/cost/profit | numeric(14,2) | Monthly figures |

### 3.3 Cascade Deletes

All foreign key relationships use `onDelete: "cascade"`. Deleting a project will automatically remove all its monthly records, resource plans, timesheets, costs, KPIs, forecasts, and milestones.

### 3.4 Schema Changes

To modify the database schema:
1. Edit `shared/schema.ts`
2. Run `npm run db:push` to sync changes to PostgreSQL
3. NEVER change primary key column types (serial to varchar or vice versa)
4. If `db:push` fails, use `npm run db:push --force`

### 3.5 Type System

Each table has three exported types:
```
insertXxxSchema   →  Zod schema for validated inserts (auto-generated fields omitted)
InsertXxx         →  TypeScript type inferred from insert schema
Xxx               →  TypeScript type for SELECT results (all columns)
```

---

## 4. Backend: Server Layer

### 4.1 Entry Point (server/index.ts)

Startup sequence:
1. Create Express app + HTTP server
2. Attach JSON body parser (with rawBody capture)
3. Attach URL-encoded parser
4. Attach request logger (logs all `/api/*` requests with timing)
5. Run `seedDatabase()` (idempotent, checks for existing data)
6. Register API routes via `registerRoutes()`
7. Attach error handler middleware
8. In development: attach Vite dev server. In production: serve static files
9. Listen on `process.env.PORT` (default 5000) on `0.0.0.0`

### 4.2 API Routes (server/routes.ts)

All routes follow a consistent pattern:

- **GET list**: Fetch all records, with optional query param filtering
- **GET by id**: Fetch single record, return 404 if not found
- **POST**: Validate body with Zod insert schema, create via storage
- **PATCH by id**: Partial update, return 404 if not found
- **DELETE by id**: Delete, return `{ success: true }`

Route groups and their line numbers in `server/routes.ts`:

| Route Group | Lines | Query Params |
|-------------|-------|-------------|
| Employees | 29-52 | None |
| Projects | 55-78 | None |
| Rate Cards | 81-99 | None |
| Resource Plans | 102-128 | `?projectId=`, `?employeeId=` |
| Timesheets | 131-157 | `?projectId=`, `?employeeId=` |
| Costs | 160-177 | `?projectId=` |
| KPIs | 180-193 | `?projectId=` |
| Forecasts | 196-209 | `?projectId=` |
| Milestones | 212-234 | `?projectId=` |
| Data Sources | 237-251 | None |
| Onboarding Steps | 254-268 | Via URL: `/api/employees/:id/onboarding` |
| Dashboard Summary | 271-274 | None |
| Finance Dashboard | 275-278 | None |
| Utilization Summary | 279-282 | None |
| Project Summary | 283-287 | Via URL: `/api/projects/:id/summary` |
| Project Monthly | 290-303 | `?projectId=` |
| Pipeline Opportunities | 306-327 | `?classification=`, `?vat=` |
| Scenarios | 330-348 | None |
| Scenario Adjustments | 351-360 | Via URL: `/api/scenarios/:id/adjustments` |

### 4.3 Storage Layer (server/storage.ts)

The `IStorage` interface (lines 54-202) defines all available data operations. The `DatabaseStorage` class implements it using Drizzle ORM queries.

Key aggregation methods:

| Method | Returns | Data Sources |
|--------|---------|-------------|
| `getDashboardSummary()` | totalProjects, totalEmployees, totalRevenue, totalCosts | COUNT on projects/employees, SUM on kpis.revenue and costs.amount |
| `getProjectSummary(id)` | project + totalRevenue, totalCosts, avgMarginPercent, avgUtilization | Joins kpis + costs for the given project |
| `getFinanceDashboard()` | Array of {month, revenue, cost} | Groups kpis by month + groups costs by month, merges |
| `getUtilizationSummary()` | Array of {employeeId, planned, actual, utilization} | Groups resource_plans by employee + groups timesheets by employee |

The storage singleton is exported at line 776: `export const storage = new DatabaseStorage()`

### 4.4 Database Connection (server/db.ts)

```typescript
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

Connection is via the `DATABASE_URL` environment variable. Uses `pg` driver with Drizzle ORM wrapper.

---

## 5. Frontend: Client Layer

### 5.1 App Shell (client/src/App.tsx)

The root component wraps the app in:
```
ThemeProvider → QueryClientProvider → TooltipProvider → SidebarProvider
```

Layout structure:
- Left: `AppSidebar` (collapsible, 16rem width)
- Right: Header bar (sidebar trigger + theme toggle) + main content area
- The `<Router />` component renders page components via wouter `<Switch>`

### 5.2 Navigation (client/src/components/app-sidebar.tsx)

Five navigation groups, each with 3 items:

| Group | Items |
|-------|-------|
| Overview | Dashboard (/), Finance (/finance), Utilization (/utilization) |
| Management | Projects (/projects), Resources (/resources), Rate Cards (/rate-cards) |
| Operations | Resource Plans (/resource-plans), Timesheets (/timesheets), Costs (/costs) |
| Pipeline & Forecast | Pipeline (/pipeline), What-If Scenarios (/scenarios), Forecasts (/forecasts) |
| Tracking | Milestones (/milestones), Onboarding (/onboarding), Data Sources (/data-sources) |

To add a new navigation item, add it to the `navGroups` array (line 33), import an icon from lucide-react, and register the route in App.tsx.

### 5.3 Page Files

| Page File | Route | Data Queries | Key Features |
|-----------|-------|-------------|--------------|
| `dashboard.tsx` | `/` | projects, employees, kpis, pipeline-opportunities, project-monthly | KPI cards with RAG borders, 4 recharts (2 pie, 1 area, 1 bar), target tracking progress bars, monthly snapshot table |
| `finance.tsx` | `/finance` | projects, project-monthly, pipeline-opportunities | Client summary table with Q1-Q4, YTD columns, column toggles, RAG dots on GP%, VAT breakdown, billing split |
| `utilization.tsx` | `/utilization` | dashboard/utilization, employees | Resource utilization cards and table |
| `projects.tsx` | `/projects` | projects, project-monthly | Job status table with filters (VAT, billing, status), column toggles, expandable monthly R/C/P rows, RAG dots on margin, RAG colors on balance |
| `project-detail.tsx` | `/projects/:id` | projects/:id/summary, project-monthly?projectId, kpis?projectId, costs?projectId, milestones?projectId | Single project deep-dive with KPIs, monthly breakdown, costs, milestones |
| `resources.tsx` | `/resources` | employees | Staff SOT table with column toggles, summary cards, RAG dots on gross cost and schedule dates |
| `pipeline.tsx` | `/pipeline` | pipeline-opportunities | Classification summary cards, opportunity table with M1-M12, column toggles, RAG dots, classification/VAT filters |
| `scenarios.tsx` | `/scenarios` | scenarios, pipeline-opportunities | Win rate sliders, weighted revenue/GP calculation, goal tracking, presets, scenario CRUD |
| `rate-cards.tsx` | `/rate-cards` | rate-cards | Rate card table with create/edit/delete |
| `resource-plans.tsx` | `/resource-plans` | resource-plans, employees, projects | Allocation table with create form |
| `timesheets.tsx` | `/timesheets` | timesheets, employees, projects | Time entry table with create form |
| `costs.tsx` | `/costs` | costs, projects | Cost table with category filters and create form |
| `milestones.tsx` | `/milestones` | milestones, projects | Milestone table with status tracking |
| `forecasts.tsx` | `/forecasts` | forecasts, projects | Forecast table with create form |
| `onboarding.tsx` | `/onboarding` | employees | Employee list with onboarding progress |
| `data-sources.tsx` | `/data-sources` | data-sources | External system sync status cards |

### 5.4 Data Fetching (client/src/lib/queryClient.ts)

All data fetching uses TanStack Query v5 with a global `queryFn`:
- Queries use `queryKey` as the URL path: `useQuery({ queryKey: ['/api/projects'] })`
- For filtered queries: `queryKey: ['/api/project-monthly', `?projectId=${id}`]`
- Default settings: `staleTime: Infinity`, `refetchOnWindowFocus: false`, no retry
- Mutations use `apiRequest(method, url, body)` helper and must invalidate cache via `queryClient.invalidateQueries({ queryKey: [...] })`

### 5.5 Theme System

- `ThemeProvider` (theme-provider.tsx) manages "light"/"dark" state with localStorage persistence
- Toggled via `ThemeToggle` button in the header
- CSS variables defined in `client/src/index.css` under `:root` and `.dark` classes
- All components use Tailwind's `dark:` variant for dark mode

---

## 6. Data Flow

### Read Path (e.g., loading the Dashboard)
```
1. Page mounts → useQuery({ queryKey: ['/api/projects'] })
2. TanStack Query calls default queryFn → fetch('/api/projects')
3. Express routes.ts matches GET /api/projects
4. Route handler calls storage.getProjects()
5. DatabaseStorage runs: db.select().from(projects)
6. Drizzle ORM generates SQL → pg Pool executes against PostgreSQL
7. Results flow back: PostgreSQL → pg → Drizzle → storage → route → Express → fetch → useQuery → React render
```

### Write Path (e.g., creating a project)
```
1. Form submit → apiRequest('POST', '/api/projects', formData)
2. Express routes.ts matches POST /api/projects
3. Route validates body: insertProjectSchema.safeParse(req.body)
4. If valid: storage.createProject(parsed.data)
5. DatabaseStorage runs: db.insert(projects).values(data).returning()
6. Result returned to client
7. Client calls queryClient.invalidateQueries({ queryKey: ['/api/projects'] })
8. TanStack Query refetches and React re-renders
```

---

## 7. Business Logic & Domain Rules

### 7.1 Australian Financial Year
- FY runs July 1 to June 30
- M1=Jul, M2=Aug, M3=Sep, M4=Oct, M5=Nov, M6=Dec, M7=Jan, M8=Feb, M9=Mar, M10=Apr, M11=May, M12=Jun
- FY format: "25-26" means FY2025-26 (Jul 2025 to Jun 2026)
- Quarters: Q1=Jul-Sep (M1-M3), Q2=Oct-Dec (M4-M6), Q3=Jan-Mar (M7-M9), Q4=Apr-Jun (M10-M12)

### 7.2 Pipeline Classifications (Win Probability)
| Code | Name | Win Probability |
|------|------|----------------|
| C | Contracted | 100% |
| S | Selected | 80% |
| DVF | Shortlisted (Down to Very Few) | 50% |
| DF | Submitted (Down to Few) | 30% |
| Q | Qualified | 15% |
| A | Activity | 5% |

These are used in the Pipeline page and What-If Scenarios to calculate weighted revenue.

### 7.3 VAT Categories
Growth, VIC, DAFF, Emerging, DISR, SAU. These are organizational groupings for reporting and filtering.

### 7.4 Billing Types
- **Fixed** (Fixed Price) - Billed against contracted amount
- **T&M** (Time & Materials) - Billed by hours/days at agreed rates

### 7.5 Cost Categories
resource, rd (R&D), overhead, subcontractor, travel

### 7.6 Currency Formatting
Defined in dashboard.tsx `formatCurrency()`:
- Values >= $1M shown as "$X.XM"
- Values >= $1K shown as "$XK"
- Below $1K shown as whole dollars

### 7.7 Margin & Percentage Formatting
Percentages stored as decimals (0.20 = 20%). The `formatPercent()` helper multiplies by 100 for display.

---

## 8. RAG (Red/Amber/Green) Indicators

RAG indicators appear across multiple pages. The logic is defined per page.

### 8.1 Dashboard KPIs (dashboard.tsx)
| KPI | Target | Green | Amber | Red |
|-----|--------|-------|-------|-----|
| Revenue | $5,000,000 | >= target | >= 80% of target | < 80% of target |
| Margin | 20% | >= 20% | >= 10% (80% of 20%) | < 10% |
| Utilization | 85% | >= 85% | >= 68% (80% of 85%) | < 68% |

KPI cards get colored borders via `ragBg()`. Individual dots use the `<RagDot>` component.

### 8.2 Projects Page (projects.tsx)
- **Margin column**: RAG dot based on `forecastGmPercent` vs 0.20 target
- **Balance column**: RAG text color (green if balance > 50% of work order, amber 20-50%, red < 20%)

### 8.3 Finance Page (finance.tsx)
- **GP% column**: RAG dot comparing GP% to 20% target

### 8.4 Resources Page (resources.tsx)
- **Gross Cost**: RAG dot (green if < $600, amber $600-$750, red > $750)
- **Schedule End Date**: RAG dot (green if > 6 months away, amber 3-6 months, red < 3 months)

### 8.5 Pipeline Page (pipeline.tsx)
- **Total Revenue**: RAG dot (green if > $500K, amber $200K-$500K, red < $200K)

### 8.6 Helper Functions (defined in dashboard.tsx, reused pattern in other pages)
```typescript
function ragColor(actual, target, warningThreshold = 0.8)
function ragBg(actual, target, warningThreshold = 0.8)
function RagDot({ actual, target, warningThreshold })
```

To change RAG thresholds, find the constants at the top of each page file:
- `MARGIN_TARGET`, `REVENUE_TARGET`, `UTILIZATION_TARGET` in dashboard.tsx
- Inline threshold values in other pages' RAG logic

---

## 9. Charts & Visualizations

All charts use the `recharts` library (v2.15.2). Charts are in `dashboard.tsx`.

### 9.1 Chart Inventory

| Chart | Type | Component | Data Source |
|-------|------|-----------|------------|
| Revenue by Billing Type | PieChart | `RechartsPie` + `Pie` + `Cell` | projects grouped by billingCategory |
| Pipeline by Classification | PieChart | `RechartsPie` + `Pie` + `Cell` | pipeline-opportunities grouped by classification |
| Monthly Revenue/Cost/Profit | AreaChart | `AreaChart` + `Area` | project-monthly aggregated by month |
| Project Margin vs Target | BarChart | `BarChart` + `Bar` | projects' forecastGmPercent |

### 9.2 Color Schemes
- General chart colors: `CHART_COLORS` array (blue, green, amber, red, purple, cyan, pink, lime)
- Classification-specific: `CLASSIFICATION_COLORS` object (C=green, S=blue, DVF=amber, DF=orange, Q=purple, A=slate)

### 9.3 Pie Chart Labels
Pie charts show percentage-only labels (e.g., "22%") with legends positioned below.

### 9.4 To Modify Charts
1. Open `client/src/pages/dashboard.tsx`
2. Find the chart section (search for `RechartsPie`, `AreaChart`, or `BarChart`)
3. Modify data transformation, colors, or chart props
4. All charts are wrapped in `<ResponsiveContainer>` for automatic resizing

---

## 10. Column Toggle System

Column toggles let users show/hide table columns. Implemented on: Projects, Finance, Resources, Pipeline.

### Pattern
Each page with column toggles follows this pattern:
```typescript
const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
  columnName1: true,
  columnName2: true,
  columnName3: false,  // hidden by default
});
```

A dropdown or popover renders checkboxes for each column. The table conditionally renders `<TableHead>` and `<TableCell>` based on `visibleColumns[key]`.

### Where to Add/Remove Toggleable Columns
1. Find the `visibleColumns` state in the page file
2. Add/remove entries in the default state object
3. Add/remove the corresponding checkbox in the toggle UI
4. Add/remove the conditional rendering in the table header and body

---

## 11. Seed Data

Defined in `server/seed.ts`. The seeder is idempotent: it checks for existing data before inserting.

### Seed Check Logic (lines 22-29)
1. If `pipeline_opportunities` has data → skip entirely
2. If `employees` has data but no pipeline → seed only pipeline and scenarios
3. If empty → seed everything

### Seeded Data Volumes
| Entity | Count | Key Details |
|--------|-------|-------------|
| Employees | 9 | 5 Consultants, 3 Engineers, 1 Contractor |
| Projects | 5 | 3 active, 1 completed, 1 planning |
| Rate Cards | 8 | By role/grade/location |
| Resource Plans | 30 | 10 allocations x 3 months |
| Timesheets | ~50 | 10 entries x 5 weeks |
| Costs | ~24 | 9 entries x ~3 months |
| KPIs | ~12 | Per project per month |
| Forecasts | ~12 | Per project per month |
| Milestones | ~10 | Across projects |
| Pipeline Opportunities | 15 | Across all 6 classifications |
| Scenarios | 2 | With adjustments |
| Data Sources | 3 | Employment Hero, iTimesheets, SharePoint |

To reset seed data: delete all records from the relevant tables and restart the application.

---

## 12. Environment & Configuration

### 12.1 Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `PORT` | Server port (default: 5000) | No |
| `NODE_ENV` | "development" or "production" | No |
| `SESSION_SECRET` | Express session signing key | Yes (if sessions are used) |

### 12.2 NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `NODE_ENV=development tsx server/index.ts` | Start dev server with Vite HMR |
| `npm run build` | `tsx script/build.ts` | Build for production |
| `npm start` | `NODE_ENV=production node dist/index.cjs` | Run production build |
| `npm run check` | `tsc` | TypeScript type checking |
| `npm run db:push` | `drizzle-kit push` | Sync schema to database |

### 12.3 Files You Should Never Modify
- `server/vite.ts` - Vite dev server integration
- `vite.config.ts` - Vite bundler configuration
- `drizzle.config.ts` - Drizzle Kit configuration
- `client/src/components/ui/*` - shadcn/ui base primitives (modify via shadcn CLI)

---

## 13. Common Support Tasks (Where to Change What)

### Add a New Data Field to an Existing Entity
1. `shared/schema.ts` → Add column to the table definition
2. `server/storage.ts` → No change needed (Drizzle selects all columns by default)
3. `server/routes.ts` → No change needed (insert schema auto-updates from Drizzle-Zod)
4. Run `npm run db:push` to sync schema
5. `client/src/pages/[page].tsx` → Add the field to the UI (table column, form field, etc.)
6. `server/seed.ts` → Add realistic values to seed data if desired

### Add a New Page/Feature
1. `client/src/pages/new-page.tsx` → Create the page component
2. `client/src/App.tsx` → Import and add a `<Route>` in the Router
3. `client/src/components/app-sidebar.tsx` → Add to the `navGroups` array
4. If it needs new data: update schema.ts → storage.ts → routes.ts → run db:push

### Add a New API Endpoint
1. `server/storage.ts` → Add method to `IStorage` interface and `DatabaseStorage` class
2. `server/routes.ts` → Add the route handler
3. Validate input with the appropriate Zod schema from `shared/schema.ts`

### Change RAG Thresholds
- Dashboard: `MARGIN_TARGET`, `REVENUE_TARGET`, `UTILIZATION_TARGET` constants in `dashboard.tsx`
- Projects: Search for threshold values in `projects.tsx` (inline in RAG logic)
- Finance: Search for threshold in `finance.tsx`
- Resources: Search for threshold values in `resources.tsx`
- Pipeline: Search for threshold values in `pipeline.tsx`

### Change Pipeline Win Probabilities
1. `client/src/pages/scenarios.tsx` → Find the `CLASSIFICATION_PROBABILITIES` or equivalent mapping
2. `client/src/pages/pipeline.tsx` → Update any display of probability percentages
3. `client/src/pages/dashboard.tsx` → Update `classificationLabel()` if names change

### Add a New External Data Source
1. `server/seed.ts` → Add to the `dataSources` seed array (line ~674)
2. `client/src/pages/data-sources.tsx` → No code change needed (data-driven from API)
3. For actual integration: implement a sync service and call `storage.updateDataSource()` with sync results

### Change the FY Month Mapping
1. `client/src/pages/dashboard.tsx` → `FY_MONTHS` array (line ~24)
2. `client/src/pages/finance.tsx` → Month-to-quarter mapping logic
3. `shared/schema.ts` → `project_monthly.month` field documentation
4. `client/src/pages/pipeline.tsx` → M1-M12 column labels

### Change the Currency or Number Format
- `formatCurrency()` function in `dashboard.tsx` (line ~34)
- Each page may have its own copy; search for `formatCurrency` across all page files

### Change the Sidebar Navigation Structure
- `client/src/components/app-sidebar.tsx` → Edit the `navGroups` array (line 33)
- Icons come from `lucide-react`

### Modify the Theme/Colors
- `client/src/index.css` → CSS variables under `:root` and `.dark`
- `tailwind.config.ts` → Tailwind theme extension
- Color values use HSL format without the `hsl()` wrapper: `--my-var: 23 10% 23%`

### Add a New Chart
1. Import needed recharts components in the target page
2. Prepare data by transforming query results
3. Wrap chart in `<ResponsiveContainer width="100%" height={300}>`
4. Use existing color arrays (`CHART_COLORS`, `CLASSIFICATION_COLORS`)

### Modify Demo/Seed Data
- `server/seed.ts` → Edit the value arrays for each entity
- The seeder is idempotent; to re-seed, clear the affected tables first
- Employee data starts at line 31, projects at line 274, pipeline at the `seedPipelineAndScenarios()` function

---

## 14. Dependency Reference

### Core Runtime Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.3.x | UI framework |
| react-dom | 18.3.x | React DOM rendering |
| express | 5.0.x | HTTP server |
| drizzle-orm | 0.39.x | ORM for PostgreSQL |
| pg | 8.16.x | PostgreSQL driver |
| zod | 3.24.x | Runtime validation |
| drizzle-zod | 0.7.x | Drizzle-to-Zod schema generation |

### Frontend Libraries
| Package | Version | Purpose |
|---------|---------|---------|
| wouter | 3.3.x | Client-side routing |
| @tanstack/react-query | 5.60.x | Data fetching/caching |
| recharts | 2.15.x | Charts (Pie, Area, Bar) |
| tailwindcss | 3.4.x | Utility-first CSS |
| lucide-react | 0.453.x | Icon library |
| react-hook-form | 7.55.x | Form management |
| @hookform/resolvers | 3.10.x | Zod resolver for forms |
| shadcn/ui (Radix primitives) | various | UI component library |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| vite | 7.3.x | Build tool & dev server |
| tsx | 4.20.x | TypeScript execution |
| typescript | 5.6.x | Type checking |
| drizzle-kit | 0.31.x | Database migration tool |

---

*Last updated: February 2026*
