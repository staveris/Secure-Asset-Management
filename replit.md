# NIS2 Readiness Platform

## Overview
The NIS2 Readiness Platform is a multi-tenant SaaS solution designed to help companies achieve and maintain compliance with the NIS2 Directive. It provides tools for cybersecurity posture assessment, compliance tracking, incident management with integrated EU reporting timelines, and the generation of audit-ready reports. The platform aims to streamline the compliance process, reduce manual effort, and ensure organizations can effectively meet their regulatory obligations, thereby enhancing their market position and reducing legal risks.

## User Preferences
I prefer that the agent focuses on the implementation details and adheres to the established architecture. When making changes, please prioritize security considerations and ensure that any new features are integrated seamlessly without introducing regressions. I value clear and concise communication, especially when discussing technical decisions or potential trade-offs. I prefer iterative development with small, testable changes.

## System Architecture
The platform is built with a modern web stack, featuring React, TypeScript, Vite, TailwindCSS, and shadcn/ui for the frontend, and Express.js with TypeScript for the backend. PostgreSQL with Drizzle ORM serves as the database. Authentication uses bcryptjs, express-session, and TOTP 2FA. Security measures include helmet, express-rate-limit, CSRF protection, account lockout, and session timeout.

**Key Features:**
- **Multi-tenancy:** Isolated environments for each company.
- **Role-Based Access Control (RBAC):** Granular permissions for PLATFORM_ADMIN, TENANT_ADMIN, TENANT_MANAGER, TENANT_USER, and READONLY_AUDITOR roles.
- **NIS2 & CIR Compliance:** Comprehensive library of NIS2 requirements and CIR 2024/2690 controls, supporting both standard and atomic assessments.
- **Incident Management:** Tracking incidents with EU reporting deadlines (EARLY_WARNING, NOTIFICATION, FINAL_REPORT drafts).
- **Evidence Management:** Secure vault for storing evidence items with file upload capabilities (validation for type and size).
- **Reporting:** Generation of print-friendly NIS2 readiness reports.
- **Audit Logging:** Detailed logging of all CRUD operations and security-related events.
- **Security Hardening:** Implementation of various security features including secure headers, rate limiting, input sanitization, CSRF protection, account lockout, 2FA, session management, and file upload scanning.
- **Atomic Controls Add-on:** A feature-flagged system for managing and assessing atomic-level controls derived from legal sources. This includes an importer for efficient data management.
- **Unified Assessments:** Automated creation and linking of CIR assessments for applicable sectors, providing a combined compliance view.
- **Storage Quota System:** Enforces storage limits per tenant and maximum file sizes.
- **Email Verification:** Mandates email verification for new users before platform access, with an admin-configurable email service.

**Frontend Pages & Components:**
- **Dashboard:** KPIs, charts, and compliance trends.
- **Assessments:** Management and detail views for standard and atomic assessments.
- **Tasks:** Task management with filtering.
- **Evidence Vault:** Centralized evidence storage and upload.
- **Incidents:** Incident tracking and notification drafting.
- **Suppliers & Risks:** Comprehensive Supplier Risk Management module with questionnaire-based assessments (5 templates, 60+ NIS2/CIR-mapped questions), service dependency tracking, security requirement status, NIS2 contract clause checklist, risk exceptions/waivers with approval workflow, supplier incident tracking, and automated risk scoring. Supplier detail page with 7 tabs (Overview, Dependencies, Assessments, Requirements, Contracts, Exceptions, Incidents). Dashboard includes supply chain risk KPIs.
- **Reports:** Generation of compliance reports.
- **Onboarding Wizard:** Guided setup for new tenants.
- **Admin Pages:** Platform analytics, tenant management, requirement library, audit logs, and atomic controls management.
- **Security Components:** Idle timeout warning, cookie consent banner, contact popups for locked features, demo mode banner.

## External Dependencies
- **PostgreSQL:** Primary database for all application data and session storage.
- **bcryptjs:** For password hashing.
- **express-session:** Session management with PostgreSQL store.
- **otpauth:** For TOTP 2FA generation and verification.
- **helmet:** Middleware for securing HTTP headers.
- **express-rate-limit:** For rate limiting API requests.
- **multer:** For handling multipart/form-data, primarily file uploads.
- **TailwindCSS:** Utility-first CSS framework for styling.
- **shadcn/ui:** UI component library.
- **Recharts:** For data visualization and charting.
- **wouter:** Frontend routing library.
- **Zod:** For schema validation.
- **Drizzle ORM:** TypeScript ORM for PostgreSQL.
- **sanitize-html:** For input sanitization.
- **SendGrid/Resend (Configurable):** For email services (e.g., verification, password resets).