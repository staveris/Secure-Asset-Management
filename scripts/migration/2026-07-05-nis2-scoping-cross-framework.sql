-- CyberResilience360 — additive schema migration
-- Adds: NIS2 Applicability & Scoping (Phase A) + Cross-Framework Mapping (Phase B)
--
-- SAFE / IDEMPOTENT: every statement is guarded with IF NOT EXISTS or a
-- pg_type check. Running it twice is a no-op. It only CREATEs — it never
-- ALTERs, DROPs, renames, or touches existing tables or data.
--
-- Usage against Azure PostgreSQL Flexible Server:
--   psql "$PROD_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migration/2026-07-05-nis2-scoping-cross-framework.sql
--
-- (Reference data — ISO/NIST controls, crosswalk edges, NIS2 applicability
--  tags — is seeded automatically and idempotently by the app at boot.)

BEGIN;

-- ---------- Enums ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nis2_entity_class') THEN
    CREATE TYPE "nis2_entity_class" AS ENUM ('ESSENTIAL','IMPORTANT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nis2_size_class') THEN
    CREATE TYPE "nis2_size_class" AS ENUM ('MICRO','SMALL','MEDIUM','LARGE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crosswalk_relationship') THEN
    CREATE TYPE "crosswalk_relationship" AS ENUM ('EQUIVALENT','SUPERSET','SUBSET','PARTIAL','RELATED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cross_suggestion_status') THEN
    CREATE TYPE "cross_suggestion_status" AS ENUM ('PENDING','ACCEPTED','REJECTED','SUPERSEDED');
  END IF;
END $$;

-- ---------- Phase A: NIS2 regulatory profile (one row per tenant) ----------
CREATE TABLE IF NOT EXISTS "nis2_regulatory_profile" (
  "tenant_id" integer PRIMARY KEY REFERENCES "tenants"("id") ON DELETE CASCADE,
  "nis2_scope_confirmed" boolean NOT NULL DEFAULT false,
  "established_in_eu_eea" boolean NOT NULL DEFAULT true,
  "country" text,
  "competent_authority" text,
  "sector_group" text,
  "sector" text,
  "subsector" text,
  "employee_count" integer,
  "annual_turnover_meur" integer,
  "balance_sheet_meur" integer,
  "size_class" "nis2_size_class",
  "size_independent_entity" boolean NOT NULL DEFAULT false,
  "size_independent_reason" text,
  "public_administration_entity" boolean NOT NULL DEFAULT false,
  "sole_provider_in_member_state" boolean NOT NULL DEFAULT false,
  "member_state_designated_in_scope" boolean NOT NULL DEFAULT false,
  "explicitly_excluded_by_member_state" boolean NOT NULL DEFAULT false,
  "operates_in_multiple_member_states" boolean NOT NULL DEFAULT false,
  "admin_override_enabled" boolean NOT NULL DEFAULT false,
  "admin_override_entity_class" "nis2_entity_class",
  "admin_override_reason" text,
  "computed_in_scope" boolean NOT NULL DEFAULT false,
  "computed_entity_class" "nis2_entity_class",
  "computed_reason" text,
  "nis2_applicability_notes" text,
  "nis2_last_scope_review_date" timestamp,
  "nis2_scope_reviewed_by" integer REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- ---------- Phase B: cross-framework mapping ----------
CREATE TABLE IF NOT EXISTS "external_framework_controls" (
  "id" serial PRIMARY KEY,
  "framework_key" text NOT NULL,
  "control_ref" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "source_url" text,
  "content_hash" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "external_framework_controls_framework_key_control_ref_unique" UNIQUE ("framework_key","control_ref")
);

CREATE TABLE IF NOT EXISTS "control_crosswalks" (
  "id" serial PRIMARY KEY,
  "from_atomic_control_id" integer NOT NULL REFERENCES "atomic_controls"("id"),
  "to_atomic_control_id" integer REFERENCES "atomic_controls"("id"),
  "to_external_control_id" integer REFERENCES "external_framework_controls"("id"),
  "relationship" "crosswalk_relationship" NOT NULL,
  "confidence" integer NOT NULL DEFAULT 50,
  "direction" text NOT NULL DEFAULT 'BIDIRECTIONAL',
  "rationale" text,
  "provenance" text,
  "content_hash" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "cross_framework_suggestions" (
  "id" serial PRIMARY KEY,
  "tenant_id" integer NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "crosswalk_id" integer NOT NULL REFERENCES "control_crosswalks"("id"),
  "source_atomic_control_id" integer NOT NULL REFERENCES "atomic_controls"("id"),
  "source_response_id" integer REFERENCES "atomic_assessment_responses"("id"),
  "target_atomic_assessment_id" integer NOT NULL REFERENCES "atomic_assessments"("id"),
  "target_atomic_control_id" integer NOT NULL REFERENCES "atomic_controls"("id"),
  "suggested_status" "atomic_implementation_status",
  "suggested_maturity" integer,
  "suggested_confidence" "atomic_confidence",
  "status" "cross_suggestion_status" NOT NULL DEFAULT 'PENDING',
  "reason" text,
  "decided_by" integer REFERENCES "users"("id"),
  "decided_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "cross_framework_suggestions_tenant_target_crosswalk_unique" UNIQUE ("tenant_id","target_atomic_assessment_id","target_atomic_control_id","crosswalk_id")
);

COMMIT;

-- Post-check: list the objects this migration guarantees.
SELECT
  to_regclass('public.nis2_regulatory_profile')       AS nis2_regulatory_profile,
  to_regclass('public.external_framework_controls')   AS external_framework_controls,
  to_regclass('public.control_crosswalks')            AS control_crosswalks,
  to_regclass('public.cross_framework_suggestions')   AS cross_framework_suggestions;
