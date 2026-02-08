# NIS2 Readiness Platform

## Overview
Multi-tenant compliance SaaS for NIS2 Directive readiness. Companies can assess their cybersecurity posture, track compliance progress, manage incidents, and produce audit-ready reports.

## Tech Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui + Recharts
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: bcryptjs password hashing + express-session with PostgreSQL session store
- **Routing**: wouter (frontend), Express (backend)

## Architecture
- `shared/schema.ts` - Drizzle schemas and Zod validation for all entities
- `server/db.ts` - PostgreSQL connection pool
- `server/storage.ts` - DatabaseStorage class implementing IStorage interface
- `server/routes.ts` - All API endpoints with auth middleware and tenant isolation
- `server/seed.ts` - NIS2 requirement library + demo data seeding
- `client/src/lib/auth.tsx` - React auth context with login/register/logout
- `client/src/lib/theme.tsx` - Light/dark theme provider
- `client/src/components/app-sidebar.tsx` - Navigation sidebar with role-based menus
- `client/src/pages/` - All page components

## Key Entities
- Tenants, Users (with roles: PLATFORM_ADMIN, TENANT_ADMIN, TENANT_MANAGER, TENANT_USER, READONLY_AUDITOR)
- Requirements, ControlObjectives (NIS2 library)
- Assessments, AssessmentResponses
- Tasks, EvidenceItems, IncidentCases, Suppliers, RiskItems, AuditLogs

## Demo Accounts
- Platform Admin: admin@nis2platform.eu / admin123
- Tenant User: demo@acmecorp.com / demo1234

## API Routes
All routes prefixed with `/api/`:
- Auth: POST login, register, logout; GET me
- Dashboard: GET /dashboard (tenant), GET /admin/dashboard (admin)
- Assessments: GET/POST /assessments, GET /assessments/:id, PATCH /assessment-responses/:id
- Tasks: GET/POST /tasks, PATCH /tasks/:id
- Evidence: GET /evidence
- Incidents: GET/POST /incidents, PATCH /incidents/:id
- Suppliers: GET/POST /suppliers
- Risks: GET/POST /risks
- Admin: GET /admin/tenants, /admin/requirements, /admin/audit-logs

## Recent Changes
- 2026-02-08: Initial MVP build - full schema, all pages, auth, NIS2 seed data, dashboard charts
