# FinanceHub - Project Finance Management

## Overview
FinanceHub is a production-grade financial and project management application designed to consolidate data from various sources (manual and automated) to track project burn rates, resource utilization, financial forecasts, customer experience ratings, and resource costs. It supports robust workflows, aligns with Excel data structures (including Australian Financial Year format), and is engineered for Azure deployment. The project aims to provide comprehensive financial oversight and project management.

## User Preferences
No specific user preferences were provided. The agent should infer best practices for communication, coding style, workflow, and interaction based on the project's technical details and overall goals.

## System Architecture
The application features a React + Vite frontend with Tailwind CSS and shadcn/ui, `wouter` for routing, and TanStack Query for data fetching. The backend is an Express.js server using `express-session` for authentication. PostgreSQL is used for development, with Azure SQL/MSSQL for production, managed by Knex.js.

**Key Architectural Decisions:**
- **Modular Monolith:** Project is structured into `client/`, `server/`, and `shared/` (for Zod schemas).
- **Session-Based Authentication & Fine-Grained RBAC:** Secure user sessions via `express-session` and `connect-pg-simple`, with `bcryptjs` for password hashing. Fine-grained RBAC with 5 roles (Admin, Executive, VAT Lead, Operations, Employee) enforced server-side via middleware and client-side via `useAuth` hook. Includes Azure AD SSO integration.
- **Data Model:** Comprehensive Zod schemas define entities like `employees`, `projects`, `pipelineOpportunities`, `timesheets`, and `costs`. Database schema managed by Knex.js migrations.
- **API Design:** RESTful API with CRUD operations and filtering capabilities.
- **UI/UX Design:** Modern aesthetic with shadcn/ui, supporting dark/light themes. Dashboards utilize Recharts for data visualization.
- **Financial Logic:** Incorporates Australian FY specific calculations (Jul-Jun), pipeline classifications with win probabilities, VAT categories, and distinct billing types (Fixed, T&M, LH). Gross Margin (GM) is a key metric. YTD revenue/cost calculations use day-level pro-rating.
- **What-If Scenarios with YTD Projections:** Combines YTD actual revenue with weighted pipeline forecast for projected financial position. Features summary cards and a monthly projection table.
- **AI Insights:** Integration with OpenAI (GPT-4o-mini) for AI-powered analysis across risk, financial intelligence, and spending patterns, using streaming responses.
- **VAT Sales Committee Reports:** Web-based editable interface replicating PowerPoint VAT SC reports for 7 VATs. Includes status overview, risks/issues, planner tasks, and AI suggestions. Integrates with Microsoft Planner via Graph API for task synchronization.
- **Excel Import System:** Supports bulk data upload from multi-sheet Excel workbooks for various financial and project data, with robust cross-referencing.
- **PPTX VAT Report Import:** Parses PowerPoint files to bulk-create VAT reports, extracting status summaries, risks/issues, and planner tasks.
- **VAT Target Tracking & Overview:** Manages per-VAT quarterly financial targets (GM Contribution, Revenue, GM%) with OK/Good/Great/Amazing tiers. VAT Overview page displays cumulative YTD vs prorated target charts.
- **Feature Request System:** Employee-facing form for enhancement requests with admin review workflow, GitHub branch creation integration, and status tracking.
- **Partner View & Certifications:** Displays pipeline opportunities involving partners and certified staff. Certification matching uses keyword mapping.
- **Seed Data:** A script (`scripts/seed-data.ts`) populates the database with demo data for various entities.

## External Dependencies
- **PostgreSQL:** Development database.
- **Azure SQL/MSSQL:** Planned production database.
- **OpenAI:** Used for AI-powered insights.
- **Employment Hero:** External API for daily data synchronization.
- **iTimesheets:** External API for daily timesheet data synchronization.
- **SharePoint:** External API for hourly and daily data synchronization from multiple sources (Open Opportunities, Inflight Projects, Job Plans).
- **xlsx (SheetJS):** For parsing Excel files.
- **Azure Active Directory:** For SSO login integration.
- **jsonwebtoken:** For JWT validation during SSO token handoff from the Launchpad app.