# SheetApp - Excel to App Converter

## Overview
A full-stack application that converts Excel spreadsheets into interactive web apps with customizable screens and data rules. Users upload Excel/CSV files, and the app parses them into browsable sheets with table, card, and list views. Rules can be applied for validation, conditional highlighting, and formatting.

## Tech Stack
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui, wouter, TanStack Query
- **Backend**: Express.js, multer (file upload), xlsx (Excel parsing)
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: shadcn/ui components, dark/light theme support

## Architecture
- `shared/schema.ts` - Data models: projects, sheets, screens, rules
- `server/routes.ts` - REST API endpoints
- `server/storage.ts` - Database storage layer
- `server/seed.ts` - Seed data for demo
- `client/src/pages/` - Dashboard, Upload, Project, ScreenView pages
- `client/src/components/` - AppSidebar, ThemeProvider, ThemeToggle

## Key Features
1. **Upload Excel/CSV** - Parse multi-sheet workbooks into structured data
2. **Sheet Viewer** - Sortable data tables with row counts
3. **Screens** - Custom views (table, cards, list) of sheet data
4. **Rules** - Validation, conditional highlighting, formatting rules per column
5. **Dark/Light Theme** - Full dark mode support

## API Endpoints
- `GET /api/projects` - List all projects
- `POST /api/projects/upload` - Upload Excel file (multipart form)
- `GET /api/projects/:id` - Get project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/sheets` - Get sheets for project
- `GET /api/sheets/:id` - Get single sheet
- `GET /api/projects/:id/screens` - Get screens for project
- `POST /api/projects/:id/screens` - Create screen
- `DELETE /api/projects/:id/screens/:screenId` - Delete screen
- `GET /api/screens/:id` - Get single screen
- `GET /api/projects/:id/rules` - Get all rules for project
- `GET /api/sheets/:id/rules` - Get rules for sheet
- `POST /api/sheets/:id/rules` - Create rule
- `PATCH /api/rules/:id` - Update rule
- `DELETE /api/rules/:id` - Delete rule
