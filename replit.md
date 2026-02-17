# FinanceHub - Project Finance Management

## Overview
FinanceHub is a production-grade financial and project management application designed to consolidate data from various sources (manual and automated). Its primary purpose is to track project burn rates, resource utilization, and financial forecasts with robust workflows. The application is tailored to match Excel data structures, including pipeline classifications, VAT categories, billing types, and the Australian Financial Year format. It is engineered for deployment on Azure, aiming to provide a comprehensive solution for financial oversight and project management.

## User Preferences
No specific user preferences were provided. The agent should infer best practices for communication, coding style, workflow, and interaction based on the project's technical details and overall goals.

## System Architecture
The application is built with a React + Vite frontend using Tailwind CSS and shadcn/ui for styling, wouter for routing, and TanStack Query for data fetching. The backend is an Express.js server utilizing `express-session` for session-based authentication. PostgreSQL is used for development, with Azure SQL/MSSQL planned for production, managed by Knex.js.

**Key Architectural Decisions:**
- **Modular Monolith:** The project structure is organized into `client/` and `server/` directories, with a `shared/` directory for common schemas (Zod for data validation).
- **Session-Based Authentication:** Employs `express-session` with `connect-pg-simple` for secure, persistent user sessions and `bcryptjs` for password hashing. Role-based access control is implemented, with an 'admin' role having elevated privileges.
- **Data Model:** Comprehensive Zod schemas define data models for entities such as `employees`, `projects`, `pipelineOpportunities`, `scenarios`, `timesheets`, `costs`, `milestones`, and `referenceData`.
- **Database Management:** Knex.js handles database interactions, supporting incremental migrations to evolve the schema programmatically.
- **API Design:** A RESTful API provides endpoints for CRUD operations and specialized queries, with filtering capabilities.
- **UI/UX Design:** Features a modern aesthetic with shadcn/ui components, supporting both dark and light themes. Visualizations are provided by Recharts (Pie, Area, Bar) for dashboards.
- **Financial Logic:** Incorporates Australian FY specific calculations (Jul-Jun), pipeline classifications with associated win probabilities (e.g., C(100%), S(80%)), VAT categories, and distinct billing types (Fixed, T&M, LH). Gross Margin (GM) is a key metric, displayed as both dollar amount and percentage.
- **Core Feature Specifications:**
    - **Dashboards:** Comprehensive dashboards for overall KPIs, finance, and resource utilization, featuring RAG indicators, various chart types, and monthly snapshots.
    - **Project & Resource Management:** Excel-style job status views for projects and Staff Schedule of Tasks (SOT) for resources, including cost bands and schedule dates.
    - **Sales Pipeline:** Detailed pipeline management with VAT category summaries, risk status aggregation, weighted values, and monthly revenue projections.
    - **What-If Scenarios:** Interactive scenario planning with adjustable win rates, real-time weighted revenue/GP calculations, and comparison against goals.
    - **Milestones & Invoices:** Tracking of payment invoices (with status) and delivery milestones.
    - **AI Insights:** Integration with OpenAI for AI-powered analysis of pipeline health, project status, and executive overviews using Server-Sent Events (SSE).
    - **Admin Features:** Dedicated admin panel for managing reference data categories.

## External Dependencies
- **PostgreSQL:** Primary database for development and local environments.
- **Azure SQL/MSSQL:** Planned production database environment.
- **OpenAI:** Utilized for AI-powered insights and analysis via Replit AI Integrations.
- **Employment Hero:** External API for daily data synchronization.
- **iTimesheets:** External API for daily timesheet data synchronization.
- **SharePoint:** External API for hourly data synchronization.