# FinanceHub - Project Finance Management

## Overview
FinanceHub is a production-grade financial and project management application designed to consolidate data from various sources (manual and automated). Its primary purpose is to track project burn rates, resource utilization, financial forecasts, customer experience ratings, and resource costs with robust workflows. The application is tailored to match Excel data structures, including pipeline classifications, VAT categories, billing types, and the Australian Financial Year format (Jul-Jun). It is engineered for deployment on Azure, aiming to provide a comprehensive solution for financial oversight and project management.

## User Preferences
No specific user preferences were provided. The agent should infer best practices for communication, coding style, workflow, and interaction based on the project's technical details and overall goals.

## System Architecture
The application is built with a React + Vite frontend using Tailwind CSS and shadcn/ui for styling, wouter for routing, and TanStack Query for data fetching. The backend is an Express.js server utilizing `express-session` for session-based authentication. PostgreSQL is used for development, with Azure SQL/MSSQL planned for production, managed by Knex.js.

**Key Architectural Decisions:**
- **Modular Monolith:** The project structure is organized into `client/` and `server/` directories, with a `shared/` directory for common schemas (Zod for data validation).
- **Session-Based Authentication:** Employs `express-session` with `connect-pg-simple` for secure, persistent user sessions and `bcryptjs` for password hashing. Role-based access control is implemented, with an 'admin' role having elevated privileges, and Azure AD SSO integration for user authentication and auto-provisioning.
- **Data Model:** Comprehensive Zod schemas define data models for entities such as `employees`, `projects`, `pipelineOpportunities`, `scenarios`, `timesheets`, `costs`, `milestones`, `referenceData`, `cxRatings`, and `resourceCosts`. The database schema is managed by Knex.js with incremental migrations.
- **API Design:** A RESTful API provides endpoints for CRUD operations and specialized queries, with filtering capabilities.
- **UI/UX Design:** Features a modern aesthetic with shadcn/ui components, supporting both dark and light themes. Visualizations are provided by Recharts (Pie, Area, Bar) for dashboards.
- **Financial Logic:** Incorporates Australian FY specific calculations (Jul-Jun), pipeline classifications with associated win probabilities (e.g., C(100%), S(80%)), VAT categories, and distinct billing types (Fixed, T&M, LH). Gross Margin (GM) is a key metric, displayed as both dollar amount and percentage.
- **AI Insights:** Integration with OpenAI for AI-powered analysis across six types (Risk Analysis: Risk Register, Pipeline Risks, Project Risks; Financial Intelligence: Spending Patterns, Financial Advice, Spending Forecast) using streaming responses from GPT-4o-mini.
- **Excel Import System:** Supports bulk data upload from multi-sheet Excel workbooks for Job Status, Staff SOT, Pipeline Revenue, Gross Profit, Personal Hours, Project Hours, CX Master List, Project Resource Cost, Project Resource Cost A&F, and Open Opportunities. It includes robust cross-referencing logic for projects and employees, and handles specific "Reason" entries as "Internal" projects.

## External Dependencies
- **PostgreSQL:** Primary database for development and local environments.
- **Azure SQL/MSSQL:** Planned production database environment.
- **OpenAI:** Utilized for AI-powered insights and analysis via Replit AI Integrations.
- **Employment Hero:** External API for daily data synchronization.
- **iTimesheets:** External API for daily timesheet data synchronization.
- **SharePoint:** External API for hourly data synchronization.
- **xlsx (SheetJS):** Excel file parsing for the import system.
- **Azure Active Directory:** For SSO (Single Sign-On) login integration.