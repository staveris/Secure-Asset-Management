# Threat Model

## Project Overview

Publicly deployed multi-tenant SaaS for NIS2 readiness and incident/compliance management. The production application is a React/Vite frontend in `client/src` backed by an Express/TypeScript API in `server/routes.ts` and `server/storage.ts`, with PostgreSQL/Drizzle for persistence and `express-session` for authentication. The platform stores tenant compliance data, uploaded evidence metadata, incident records, supplier risk information, audit logs, and platform-level administration settings.

Production-scope assumptions for this repo:
- `NODE_ENV` is `production` in deployed environments.
- Replit terminates TLS for deployed traffic.
- `artifacts/mockup-sandbox` is dev-only and out of scope unless production reachability is demonstrated.
- The current deployment is publicly reachable, so public and authenticated routes should be treated as internet-exposed.

## Assets

- **User accounts and authenticated sessions** — email addresses, password hashes, TOTP state, session identifiers, reset/verification tokens. Compromise enables impersonation and lateral movement.
- **Tenant-scoped compliance data** — assessments, tasks, incidents, supplier records, risk exceptions, evidence metadata, and readiness reports. Cross-tenant access would violate isolation guarantees central to the product.
- **Evidence management state** — uploaded file metadata, storage paths, locks, unlock requests, and access logs. Integrity matters because evidence is used for audits and regulatory reporting.
- **Platform administration capabilities** — tenant management, analytics, global settings, requirement libraries, email configuration, and audit-log visibility. Misuse grants cross-tenant visibility or control.
- **Application secrets and infrastructure credentials** — database connection details, session signing secret, email provider credentials, and any object-storage configuration.
- **Audit trail and compliance workflows** — audit logs, incident timelines, and workflow state used to demonstrate regulatory compliance and support repudiation resistance.

## Trust Boundaries

- **Browser to API** — all client input is untrusted. The server must enforce authentication, authorization, tenant scoping, and business rules without relying on frontend checks.
- **Authenticated user to privileged role boundary** — regular tenant users, tenant managers, tenant admins, readonly auditors, and platform admins have materially different authority. Role checks must be enforced server-side.
- **Restricted-user to full-access boundary** — within a tenant, `fullAccessEnabled` is a separate authorization control used to confine some users to assessments-only workflows while withholding access to tasks, evidence, incidents, suppliers, risks, and reports. Server-side routes must enforce this boundary consistently rather than relying on frontend wrappers.
- **Tenant to tenant boundary** — the service is multi-tenant, so all object fetches and mutations must be scoped by tenant ownership unless a route is intentionally platform-global.
- **API to PostgreSQL** — the server has broad database rights. Broken authorization or injection at the API layer can become full data compromise.
- **API to external email/storage services** — verification, password reset, and invitation flows cross into third-party providers and must not leak secrets or trust user-controlled targets.
- **Production to dev-only boundary** — experimental or sandbox code under `artifacts/` should not influence production conclusions unless routing or deployment config proves exposure.

## Scan Anchors

- **Primary production entry points:** `server/routes.ts`, `server/storage.ts`, `server/replitAuth.ts`, `client/src/App.tsx`, `client/src/lib/auth.ts`.
- **Highest-risk areas:** auth/session flows, tenant user-management routes, restricted-vs-full-access enforcement, dashboard/snapshot reporting APIs, evidence lock/unlock workflows, admin-only endpoints, and file-upload/report-export code.
- **Surface split:** public auth endpoints under `/api/auth/*`; authenticated tenant endpoints under `/api/*`; privileged platform endpoints under `/api/admin/*` and `requirePlatformAdmin` checks. Shared tenant-visible reporting endpoints such as `/api/dashboard` and `/api/snapshots*` should also be reviewed for accidental disclosure of data otherwise gated behind `requireFullAccess`.
- **Additional scan anchors:** `GET /api/admin/atomic-maps` is a platform-vs-tenant authorization checkpoint because it returns platform-global library data, and evidence unlock routes under `/api/evidence/*unlock*` are sensitive to restricted-vs-full-access bypasses.
- **Usually dev-only:** `artifacts/mockup-sandbox/**` unless production reachability is shown.

## Threat Categories

### Spoofing

The application relies on session cookies plus optional TOTP for identity. Protected routes must require a valid authenticated server-side session, authentication state transitions must not be forgeable or fixable by an attacker, and password-reset / verification / invitation tokens must be unpredictable, scoped, and time-limited.

### Tampering

Users can change assessments, incidents, supplier records, evidence state, and tenant settings. The server must treat the client as untrusted: sensitive workflow changes such as approval actions, lock/unlock operations, role changes, and compliance status updates must be validated server-side and tied to objects the caller is allowed to modify.

### Repudiation

The platform is explicitly compliance- and audit-oriented, so sensitive actions must be attributable. User-management changes, evidence access and unlock decisions, incident changes, and tenant-level administrative actions must generate reliable audit logs with actor, tenant, target object, and timestamp.

### Information Disclosure

Tenant data, evidence metadata, incident details, supplier assessments, and admin settings must remain scoped to authorized users. API responses and logs must not expose cross-tenant records, secrets, or sensitive configuration to lower-privilege roles. Platform-only data must remain inaccessible to tenant-scoped users.

### Denial of Service

Publicly reachable auth and onboarding endpoints can be abused for resource exhaustion, and authenticated users can trigger storage-heavy or computation-heavy flows such as uploads, reporting, analytics, and recomputation jobs. The system must bound request sizes, rate-limit expensive public actions, and prevent low-privilege users from invoking disproportionately expensive global work.

### Elevation of Privilege

This project has a strong privileged-role hierarchy, a separate restricted-vs-full-access boundary, and strict tenant isolation requirements, so broken access control is the dominant risk. Every route that reads or mutates tenant objects must enforce authentication, tenant ownership, and any required full-access/admin policy server-side, and role-bearing inputs from the client must never be accepted as authoritative without validation against the caller’s maximum allowed privilege.
