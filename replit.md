# FinanceHub - Project Finance Management

## Overview
FinanceHub is a production-grade financial and project management application designed to consolidate data from various sources (manual and automated). Its primary purpose is to track project burn rates, resource utilization, financial forecasts, customer experience ratings, and resource costs with robust workflows. The application is tailored to match Excel data structures, including pipeline classifications, VAT categories, billing types, and the Australian Financial Year format (Jul-Jun). It is engineered for deployment on Azure, aiming to provide a comprehensive solution for financial oversight and project management.

## Recent Changes
- **Feb 2026:** Added three new Excel import sheets:
  - **CX Master List** — Imports customer experience (CX) ratings into `cx_ratings` table. Cross-references engagement names to existing projects (via project code prefix and name substring matching) and resource names to existing employees (by full name). Captures checkpoint dates, CX ratings (1-10), CM/DM flags, and rationale text.
  - **Project Resource Cost** — Imports monthly employee costs (total) into `resource_costs` table. Maps employee names to existing employee records. Stores 12 monthly cost columns (Jul-Jun Australian FY) plus calculated totals. Tracks staff type classification.
  - **Project Resource Cost A&F** — Imports monthly costs split by project phases (Phase C and Phase DVF) into `resource_costs` table. Handles the dual-section Excel layout with Phase C data (columns 0-13) and Phase DVF data (columns 17-30). Creates separate records per phase per employee.
- **Feb 2026:** Fixed Excel import for "Reason" entries (Leave, Operations, etc.) — these are now imported as timesheets under "Internal" projects with `client="Internal"` and `workType="Internal"` instead of being skipped.
- **Feb 2026:** Corrected off-by-one loop errors in Job Status and Staff SOT imports (loop now starts at `i=0` instead of `i=1` to avoid skipping valid data rows).
- **Feb 2026:** Removed numeric/Reason project name filters from Project Hours and Personal Hours imports so all rows are captured.

## User Preferences
No specific user preferences were provided. The agent should infer best practices for communication, coding style, workflow, and interaction based on the project's technical details and overall goals.

## System Architecture
The application is built with a React + Vite frontend using Tailwind CSS and shadcn/ui for styling, wouter for routing, and TanStack Query for data fetching. The backend is an Express.js server utilizing `express-session` for session-based authentication. PostgreSQL is used for development, with Azure SQL/MSSQL planned for production, managed by Knex.js.

**Key Architectural Decisions:**
- **Modular Monolith:** The project structure is organized into `client/` and `server/` directories, with a `shared/` directory for common schemas (Zod for data validation).
- **Session-Based Authentication:** Employs `express-session` with `connect-pg-simple` for secure, persistent user sessions and `bcryptjs` for password hashing. Role-based access control is implemented, with an 'admin' role having elevated privileges.
- **Data Model:** Comprehensive Zod schemas define data models for entities such as `employees`, `projects`, `pipelineOpportunities`, `scenarios`, `timesheets`, `costs`, `milestones`, `referenceData`, `cxRatings`, and `resourceCosts`.
- **Database Management:** Knex.js handles database interactions via incremental migrations in `server/db.ts`. The schema is defined in `shared/schema.ts` using Zod, and tables are created/altered programmatically on startup.
- **API Design:** A RESTful API provides endpoints for CRUD operations and specialized queries, with filtering capabilities.
- **UI/UX Design:** Features a modern aesthetic with shadcn/ui components, supporting both dark and light themes. Visualizations are provided by Recharts (Pie, Area, Bar) for dashboards.
- **Financial Logic:** Incorporates Australian FY specific calculations (Jul-Jun), pipeline classifications with associated win probabilities (e.g., C(100%), S(80%)), VAT categories, and distinct billing types (Fixed, T&M, LH). Gross Margin (GM) is a key metric, displayed as both dollar amount and percentage.

## Database Tables
| Table | Description |
|-------|-------------|
| `users` | Application users with roles (admin/user) |
| `employees` | Staff records with cost bands, schedules, and contact details |
| `projects` | Project records with monthly R/C/P breakdown, billing types, status |
| `project_monthly` | Monthly financial snapshots per project |
| `pipeline_opportunities` | Sales pipeline items with VAT categories, win probabilities, monthly revenue |
| `scenarios` | What-if scenario definitions |
| `scenario_adjustments` | Individual adjustments within scenarios |
| `timesheets` | Timesheet entries (hours, projects, employees) |
| `costs` | Project cost records (gross, resource, margin) |
| `milestones` | Delivery milestones and payment invoices |
| `reference_data` | Admin-managed lookup categories |
| `kpis` | Key performance indicators |
| `forecasts` | Financial forecast data |
| `resource_plans` | Resource allocation plans |
| `rate_cards` | Billing rate cards |
| `data_sources` | Data source tracking |
| `conversations` | AI conversation history |
| `messages` | AI conversation messages |
| `onboarding_steps` | User onboarding progress |
| **`cx_ratings`** | Customer experience ratings linked to projects and employees. Fields: engagementName, checkPointDate, cxRating (1-10), resourceName, isClientManager, isDeliveryManager, rationale. Foreign keys to `projects` and `employees`. |
| **`resource_costs`** | Monthly employee resource costs by phase. Fields: employeeName, staffType, costPhase (Total/Phase C/Phase DVF), fyYear, costM1-costM12, totalCost, source. Foreign key to `employees`. |

## Excel Import System
The upload page (`/upload`) supports importing data from a multi-sheet Excel workbook. Sheets are imported in a defined order (Job Status and Staff SOT first, then others) to ensure foreign key references resolve correctly.

**Supported Sheets (10 total):**
| Sheet Name | Import Function | Description |
|------------|----------------|-------------|
| Job Status | `importJobStatus` | Projects with monthly R/C/P breakdown |
| Staff SOT | `importStaffSOT` | Employee records with cost bands and schedules |
| Resource Plan Opps | `importPipelineRevenue` | Pipeline opportunities with monthly revenue and VAT |
| Resource Plan Opps FY25-26 | `importPipelineRevenue` | Pipeline opportunities (FY25-26 only) |
| GrossProfit | `importGrossProfit` | Pipeline gross profit by month |
| Personal Hours - inc non-projec | `importPersonalHours` | Timesheet entries from personal hours (includes Leave/Operations as Internal) |
| Project Hours | `importProjectHours` | Project-level KPI summary data |
| CX Master List | `importCxMasterList` | CX ratings with project/employee cross-referencing |
| Project Resource Cost | `importProjectResourceCost` | Monthly resource costs per employee (total) |
| Project Resource Cost A&F | `importProjectResourceCostAF` | Monthly costs split by Phase C and Phase DVF |

**Cross-Referencing Logic:**
- CX Master List matches engagement names to projects via project code prefix regex (`/^[A-Z]{2,6}\d{2,4}/`) and fallback name substring matching
- Employee matching uses full name (`firstName lastName`) lowercased comparison
- "Reason" entries (Leave, Operations) in timesheets are imported under synthetic "Internal" projects

## Core Feature Specifications
- **Dashboards:** Comprehensive dashboards for overall KPIs, finance, and resource utilization, featuring RAG indicators, various chart types, and monthly snapshots.
- **Project & Resource Management:** Excel-style job status views for projects and Staff Schedule of Tasks (SOT) for resources, including cost bands and schedule dates.
- **Sales Pipeline:** Detailed pipeline management with VAT category summaries, risk status aggregation, weighted values, and monthly revenue projections.
- **What-If Scenarios:** Interactive scenario planning with adjustable win rates, real-time weighted revenue/GP calculations, and comparison against goals.
- **Milestones & Invoices:** Tracking of payment invoices (with status) and delivery milestones.
- **AI Insights:** Integration with OpenAI for AI-powered analysis of pipeline health, project status, and executive overviews using Server-Sent Events (SSE).
- **Admin Features:** Dedicated admin panel for managing reference data categories.
- **CX Ratings:** Customer experience tracking with per-engagement ratings, CM/DM role flags, and rationale capture.
- **Resource Cost Tracking:** Monthly employee cost tracking by project phase (Total, Phase C, Phase DVF) across Australian FY periods.
- **Excel Import:** Bulk data upload supporting 10 sheet types with automatic cross-referencing and error reporting per row.

## Key Files
| File | Purpose |
|------|---------|
| `shared/schema.ts` | Zod schemas, insert schemas, and TypeScript types for all data models |
| `server/db.ts` | Database connection (Knex.js) and incremental migration logic |
| `server/storage.ts` | Storage interface (`IStorage`) and implementation for all CRUD operations |
| `server/routes.ts` | Express API routes and Excel import functions |
| `server/index.ts` | Server entry point |
| `client/src/App.tsx` | Frontend root with routing and sidebar |
| `client/src/pages/upload.tsx` | Excel file upload UI with sheet selection and import results |
| `scripts/sync-to-github.ts` | GitHub sync script with feature branching for CI/CD |
| `.github/workflows/azure-deploy.yml` | GitHub Actions CI/CD pipeline for Azure deployment |
| `AZURE-DEPLOY.md` | Azure deployment documentation |

## GitHub Sync & Deployment Workflow
The sync script (`scripts/sync-to-github.ts`) implements automatic feature branching for change tracking with deployment on every sync.

**Usage:**
```bash
# Sync and deploy with branch audit trail:
tsx scripts/sync-to-github.ts "cx-ratings-import" "Add CX ratings import feature"
```

**How it works:**
- Every sync creates a timestamped feature branch (e.g. `feature/20260218-1530-cx-ratings-import`) as an audit trail
- Main is always updated to the same commit, triggering Azure deployment via GitHub Actions
- The feature branch is preserved so you can compare what changed between syncs (compare URL provided in output)
- All feature branches are viewable on GitHub under `branches/all?query=feature/`
- Auth: Uses `GITHUB_PAT` (has workflow scope for .github/ files) with fallback to GitHub connector token

**Deployment trigger:** Push to `main` branch triggers `.github/workflows/azure-deploy.yml`. The workflow ignores changes to `.github/workflows/**` to prevent recursive triggers.

## External Dependencies
- **PostgreSQL:** Primary database for development and local environments.
- **Azure SQL/MSSQL:** Planned production database environment.
- **OpenAI:** Utilized for AI-powered insights and analysis via Replit AI Integrations.
- **Employment Hero:** External API for daily data synchronization.
- **iTimesheets:** External API for daily timesheet data synchronization.
- **SharePoint:** External API for hourly data synchronization.
- **xlsx (SheetJS):** Excel file parsing for the import system.
