# NIS2 Readiness Platform

## Overview
Multi-tenant compliance SaaS for NIS2 Directive readiness. Companies can assess their cybersecurity posture, track compliance progress, manage incidents with EU reporting timelines, and produce audit-ready reports.

## Tech Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui + Recharts
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: bcryptjs password hashing + express-session with PostgreSQL session store + TOTP 2FA (otpauth)
- **Security**: helmet (secure headers + CSP), express-rate-limit (auth rate limiting), READONLY_AUDITOR write enforcement, CSRF protection, account lockout, session timeout
- **Routing**: wouter (frontend), Express (backend)
- **File Upload**: multer with size/type validation

## Architecture
- `shared/schema.ts` - Drizzle schemas and Zod validation for all 15 entities
- `server/db.ts` - PostgreSQL connection pool
- `server/storage.ts` - DatabaseStorage class implementing IStorage interface
- `server/routes.ts` - All API endpoints with auth middleware, tenant isolation, rate limiting
- `server/seed.ts` - NIS2 requirement library + demo data seeding
- `client/src/lib/auth.tsx` - React auth context with login/register/logout
- `client/src/lib/theme.tsx` - Light/dark theme provider
- `client/src/components/app-sidebar.tsx` - Navigation sidebar with role-based menus
- `client/src/pages/` - All page components

## Key Entities
- Tenants, Users (with roles: PLATFORM_ADMIN, TENANT_ADMIN, TENANT_MANAGER, TENANT_USER, READONLY_AUDITOR)
- Requirements, ControlObjectives (NIS2 library)
- Controls (tenant-scoped implementation tracking with maturity levels)
- Assessments, AssessmentResponses
- Tasks, EvidenceItems (with file upload), IncidentCases
- IncidentNotifications (EARLY_WARNING, NOTIFICATION, FINAL_REPORT drafts)
- Suppliers, RiskItems, AuditLogs
- TenantDailySnapshots (compliance metrics over time)

## Demo Accounts
- Platform Admin: admin@nis2platform.eu / admin123
- Tenant User: demo@acmecorp.com / demo1234

## API Routes
All routes prefixed with `/api/`:
- Auth: POST login, register (rate-limited), logout; GET me
- Dashboard: GET /dashboard (tenant), GET /admin/dashboard (admin)
- Assessments: GET/POST /assessments, GET /assessments/:id, PATCH /assessment-responses/:id
- Tasks: GET/POST /tasks, PATCH /tasks/:id
- Evidence: GET /evidence, POST /evidence/upload (multipart)
- Incidents: GET/POST /incidents, PATCH /incidents/:id
- Incident Notifications: GET/POST /incidents/:id/notifications
- Suppliers: GET/POST /suppliers
- Risks: GET/POST /risks
- Admin: GET /admin/tenants, /admin/requirements, /admin/audit-logs, /admin/csv-export

## Frontend Pages
- `/` - Dashboard (compliance KPIs, charts, trends)
- `/assessments` - Assessment list and creation
- `/assessments/:id` - Assessment detail with control-level scoring
- `/tasks` - Task management with filters
- `/evidence` - Evidence vault with file upload
- `/incidents` - Incident management with EU deadline tracking and notification drafts
- `/suppliers` - Supplier register
- `/risks` - Risk register
- `/reports` - Print-friendly NIS2 readiness report
- `/onboarding` - New tenant setup wizard
- `/admin` - Platform admin analytics with CSV export
- `/admin/tenants` - Tenant management
- `/admin/requirements` - NIS2 requirements library
- `/admin/audit-log` - Platform audit log

## Security Features
- Helmet secure headers
- Rate limiting on auth endpoints (15 attempts / 15 minutes)
- READONLY_AUDITOR role enforcement on all mutation endpoints
- Tenant isolation (IDOR prevention) on all update endpoints
- Session management with PostgreSQL store
- File upload validation (type, size limits)
- Audit logging for all CRUD operations

## Recent Changes
- 2026-02-08: Initial MVP build - full schema, all pages, auth, NIS2 seed data, dashboard charts
- 2026-02-08: Security hardening - helmet, rate limiting, READONLY_AUDITOR enforcement
- 2026-02-08: Added Controls, IncidentNotifications, TenantDailySnapshots entities
- 2026-02-08: Evidence vault with file upload, incident notification workflow
- 2026-02-08: Reports page, onboarding wizard, admin CSV export
- 2026-02-08: Company logo (Tools of Tech) integrated
- 2026-02-08: Fixed CSV export credentials, registration redirect to onboarding, error handling
- 2026-02-08: Assessment history API and dashboard trend charts (line chart, radar chart, assessment history table)
- 2026-02-08: Platform admin sidebar restricted to Administration only (no Compliance section)
- 2026-02-08: Separate AdminRouter/TenantRouter with role-based routing
- 2026-02-08: Tenant management: add, suspend/reactivate, delete tenants with cascading data removal
- 2026-02-08: Tenant status field (active/suspended) with login blocking for suspended tenants
- 2026-02-08: Enhanced admin analytics: 8 KPI cards, compliance distribution, entity type breakdown, task status, role breakdown, sortable tenant overview table
- 2026-02-08: Evidence delete functionality with locked-evidence protection and audit logging
- 2026-02-08: Evidence upload linked to real entities (assessments, tasks, incidents, controls) via dropdown selection
- 2026-02-08: Assessment detail page shows evidence per control with upload shortcut to Evidence Vault
- 2026-02-08: Evidence search and type filtering in Evidence Vault
- 2026-02-08: Email verification system: verify-email page, dashboard banner, resend verification endpoint
- 2026-02-08: Simplified registration form (removed NIS2 fields, added password strength indicator)
- 2026-02-08: Admin email settings page (SendGrid/Resend provider configuration)
- 2026-02-08: Enhanced admin analytics: per-country breakdown chart, annex classification (Annex I/II) chart
- 2026-02-08: Email service consolidated to use JSON config from platform_settings table
- 2026-02-08: Storage quota system: 10 GB per tenant, 100 MB max file, 10 users per tenant, admin Storage & Quotas page
- 2026-02-08: Country field made required during onboarding (frontend + backend validation)
- 2026-02-08: Reports page redesigned: professional print layout with SVG gauges, gradient header, domain progress bars, recommendations section, operational summary
- 2026-02-08: Email verification enforcement: new users must verify email before accessing platform; verification-pending gate page with resend and auto-refresh; PLATFORM_ADMIN bypasses gate
- 2026-02-08: Restricted user access: new users (TENANT_USER, TENANT_MANAGER, READONLY_AUDITOR) default to assessments-only access; fullAccessEnabled toggle in User Management; sidebar shows locked items with Lock icon; RestrictedPage on protected routes; backend requireFullAccess middleware on tasks/evidence/incidents/suppliers/risks; PLATFORM_ADMIN bypasses restrictions
- 2026-02-08: Access hierarchy: Platform Admin grants access to Tenant Admins via admin tenants page; Tenant Admins grant access to their own users via user management; admin tenant page has expandable user list with per-user access toggles
- 2026-02-08: GDPR Cookie Consent banner: appears on first visit (login and authenticated pages), Accept All / Essential Only options, persists in localStorage
- 2026-02-08: Contact popup for locked features: clicking locked sidebar items opens dialog with Tools of Tech P.C. contact info (email, phone)
- 2026-02-08: Demo mode banner: restricted users see persistent top banner indicating they are using the Demo Version with contact link
- 2026-02-08: RestrictedPage updated: shows "Feature Not Available in Demo" with Tools of Tech P.C. contact details and mailto CTA
- 2026-02-08: Password reset: forgot-password flow on login page, reset-password page with token validation, hashed reset tokens, 1hr expiry, server-side password complexity enforcement
- 2026-02-09: Security hardening phase 2:
  - Session invalidation on password reset/change (destroys all active sessions for the user)
  - Account lockout: 5 failed login attempts = 30 minute lockout, with lockout dialog on frontend
  - CSRF protection: token-based validation on all state-changing API requests (X-CSRF-Token header)
  - Enhanced security audit logging: LOGIN_SUCCESS, LOGIN_FAILED, ACCOUNT_LOCKED, LOGIN_BLOCKED_LOCKOUT, PASSWORD_RESET_REQUESTED, PASSWORD_RESET, PASSWORD_CHANGED events logged to audit_logs table and server console
  - Consistent password complexity enforcement on all password-setting endpoints
- 2026-02-09: Security hardening phase 3:
  - Two-factor authentication (2FA/TOTP): setup/enable/disable via Settings page; QR code generation with otpauth library; TOTP verification step during login; audit logging for TOTP_ENABLED/TOTP_DISABLED events
  - Session timeout / idle logout: 15-minute rolling session with frontend idle detection; warning dialog at 14 minutes; auto-logout at 15 minutes; throttled activity tracking
  - Content Security Policy (CSP) headers: default-src 'self'; script-src/style-src with 'unsafe-inline'; font-src for Google Fonts; frame-src/object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests
  - New schema fields: totpSecret (text), totpEnabled (boolean) on users table
  - New API endpoints: POST /api/auth/totp-setup, /api/auth/totp-enable, /api/auth/totp-disable, /api/auth/totp-verify
  - New frontend component: client/src/components/idle-timeout.tsx (IdleTimeoutWarning)
