-- Azure production schema sync (auto-generated from dev schema, 2026-07-06)
-- Idempotent: safe to run multiple times. Contains NO drops/deletes.
-- "already exists" / "multiple primary keys" errors are expected noise and safely skipped.

-- 1) Full schema (guarded with IF NOT EXISTS; existing objects error harmlessly)
--
-- PostgreSQL database dump
--

\restrict k3oURDYZuAgJ3tBtlMKCd4PsjCohGuY2w9F36R1KdwPO512vykC64AdeVnKzqdr

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: assessment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assessment_status AS ENUM (
    'DRAFT',
    'IN_PROGRESS',
    'COMPLETED',
    'ARCHIVED'
);


--
-- Name: atomic_confidence; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.atomic_confidence AS ENUM (
    'NONE',
    'LOW',
    'MEDIUM',
    'HIGH'
);


--
-- Name: atomic_implementation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.atomic_implementation_status AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'IMPLEMENTED',
    'VERIFIED'
);


--
-- Name: control_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.control_status AS ENUM (
    'NOT_IMPLEMENTED',
    'PLANNED',
    'IN_PROGRESS',
    'IMPLEMENTED',
    'VERIFIED'
);


--
-- Name: cross_suggestion_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cross_suggestion_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'SUPERSEDED'
);


--
-- Name: crosswalk_relationship; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.crosswalk_relationship AS ENUM (
    'EQUIVALENT',
    'SUPERSET',
    'SUBSET',
    'PARTIAL',
    'RELATED'
);


--
-- Name: drift_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.drift_reason AS ENUM (
    'SOURCE_DOWNGRADED',
    'SOURCE_REMOVED',
    'EDGE_CHANGED'
);


--
-- Name: edge_review_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.edge_review_status AS ENUM (
    'DRAFT',
    'APPROVED'
);


--
-- Name: evidence_confidence; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.evidence_confidence AS ENUM (
    'NONE',
    'LOW',
    'MEDIUM',
    'HIGH'
);


--
-- Name: implementation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.implementation_status AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'IMPLEMENTED',
    'VERIFIED'
);


--
-- Name: incident_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_severity AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: incident_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_status AS ENUM (
    'DETECTED',
    'TRIAGED',
    'CONTAINED',
    'ERADICATED',
    'RECOVERED',
    'CLOSED'
);


--
-- Name: nis2_entity_class; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nis2_entity_class AS ENUM (
    'ESSENTIAL',
    'IMPORTANT'
);


--
-- Name: nis2_size_class; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nis2_size_class AS ENUM (
    'MICRO',
    'SMALL',
    'MEDIUM',
    'LARGE'
);


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_type AS ENUM (
    'EARLY_WARNING',
    'NOTIFICATION',
    'FINAL_REPORT'
);


--
-- Name: risk_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.risk_status AS ENUM (
    'IDENTIFIED',
    'ANALYZING',
    'TREATING',
    'MONITORING',
    'CLOSED'
);


--
-- Name: risk_treatment; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.risk_treatment AS ENUM (
    'ACCEPT',
    'MITIGATE',
    'TRANSFER',
    'AVOID'
);


--
-- Name: supplier_access_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_access_level AS ENUM (
    'NONE',
    'NETWORK',
    'VPN',
    'PRIVILEGED',
    'APPLICATION',
    'DATA'
);


--
-- Name: supplier_assessment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_assessment_status AS ENUM (
    'DRAFT',
    'IN_PROGRESS',
    'SUBMITTED',
    'APPROVED'
);


--
-- Name: supplier_assurance_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_assurance_level AS ENUM (
    'NONE',
    'BASIC',
    'STANDARD',
    'ADVANCED'
);


--
-- Name: supplier_contract_clause_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_contract_clause_category AS ENUM (
    'INCIDENT',
    'AUDIT',
    'ACCESS',
    'SUBPROCESSOR',
    'VULN',
    'BC_DR',
    'DATA',
    'SDLC'
);


--
-- Name: supplier_contract_doc_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_contract_doc_status AS ENUM (
    'DRAFT',
    'ACTIVE',
    'EXPIRED',
    'TERMINATED'
);


--
-- Name: supplier_contract_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_contract_status AS ENUM (
    'NONE',
    'DRAFT',
    'ACTIVE',
    'EXPIRED',
    'TERMINATED'
);


--
-- Name: supplier_criticality_impact; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_criticality_impact AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: supplier_data_classification; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_data_classification AS ENUM (
    'PUBLIC',
    'INTERNAL',
    'CONFIDENTIAL',
    'RESTRICTED'
);


--
-- Name: supplier_dependency_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_dependency_type AS ENUM (
    'SERVICE',
    'SYSTEM',
    'APPLICATION',
    'DATASET',
    'PROCESS',
    'LOCATION'
);


--
-- Name: supplier_exception_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_exception_type AS ENUM (
    'REQUIREMENT_WAIVER',
    'RISK_ACCEPTANCE',
    'TEMPORARY_COMPENSATING_CONTROL'
);


--
-- Name: supplier_incident_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_incident_severity AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: supplier_incident_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_incident_status_enum AS ENUM (
    'OPEN',
    'CONTAINED',
    'RESOLVED',
    'CLOSED'
);


--
-- Name: supplier_question_response_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_question_response_type AS ENUM (
    'YES_NO',
    'SCALE',
    'TEXT',
    'MULTI'
);


--
-- Name: supplier_requirement_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_requirement_status AS ENUM (
    'NOT_SET',
    'IN_CONTRACT',
    'IMPLEMENTED',
    'VERIFIED',
    'EXCEPTION'
);


--
-- Name: supplier_risk_rating; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_risk_rating AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: supplier_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'ONBOARDING'
);


--
-- Name: supplier_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_type AS ENUM (
    'ICT',
    'CLOUD',
    'MSP',
    'MSSP',
    'SOFTWARE',
    'HARDWARE',
    'OUTSOURCER',
    'TELCO',
    'CONSULTING',
    'OTHER'
);


--
-- Name: task_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_status AS ENUM (
    'TODO',
    'IN_PROGRESS',
    'IN_REVIEW',
    'DONE'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'PLATFORM_ADMIN',
    'TENANT_ADMIN',
    'TENANT_MANAGER',
    'TENANT_USER',
    'READONLY_AUDITOR'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: applicability_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.applicability_rules (
    id integer NOT NULL,
    control_objective_id integer NOT NULL,
    rule jsonb NOT NULL
);


--
-- Name: applicability_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.applicability_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: applicability_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.applicability_rules_id_seq OWNED BY public.applicability_rules.id;


--
-- Name: assessment_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.assessment_responses (
    id integer NOT NULL,
    assessment_id integer NOT NULL,
    control_objective_id integer NOT NULL,
    implementation_status public.implementation_status DEFAULT 'NOT_STARTED'::public.implementation_status NOT NULL,
    maturity_level integer DEFAULT 0 NOT NULL,
    evidence_confidence public.evidence_confidence DEFAULT 'NONE'::public.evidence_confidence NOT NULL,
    notes text,
    updated_by integer,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: assessment_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.assessment_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assessment_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessment_responses_id_seq OWNED BY public.assessment_responses.id;


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.assessments (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    name text NOT NULL,
    scope text,
    created_by integer NOT NULL,
    status public.assessment_status DEFAULT 'DRAFT'::public.assessment_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessments_id_seq OWNED BY public.assessments.id;


--
-- Name: atomic_assessment_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.atomic_assessment_responses (
    id integer NOT NULL,
    atomic_assessment_id integer NOT NULL,
    atomic_control_id integer NOT NULL,
    implementation_status public.atomic_implementation_status DEFAULT 'NOT_STARTED'::public.atomic_implementation_status NOT NULL,
    maturity_level integer DEFAULT 0 NOT NULL,
    confidence public.atomic_confidence DEFAULT 'NONE'::public.atomic_confidence NOT NULL,
    notes text,
    answered_by integer,
    answered_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: atomic_assessment_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.atomic_assessment_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: atomic_assessment_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.atomic_assessment_responses_id_seq OWNED BY public.atomic_assessment_responses.id;


--
-- Name: atomic_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.atomic_assessments (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    name text NOT NULL,
    scope text,
    created_by integer NOT NULL,
    status public.assessment_status DEFAULT 'DRAFT'::public.assessment_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    submitted_at timestamp without time zone,
    parent_assessment_id integer
);


--
-- Name: atomic_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.atomic_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: atomic_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.atomic_assessments_id_seq OWNED BY public.atomic_assessments.id;


--
-- Name: atomic_controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.atomic_controls (
    id integer NOT NULL,
    control_id text NOT NULL,
    source_key text NOT NULL,
    legal_ref text NOT NULL,
    clause_path text NOT NULL,
    short_title text NOT NULL,
    obligation_text text NOT NULL,
    obligation_verb text,
    applicability jsonb DEFAULT '{}'::jsonb,
    evidence_types jsonb DEFAULT '[]'::jsonb,
    test_procedure jsonb DEFAULT '{}'::jsonb,
    domain text DEFAULT 'Governance'::text,
    weight integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    content_hash text
);


--
-- Name: atomic_controls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.atomic_controls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: atomic_controls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.atomic_controls_id_seq OWNED BY public.atomic_controls.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id integer NOT NULL,
    tenant_id integer,
    actor_user_id integer,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    details jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    ip text
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: control_crosswalks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.control_crosswalks (
    id integer NOT NULL,
    from_atomic_control_id integer NOT NULL,
    to_atomic_control_id integer,
    to_external_control_id integer,
    relationship public.crosswalk_relationship NOT NULL,
    confidence integer DEFAULT 50 NOT NULL,
    direction text DEFAULT 'BIDIRECTIONAL'::text NOT NULL,
    rationale text,
    provenance text,
    content_hash text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    review_status public.edge_review_status DEFAULT 'DRAFT'::public.edge_review_status NOT NULL,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    review_note text
);


--
-- Name: control_crosswalks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.control_crosswalks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: control_crosswalks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.control_crosswalks_id_seq OWNED BY public.control_crosswalks.id;


--
-- Name: control_objective_atomic_maps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.control_objective_atomic_maps (
    id integer NOT NULL,
    control_objective_id integer NOT NULL,
    atomic_control_id integer NOT NULL,
    confidence integer DEFAULT 50 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: control_objective_atomic_maps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.control_objective_atomic_maps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: control_objective_atomic_maps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.control_objective_atomic_maps_id_seq OWNED BY public.control_objective_atomic_maps.id;


--
-- Name: control_objectives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.control_objectives (
    id integer NOT NULL,
    requirement_id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    guidance text,
    evidence_types jsonb DEFAULT '[]'::jsonb,
    sector_pack_id integer,
    domain text DEFAULT 'Governance'::text,
    weight integer DEFAULT 1 NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb
);


--
-- Name: control_objectives_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.control_objectives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: control_objectives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.control_objectives_id_seq OWNED BY public.control_objectives.id;


--
-- Name: control_pack_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.control_pack_versions (
    id integer NOT NULL,
    source_key text NOT NULL,
    generated_at timestamp without time zone DEFAULT now() NOT NULL,
    generator text NOT NULL,
    hash text NOT NULL,
    control_count integer DEFAULT 0 NOT NULL,
    notes text
);


--
-- Name: control_pack_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.control_pack_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: control_pack_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.control_pack_versions_id_seq OWNED BY public.control_pack_versions.id;


--
-- Name: controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.controls (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    control_objective_id integer NOT NULL,
    implementation_owner_user_id integer,
    status public.control_status DEFAULT 'NOT_IMPLEMENTED'::public.control_status NOT NULL,
    maturity_level integer DEFAULT 0 NOT NULL,
    notes text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: controls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.controls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: controls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.controls_id_seq OWNED BY public.controls.id;


--
-- Name: cross_framework_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cross_framework_suggestions (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    crosswalk_id integer NOT NULL,
    source_atomic_control_id integer NOT NULL,
    source_response_id integer,
    target_atomic_assessment_id integer NOT NULL,
    target_atomic_control_id integer NOT NULL,
    suggested_status public.atomic_implementation_status,
    suggested_maturity integer,
    suggested_confidence public.atomic_confidence,
    status public.cross_suggestion_status DEFAULT 'PENDING'::public.cross_suggestion_status NOT NULL,
    reason text,
    decided_by integer,
    decided_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    drift_detected_at timestamp without time zone,
    drift_reason public.drift_reason,
    drift_detail text,
    drift_resolved_at timestamp without time zone,
    drift_resolved_by integer
);


--
-- Name: cross_framework_suggestions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.cross_framework_suggestions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cross_framework_suggestions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cross_framework_suggestions_id_seq OWNED BY public.cross_framework_suggestions.id;


--
-- Name: dora_regulatory_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.dora_regulatory_profile (
    tenant_id integer NOT NULL,
    dora_enabled boolean DEFAULT false NOT NULL,
    dora_scope_confirmed boolean DEFAULT false NOT NULL,
    dora_entity_type text,
    dora_article2_in_scope boolean DEFAULT false NOT NULL,
    dora_article2_exclusion boolean DEFAULT false NOT NULL,
    dora_article16_simplified boolean DEFAULT false NOT NULL,
    dora_microenterprise boolean DEFAULT false NOT NULL,
    eu_eea_financial_entity boolean DEFAULT false NOT NULL,
    competent_authority text,
    country text,
    uses_ict_third_party_services boolean DEFAULT false NOT NULL,
    has_critical_or_important_functions boolean DEFAULT false NOT NULL,
    ict_services_support_critical_or_important_functions boolean DEFAULT false NOT NULL,
    payment_related_entity boolean DEFAULT false NOT NULL,
    tlpt_selected_or_required boolean DEFAULT false NOT NULL,
    participates_in_information_sharing boolean DEFAULT false NOT NULL,
    ict_third_party_provider_profile boolean DEFAULT false NOT NULL,
    critical_ict_third_party_provider_designated boolean DEFAULT false NOT NULL,
    dora_applicability_notes text,
    dora_last_scope_review_date timestamp without time zone,
    dora_scope_reviewed_by integer,
    admin_override_enabled boolean DEFAULT false NOT NULL,
    admin_override_reason text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: evidence_access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.evidence_access_logs (
    id integer NOT NULL,
    evidence_id integer NOT NULL,
    actor_user_id integer NOT NULL,
    action text NOT NULL,
    ip text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: evidence_access_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.evidence_access_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evidence_access_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evidence_access_logs_id_seq OWNED BY public.evidence_access_logs.id;


--
-- Name: evidence_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.evidence_items (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    related_type text NOT NULL,
    related_id integer NOT NULL,
    filename text NOT NULL,
    mime_type text,
    size integer,
    uploaded_by integer NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now() NOT NULL,
    storage_path text,
    sha256 text,
    locked_at timestamp without time zone,
    locked_by integer,
    lock_reason text,
    assessment_id integer,
    linked_from_evidence_id integer,
    linked_via_suggestion_id integer
);


--
-- Name: evidence_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.evidence_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evidence_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evidence_items_id_seq OWNED BY public.evidence_items.id;


--
-- Name: evidence_unlock_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.evidence_unlock_requests (
    id integer NOT NULL,
    evidence_id integer NOT NULL,
    tenant_id integer NOT NULL,
    requested_by integer NOT NULL,
    approved_by integer,
    reason text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    decided_at timestamp without time zone
);


--
-- Name: evidence_unlock_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.evidence_unlock_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evidence_unlock_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evidence_unlock_requests_id_seq OWNED BY public.evidence_unlock_requests.id;


--
-- Name: external_framework_controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.external_framework_controls (
    id integer NOT NULL,
    framework_key text NOT NULL,
    control_ref text NOT NULL,
    title text NOT NULL,
    description text,
    source_url text,
    content_hash text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: external_framework_controls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.external_framework_controls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: external_framework_controls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_framework_controls_id_seq OWNED BY public.external_framework_controls.id;


--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.feature_flags (
    id integer NOT NULL,
    tenant_id integer,
    key text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: feature_flags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.feature_flags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feature_flags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feature_flags_id_seq OWNED BY public.feature_flags.id;


--
-- Name: import_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.import_runs (
    id integer NOT NULL,
    source_key text NOT NULL,
    actor_user_id integer NOT NULL,
    mode text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    added_count integer DEFAULT 0 NOT NULL,
    updated_count integer DEFAULT 0 NOT NULL,
    unchanged_count integer DEFAULT 0 NOT NULL,
    deactivated_count integer DEFAULT 0 NOT NULL,
    total_count integer DEFAULT 0 NOT NULL,
    pack_hash text,
    error_summary jsonb,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    finished_at timestamp without time zone
);


--
-- Name: import_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.import_runs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: import_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.import_runs_id_seq OWNED BY public.import_runs.id;


--
-- Name: incident_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.incident_cases (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    title text NOT NULL,
    description text,
    severity public.incident_severity DEFAULT 'MEDIUM'::public.incident_severity NOT NULL,
    is_significant boolean DEFAULT false NOT NULL,
    detected_at timestamp without time zone DEFAULT now() NOT NULL,
    status public.incident_status DEFAULT 'DETECTED'::public.incident_status NOT NULL,
    early_warning_due_at timestamp without time zone,
    notification_due_at timestamp without time zone,
    final_report_due_at timestamp without time zone,
    created_by integer NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: incident_cases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.incident_cases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: incident_cases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.incident_cases_id_seq OWNED BY public.incident_cases.id;


--
-- Name: incident_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.incident_notifications (
    id integer NOT NULL,
    incident_id integer NOT NULL,
    type public.notification_type NOT NULL,
    prepared_at timestamp without time zone,
    sent_at timestamp without time zone,
    channel text,
    content jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: incident_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.incident_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: incident_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.incident_notifications_id_seq OWNED BY public.incident_notifications.id;


--
-- Name: invite_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.invite_tokens (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    email text NOT NULL,
    role public.user_role DEFAULT 'TENANT_USER'::public.user_role NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    accepted_by_user_id integer
);


--
-- Name: invite_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.invite_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invite_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invite_tokens_id_seq OWNED BY public.invite_tokens.id;


--
-- Name: legal_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.legal_sources (
    id integer NOT NULL,
    key text NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    version text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: legal_sources_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.legal_sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: legal_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.legal_sources_id_seq OWNED BY public.legal_sources.id;


--
-- Name: nis2_regulatory_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.nis2_regulatory_profile (
    tenant_id integer NOT NULL,
    nis2_scope_confirmed boolean DEFAULT false NOT NULL,
    established_in_eu_eea boolean DEFAULT true NOT NULL,
    country text,
    competent_authority text,
    sector_group text,
    sector text,
    subsector text,
    employee_count integer,
    annual_turnover_meur integer,
    balance_sheet_meur integer,
    size_class public.nis2_size_class,
    size_independent_entity boolean DEFAULT false NOT NULL,
    size_independent_reason text,
    public_administration_entity boolean DEFAULT false NOT NULL,
    sole_provider_in_member_state boolean DEFAULT false NOT NULL,
    member_state_designated_in_scope boolean DEFAULT false NOT NULL,
    explicitly_excluded_by_member_state boolean DEFAULT false NOT NULL,
    operates_in_multiple_member_states boolean DEFAULT false NOT NULL,
    admin_override_enabled boolean DEFAULT false NOT NULL,
    admin_override_entity_class public.nis2_entity_class,
    admin_override_reason text,
    computed_in_scope boolean DEFAULT false NOT NULL,
    computed_entity_class public.nis2_entity_class,
    computed_reason text,
    nis2_applicability_notes text,
    nis2_last_scope_review_date timestamp without time zone,
    nis2_scope_reviewed_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: password_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.password_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: password_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.password_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_history_id_seq OWNED BY public.password_history.id;


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.platform_settings (
    id integer NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.platform_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: platform_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.platform_settings_id_seq OWNED BY public.platform_settings.id;


--
-- Name: requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.requirements (
    id integer NOT NULL,
    code text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    nis2_article text NOT NULL,
    nis2_paragraph text,
    greek_ref text,
    category text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.requirements_id_seq OWNED BY public.requirements.id;


--
-- Name: risk_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.risk_items (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    title text NOT NULL,
    likelihood integer DEFAULT 3 NOT NULL,
    impact integer DEFAULT 3 NOT NULL,
    treatment public.risk_treatment DEFAULT 'MITIGATE'::public.risk_treatment NOT NULL,
    owner_user_id integer,
    status public.risk_status DEFAULT 'IDENTIFIED'::public.risk_status NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    description text
);


--
-- Name: risk_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.risk_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: risk_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.risk_items_id_seq OWNED BY public.risk_items.id;


--
-- Name: risk_library_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.risk_library_entries (
    id integer NOT NULL,
    library_code text NOT NULL,
    risk_id text NOT NULL,
    framework_context text,
    category text NOT NULL,
    title text NOT NULL,
    risk_statement text,
    typical_impact text,
    regulatory_mapping text,
    affected_assets_or_services text,
    default_likelihood text,
    default_impact text,
    default_risk_rating text,
    default_treatment_option text,
    treatment_direction text,
    suggested_controls jsonb DEFAULT '[]'::jsonb,
    suggested_evidence jsonb DEFAULT '[]'::jsonb,
    default_owner_role text,
    review_frequency text,
    tags jsonb DEFAULT '[]'::jsonb,
    default_status text DEFAULT 'Not Assessed'::text NOT NULL,
    source_url text,
    notes text,
    content_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: risk_library_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.risk_library_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: risk_library_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.risk_library_entries_id_seq OWNED BY public.risk_library_entries.id;


--
-- Name: scope_check_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.scope_check_leads (
    id integer NOT NULL,
    email text NOT NULL,
    report_token text NOT NULL,
    answers jsonb NOT NULL,
    verdict jsonb NOT NULL,
    control_stats jsonb,
    consent_text text NOT NULL,
    consent_marketing boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    converted_tenant_id integer,
    converted_at timestamp without time zone,
    deleted_at timestamp without time zone
);


--
-- Name: scope_check_leads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.scope_check_leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scope_check_leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scope_check_leads_id_seq OWNED BY public.scope_check_leads.id;


--
-- Name: sector_packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sector_packs (
    id integer NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text,
    applies_to jsonb,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: sector_packs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.sector_packs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sector_packs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sector_packs_id_seq OWNED BY public.sector_packs.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: supplier_assessment_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.supplier_assessment_responses (
    id integer NOT NULL,
    supplier_assessment_id integer NOT NULL,
    question_id integer NOT NULL,
    answer jsonb,
    score real,
    notes text,
    evidence_link_id integer,
    answered_by integer,
    answered_at timestamp without time zone DEFAULT now()
);


--
-- Name: supplier_assessment_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.supplier_assessment_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_assessment_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_assessment_responses_id_seq OWNED BY public.supplier_assessment_responses.id;


--
-- Name: supplier_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.supplier_assessments (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    supplier_id integer NOT NULL,
    template_id integer NOT NULL,
    supplier_assessment_status public.supplier_assessment_status DEFAULT 'DRAFT'::public.supplier_assessment_status NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    submitted_at timestamp without time zone,
    approved_by integer,
    approved_at timestamp without time zone,
    score real,
    risk_rating public.supplier_risk_rating
);


--
-- Name: supplier_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.supplier_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_assessments_id_seq OWNED BY public.supplier_assessments.id;


--
-- Name: supplier_contract_clause_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.supplier_contract_clause_instances (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    clause_library_id integer NOT NULL,
    is_included boolean DEFAULT false NOT NULL,
    notes text
);


--
-- Name: supplier_contract_clause_instances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.supplier_contract_clause_instances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_contract_clause_instances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_contract_clause_instances_id_seq OWNED BY public.supplier_contract_clause_instances.id;


--
-- Name: supplier_contract_clause_library; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.supplier_contract_clause_library (
    id integer NOT NULL,
    key text NOT NULL,
    title text NOT NULL,
    clause_text text NOT NULL,
    category public.supplier_contract_clause_category NOT NULL,
    mapping jsonb
);


--
-- Name: supplier_contract_clause_library_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.supplier_contract_clause_library_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_contract_clause_library_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_contract_clause_library_id_seq OWNED BY public.supplier_contract_clause_library.id;


--
-- Name: supplier_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.supplier_contracts (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    supplier_id integer NOT NULL,
    title text NOT NULL,
    contract_doc_status public.supplier_contract_doc_status DEFAULT 'DRAFT'::public.supplier_contract_doc_status NOT NULL,
    signed_at timestamp without time zone,
    expires_at timestamp without time zone,
    file_evidence_id integer
);


--
-- Name: supplier_contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.supplier_contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_contracts_id_seq OWNED BY public.supplier_contracts.id;


--
-- Name: supplier_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.supplier_exceptions (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    supplier_id integer NOT NULL,
    exception_type public.supplier_exception_type NOT NULL,
    reason text NOT NULL,
    compensating_controls text,
    expiry_date timestamp without time zone,
    requested_by integer NOT NULL,
    approved_by integer,
    approved_at timestamp without time zone,
    evidence_link_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: supplier_exceptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.supplier_exceptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_exceptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_exceptions_id_seq OWNED BY public.supplier_exceptions.id;


--
-- Name: supplier_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.supplier_incidents (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    supplier_id integer NOT NULL,
    title text NOT NULL,
    description text,
    detected_at timestamp without time zone DEFAULT now() NOT NULL,
    notified_at timestamp without time zone,
    affects_services jsonb,
    severity public.supplier_incident_severity DEFAULT 'MEDIUM'::public.supplier_incident_severity NOT NULL,
    supplier_incident_status public.supplier_incident_status_enum DEFAULT 'OPEN'::public.supplier_incident_status_enum NOT NULL,
    requires_nis2_reporting boolean DEFAULT false,
    linked_platform_incident_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: supplier_incidents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.supplier_incidents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_incidents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_incidents_id_seq OWNED BY public.supplier_incidents.id;


--
-- Name: supplier_questionnaire_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.supplier_questionnaire_questions (
    id integer NOT NULL,
    template_id integer NOT NULL,
    section text NOT NULL,
    question_text text NOT NULL,
    response_type public.supplier_question_response_type DEFAULT 'YES_NO'::public.supplier_question_response_type NOT NULL,
    weight integer DEFAULT 1 NOT NULL,
    evidence_required boolean DEFAULT false NOT NULL,
    evidence_types jsonb,
    nis2_ref jsonb,
    cir_ref jsonb,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: supplier_questionnaire_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.supplier_questionnaire_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_questionnaire_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_questionnaire_questions_id_seq OWNED BY public.supplier_questionnaire_questions.id;


--
-- Name: supplier_questionnaire_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.supplier_questionnaire_templates (
    id integer NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    version text DEFAULT '1.0'::text NOT NULL,
    applies_to jsonb,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: supplier_questionnaire_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.supplier_questionnaire_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_questionnaire_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_questionnaire_templates_id_seq OWNED BY public.supplier_questionnaire_templates.id;


--
-- Name: supplier_security_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.supplier_security_requirements (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    supplier_id integer NOT NULL,
    requirement_key text NOT NULL,
    title text NOT NULL,
    description text,
    required_for_tier text DEFAULT 'HIGH'::text NOT NULL,
    supplier_requirement_status public.supplier_requirement_status DEFAULT 'NOT_SET'::public.supplier_requirement_status NOT NULL,
    evidence_link_id integer,
    review_due_at timestamp without time zone
);


--
-- Name: supplier_security_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.supplier_security_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_security_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_security_requirements_id_seq OWNED BY public.supplier_security_requirements.id;


--
-- Name: supplier_service_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.supplier_service_dependencies (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    supplier_id integer NOT NULL,
    dependency_type public.supplier_dependency_type DEFAULT 'SERVICE'::public.supplier_dependency_type NOT NULL,
    name text NOT NULL,
    criticality_impact public.supplier_criticality_impact DEFAULT 'LOW'::public.supplier_criticality_impact NOT NULL,
    description text
);


--
-- Name: supplier_service_dependencies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.supplier_service_dependencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_service_dependencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_service_dependencies_id_seq OWNED BY public.supplier_service_dependencies.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.suppliers (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    name text NOT NULL,
    criticality text DEFAULT 'low'::text NOT NULL,
    services text,
    last_assessment_at timestamp without time zone,
    notes text,
    supplier_type public.supplier_type,
    legal_name text,
    tax_id_or_reg_no text,
    country text,
    website text,
    primary_contact_name text,
    primary_contact_email text,
    security_contact_email text,
    incident_hotline text,
    contract_status public.supplier_contract_status DEFAULT 'NONE'::public.supplier_contract_status,
    contract_start_date timestamp without time zone,
    contract_end_date timestamp without time zone,
    renewal_date timestamp without time zone,
    access_level public.supplier_access_level DEFAULT 'NONE'::public.supplier_access_level,
    data_types jsonb,
    data_classification public.supplier_data_classification DEFAULT 'PUBLIC'::public.supplier_data_classification,
    subprocessors_allowed boolean DEFAULT false,
    last_review_at timestamp without time zone,
    next_review_due_at timestamp without time zone,
    inherent_risk_score integer DEFAULT 0,
    residual_risk_score integer DEFAULT 0,
    assurance_level public.supplier_assurance_level DEFAULT 'NONE'::public.supplier_assurance_level,
    supplier_status public.supplier_status DEFAULT 'ACTIVE'::public.supplier_status
);


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: task_atomic_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.task_atomic_links (
    id integer NOT NULL,
    task_id integer NOT NULL,
    atomic_control_id integer NOT NULL
);


--
-- Name: task_atomic_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.task_atomic_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_atomic_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_atomic_links_id_seq OWNED BY public.task_atomic_links.id;


--
-- Name: task_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.task_comments (
    id integer NOT NULL,
    task_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: task_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.task_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_comments_id_seq OWNED BY public.task_comments.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.tasks (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    control_objective_id integer,
    title text NOT NULL,
    description text,
    owner_user_id integer,
    due_date timestamp without time zone,
    status public.task_status DEFAULT 'TODO'::public.task_status NOT NULL,
    priority public.task_priority DEFAULT 'MEDIUM'::public.task_priority NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    approver_user_id integer,
    assessment_id integer
);


--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: tenant_daily_atomic_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.tenant_daily_atomic_snapshots (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    snapshot_date text NOT NULL,
    atomic_compliance_pct real DEFAULT 0 NOT NULL,
    atomic_verified_pct real DEFAULT 0 NOT NULL,
    atomic_maturity_avg real DEFAULT 0 NOT NULL,
    atomic_overdue_tasks integer DEFAULT 0 NOT NULL,
    atomic_evidence_coverage_pct real DEFAULT 0 NOT NULL,
    last_computed_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: tenant_daily_atomic_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.tenant_daily_atomic_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenant_daily_atomic_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_daily_atomic_snapshots_id_seq OWNED BY public.tenant_daily_atomic_snapshots.id;


--
-- Name: tenant_daily_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.tenant_daily_snapshots (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    snapshot_date text NOT NULL,
    compliance_pct real DEFAULT 0 NOT NULL,
    verified_pct real DEFAULT 0 NOT NULL,
    maturity_avg real DEFAULT 0 NOT NULL,
    overdue_tasks integer DEFAULT 0 NOT NULL,
    evidence_coverage real DEFAULT 0 NOT NULL,
    incidents_open integer DEFAULT 0 NOT NULL
);


--
-- Name: tenant_daily_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.tenant_daily_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenant_daily_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_daily_snapshots_id_seq OWNED BY public.tenant_daily_snapshots.id;


--
-- Name: tenant_risk_register_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.tenant_risk_register_items (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    library_code text NOT NULL,
    risk_id text NOT NULL,
    library_entry_id integer,
    category text NOT NULL,
    title text NOT NULL,
    risk_statement text,
    typical_impact text,
    regulatory_mapping text,
    affected_assets_or_services text,
    inherent_likelihood text,
    inherent_impact text,
    inherent_risk_rating text,
    treatment_option text,
    treatment_direction text,
    suggested_controls jsonb DEFAULT '[]'::jsonb,
    suggested_evidence jsonb DEFAULT '[]'::jsonb,
    owner_user_id integer,
    status text DEFAULT 'Not Assessed'::text NOT NULL,
    treatment_status text,
    residual_likelihood text,
    residual_impact text,
    residual_risk_rating text,
    treatment_plan text,
    due_date timestamp without time zone,
    evidence_links jsonb DEFAULT '[]'::jsonb,
    acceptance_decision text,
    acceptance_approved_by integer,
    last_review_date timestamp without time zone,
    next_review_date timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: tenant_risk_register_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.tenant_risk_register_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenant_risk_register_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_risk_register_items_id_seq OWNED BY public.tenant_risk_register_items.id;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.tenants (
    id integer NOT NULL,
    name text NOT NULL,
    sector text DEFAULT 'general'::text NOT NULL,
    entity_type text DEFAULT 'essential'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    sector_group text DEFAULT 'ANNEX_I'::text,
    subsector text,
    country text,
    applicability_profile jsonb,
    status text DEFAULT 'active'::text NOT NULL,
    storage_quota_bytes bigint DEFAULT 1073741824 NOT NULL,
    storage_used_bytes bigint DEFAULT 0 NOT NULL,
    max_users integer DEFAULT 10 NOT NULL,
    max_file_size_bytes integer DEFAULT 26214400 NOT NULL,
    plan_tier text DEFAULT 'PROFESSIONAL'::text NOT NULL,
    trial_ends_at timestamp without time zone
);


--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.tenants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.users (
    id integer NOT NULL,
    tenant_id integer,
    email text NOT NULL,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    role public.user_role DEFAULT 'TENANT_USER'::public.user_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    email_verification_token text,
    email_verification_expires timestamp without time zone,
    full_access_enabled boolean DEFAULT false NOT NULL,
    password_reset_token text,
    password_reset_expires timestamp without time zone,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp without time zone,
    totp_secret text,
    totp_enabled boolean DEFAULT false NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: applicability_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applicability_rules ALTER COLUMN id SET DEFAULT nextval('public.applicability_rules_id_seq'::regclass);


--
-- Name: assessment_responses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_responses ALTER COLUMN id SET DEFAULT nextval('public.assessment_responses_id_seq'::regclass);


--
-- Name: assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments ALTER COLUMN id SET DEFAULT nextval('public.assessments_id_seq'::regclass);


--
-- Name: atomic_assessment_responses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atomic_assessment_responses ALTER COLUMN id SET DEFAULT nextval('public.atomic_assessment_responses_id_seq'::regclass);


--
-- Name: atomic_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atomic_assessments ALTER COLUMN id SET DEFAULT nextval('public.atomic_assessments_id_seq'::regclass);


--
-- Name: atomic_controls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atomic_controls ALTER COLUMN id SET DEFAULT nextval('public.atomic_controls_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: control_crosswalks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_crosswalks ALTER COLUMN id SET DEFAULT nextval('public.control_crosswalks_id_seq'::regclass);


--
-- Name: control_objective_atomic_maps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_objective_atomic_maps ALTER COLUMN id SET DEFAULT nextval('public.control_objective_atomic_maps_id_seq'::regclass);


--
-- Name: control_objectives id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_objectives ALTER COLUMN id SET DEFAULT nextval('public.control_objectives_id_seq'::regclass);


--
-- Name: control_pack_versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_pack_versions ALTER COLUMN id SET DEFAULT nextval('public.control_pack_versions_id_seq'::regclass);


--
-- Name: controls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls ALTER COLUMN id SET DEFAULT nextval('public.controls_id_seq'::regclass);


--
-- Name: cross_framework_suggestions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_framework_suggestions ALTER COLUMN id SET DEFAULT nextval('public.cross_framework_suggestions_id_seq'::regclass);


--
-- Name: evidence_access_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_access_logs ALTER COLUMN id SET DEFAULT nextval('public.evidence_access_logs_id_seq'::regclass);


--
-- Name: evidence_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_items ALTER COLUMN id SET DEFAULT nextval('public.evidence_items_id_seq'::regclass);


--
-- Name: evidence_unlock_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_unlock_requests ALTER COLUMN id SET DEFAULT nextval('public.evidence_unlock_requests_id_seq'::regclass);


--
-- Name: external_framework_controls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_framework_controls ALTER COLUMN id SET DEFAULT nextval('public.external_framework_controls_id_seq'::regclass);


--
-- Name: feature_flags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags ALTER COLUMN id SET DEFAULT nextval('public.feature_flags_id_seq'::regclass);


--
-- Name: import_runs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_runs ALTER COLUMN id SET DEFAULT nextval('public.import_runs_id_seq'::regclass);


--
-- Name: incident_cases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_cases ALTER COLUMN id SET DEFAULT nextval('public.incident_cases_id_seq'::regclass);


--
-- Name: incident_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_notifications ALTER COLUMN id SET DEFAULT nextval('public.incident_notifications_id_seq'::regclass);


--
-- Name: invite_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_tokens ALTER COLUMN id SET DEFAULT nextval('public.invite_tokens_id_seq'::regclass);


--
-- Name: legal_sources id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_sources ALTER COLUMN id SET DEFAULT nextval('public.legal_sources_id_seq'::regclass);


--
-- Name: password_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_history ALTER COLUMN id SET DEFAULT nextval('public.password_history_id_seq'::regclass);


--
-- Name: platform_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings ALTER COLUMN id SET DEFAULT nextval('public.platform_settings_id_seq'::regclass);


--
-- Name: requirements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements ALTER COLUMN id SET DEFAULT nextval('public.requirements_id_seq'::regclass);


--
-- Name: risk_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_items ALTER COLUMN id SET DEFAULT nextval('public.risk_items_id_seq'::regclass);


--
-- Name: risk_library_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_library_entries ALTER COLUMN id SET DEFAULT nextval('public.risk_library_entries_id_seq'::regclass);


--
-- Name: scope_check_leads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_check_leads ALTER COLUMN id SET DEFAULT nextval('public.scope_check_leads_id_seq'::regclass);


--
-- Name: sector_packs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_packs ALTER COLUMN id SET DEFAULT nextval('public.sector_packs_id_seq'::regclass);


--
-- Name: supplier_assessment_responses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_assessment_responses ALTER COLUMN id SET DEFAULT nextval('public.supplier_assessment_responses_id_seq'::regclass);


--
-- Name: supplier_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_assessments ALTER COLUMN id SET DEFAULT nextval('public.supplier_assessments_id_seq'::regclass);


--
-- Name: supplier_contract_clause_instances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_contract_clause_instances ALTER COLUMN id SET DEFAULT nextval('public.supplier_contract_clause_instances_id_seq'::regclass);


--
-- Name: supplier_contract_clause_library id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_contract_clause_library ALTER COLUMN id SET DEFAULT nextval('public.supplier_contract_clause_library_id_seq'::regclass);


--
-- Name: supplier_contracts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_contracts ALTER COLUMN id SET DEFAULT nextval('public.supplier_contracts_id_seq'::regclass);


--
-- Name: supplier_exceptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_exceptions ALTER COLUMN id SET DEFAULT nextval('public.supplier_exceptions_id_seq'::regclass);


--
-- Name: supplier_incidents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_incidents ALTER COLUMN id SET DEFAULT nextval('public.supplier_incidents_id_seq'::regclass);


--
-- Name: supplier_questionnaire_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_questionnaire_questions ALTER COLUMN id SET DEFAULT nextval('public.supplier_questionnaire_questions_id_seq'::regclass);


--
-- Name: supplier_questionnaire_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_questionnaire_templates ALTER COLUMN id SET DEFAULT nextval('public.supplier_questionnaire_templates_id_seq'::regclass);


--
-- Name: supplier_security_requirements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_security_requirements ALTER COLUMN id SET DEFAULT nextval('public.supplier_security_requirements_id_seq'::regclass);


--
-- Name: supplier_service_dependencies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_service_dependencies ALTER COLUMN id SET DEFAULT nextval('public.supplier_service_dependencies_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: task_atomic_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_atomic_links ALTER COLUMN id SET DEFAULT nextval('public.task_atomic_links_id_seq'::regclass);


--
-- Name: task_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments ALTER COLUMN id SET DEFAULT nextval('public.task_comments_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: tenant_daily_atomic_snapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_daily_atomic_snapshots ALTER COLUMN id SET DEFAULT nextval('public.tenant_daily_atomic_snapshots_id_seq'::regclass);


--
-- Name: tenant_daily_snapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_daily_snapshots ALTER COLUMN id SET DEFAULT nextval('public.tenant_daily_snapshots_id_seq'::regclass);


--
-- Name: tenant_risk_register_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_risk_register_items ALTER COLUMN id SET DEFAULT nextval('public.tenant_risk_register_items_id_seq'::regclass);


--
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: applicability_rules applicability_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applicability_rules
    ADD CONSTRAINT applicability_rules_pkey PRIMARY KEY (id);


--
-- Name: assessment_responses assessment_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_responses
    ADD CONSTRAINT assessment_responses_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: atomic_assessment_responses atomic_assessment_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atomic_assessment_responses
    ADD CONSTRAINT atomic_assessment_responses_pkey PRIMARY KEY (id);


--
-- Name: atomic_assessments atomic_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atomic_assessments
    ADD CONSTRAINT atomic_assessments_pkey PRIMARY KEY (id);


--
-- Name: atomic_controls atomic_controls_control_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atomic_controls
    ADD CONSTRAINT atomic_controls_control_id_unique UNIQUE (control_id);


--
-- Name: atomic_controls atomic_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atomic_controls
    ADD CONSTRAINT atomic_controls_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: control_crosswalks control_crosswalks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_crosswalks
    ADD CONSTRAINT control_crosswalks_pkey PRIMARY KEY (id);


--
-- Name: control_objective_atomic_maps control_objective_atomic_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_objective_atomic_maps
    ADD CONSTRAINT control_objective_atomic_maps_pkey PRIMARY KEY (id);


--
-- Name: control_objectives control_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_objectives
    ADD CONSTRAINT control_objectives_pkey PRIMARY KEY (id);


--
-- Name: control_pack_versions control_pack_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_pack_versions
    ADD CONSTRAINT control_pack_versions_pkey PRIMARY KEY (id);


--
-- Name: controls controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls
    ADD CONSTRAINT controls_pkey PRIMARY KEY (id);


--
-- Name: cross_framework_suggestions cross_framework_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_framework_suggestions
    ADD CONSTRAINT cross_framework_suggestions_pkey PRIMARY KEY (id);


--
-- Name: cross_framework_suggestions cross_framework_suggestions_tenant_id_target_atomic_assessment_; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_framework_suggestions
    ADD CONSTRAINT cross_framework_suggestions_tenant_id_target_atomic_assessment_ UNIQUE (tenant_id, target_atomic_assessment_id, target_atomic_control_id, crosswalk_id);


--
-- Name: dora_regulatory_profile dora_regulatory_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dora_regulatory_profile
    ADD CONSTRAINT dora_regulatory_profile_pkey PRIMARY KEY (tenant_id);


--
-- Name: evidence_access_logs evidence_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_access_logs
    ADD CONSTRAINT evidence_access_logs_pkey PRIMARY KEY (id);


--
-- Name: evidence_items evidence_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_items
    ADD CONSTRAINT evidence_items_pkey PRIMARY KEY (id);


--
-- Name: evidence_unlock_requests evidence_unlock_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_unlock_requests
    ADD CONSTRAINT evidence_unlock_requests_pkey PRIMARY KEY (id);


--
-- Name: external_framework_controls external_framework_controls_framework_key_control_ref_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_framework_controls
    ADD CONSTRAINT external_framework_controls_framework_key_control_ref_unique UNIQUE (framework_key, control_ref);


--
-- Name: external_framework_controls external_framework_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_framework_controls
    ADD CONSTRAINT external_framework_controls_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: import_runs import_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_runs
    ADD CONSTRAINT import_runs_pkey PRIMARY KEY (id);


--
-- Name: incident_cases incident_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_cases
    ADD CONSTRAINT incident_cases_pkey PRIMARY KEY (id);


--
-- Name: incident_notifications incident_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_notifications
    ADD CONSTRAINT incident_notifications_pkey PRIMARY KEY (id);


--
-- Name: invite_tokens invite_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_tokens
    ADD CONSTRAINT invite_tokens_pkey PRIMARY KEY (id);


--
-- Name: legal_sources legal_sources_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_sources
    ADD CONSTRAINT legal_sources_key_unique UNIQUE (key);


--
-- Name: legal_sources legal_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_sources
    ADD CONSTRAINT legal_sources_pkey PRIMARY KEY (id);


--
-- Name: nis2_regulatory_profile nis2_regulatory_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nis2_regulatory_profile
    ADD CONSTRAINT nis2_regulatory_profile_pkey PRIMARY KEY (tenant_id);


--
-- Name: password_history password_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_key_unique UNIQUE (key);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: requirements requirements_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_code_unique UNIQUE (code);


--
-- Name: requirements requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_pkey PRIMARY KEY (id);


--
-- Name: risk_items risk_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_items
    ADD CONSTRAINT risk_items_pkey PRIMARY KEY (id);


--
-- Name: risk_library_entries risk_library_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_library_entries
    ADD CONSTRAINT risk_library_entries_pkey PRIMARY KEY (id);


--
-- Name: scope_check_leads scope_check_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_check_leads
    ADD CONSTRAINT scope_check_leads_pkey PRIMARY KEY (id);


--
-- Name: scope_check_leads scope_check_leads_report_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_check_leads
    ADD CONSTRAINT scope_check_leads_report_token_key UNIQUE (report_token);


--
-- Name: sector_packs sector_packs_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_packs
    ADD CONSTRAINT sector_packs_key_unique UNIQUE (key);


--
-- Name: sector_packs sector_packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_packs
    ADD CONSTRAINT sector_packs_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: supplier_assessment_responses supplier_assessment_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_assessment_responses
    ADD CONSTRAINT supplier_assessment_responses_pkey PRIMARY KEY (id);


--
-- Name: supplier_assessments supplier_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_assessments
    ADD CONSTRAINT supplier_assessments_pkey PRIMARY KEY (id);


--
-- Name: supplier_contract_clause_instances supplier_contract_clause_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_contract_clause_instances
    ADD CONSTRAINT supplier_contract_clause_instances_pkey PRIMARY KEY (id);


--
-- Name: supplier_contract_clause_library supplier_contract_clause_library_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_contract_clause_library
    ADD CONSTRAINT supplier_contract_clause_library_key_unique UNIQUE (key);


--
-- Name: supplier_contract_clause_library supplier_contract_clause_library_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_contract_clause_library
    ADD CONSTRAINT supplier_contract_clause_library_pkey PRIMARY KEY (id);


--
-- Name: supplier_contracts supplier_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_contracts
    ADD CONSTRAINT supplier_contracts_pkey PRIMARY KEY (id);


--
-- Name: supplier_exceptions supplier_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_exceptions
    ADD CONSTRAINT supplier_exceptions_pkey PRIMARY KEY (id);


--
-- Name: supplier_incidents supplier_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_incidents
    ADD CONSTRAINT supplier_incidents_pkey PRIMARY KEY (id);


--
-- Name: supplier_questionnaire_questions supplier_questionnaire_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_questionnaire_questions
    ADD CONSTRAINT supplier_questionnaire_questions_pkey PRIMARY KEY (id);


--
-- Name: supplier_questionnaire_templates supplier_questionnaire_templates_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_questionnaire_templates
    ADD CONSTRAINT supplier_questionnaire_templates_key_unique UNIQUE (key);


--
-- Name: supplier_questionnaire_templates supplier_questionnaire_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_questionnaire_templates
    ADD CONSTRAINT supplier_questionnaire_templates_pkey PRIMARY KEY (id);


--
-- Name: supplier_security_requirements supplier_security_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_security_requirements
    ADD CONSTRAINT supplier_security_requirements_pkey PRIMARY KEY (id);


--
-- Name: supplier_service_dependencies supplier_service_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_service_dependencies
    ADD CONSTRAINT supplier_service_dependencies_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: task_atomic_links task_atomic_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_atomic_links
    ADD CONSTRAINT task_atomic_links_pkey PRIMARY KEY (id);


--
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: tenant_daily_atomic_snapshots tenant_daily_atomic_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_daily_atomic_snapshots
    ADD CONSTRAINT tenant_daily_atomic_snapshots_pkey PRIMARY KEY (id);


--
-- Name: tenant_daily_snapshots tenant_daily_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_daily_snapshots
    ADD CONSTRAINT tenant_daily_snapshots_pkey PRIMARY KEY (id);


--
-- Name: tenant_risk_register_items tenant_risk_register_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_risk_register_items
    ADD CONSTRAINT tenant_risk_register_items_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: risk_library_entries_lib_risk_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS risk_library_entries_lib_risk_uniq ON public.risk_library_entries USING btree (library_code, risk_id);


--
-- Name: tenant_risk_register_tenant_lib_risk_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS tenant_risk_register_tenant_lib_risk_uniq ON public.tenant_risk_register_items USING btree (tenant_id, library_code, risk_id);


--
-- Name: applicability_rules applicability_rules_control_objective_id_control_objectives_id_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applicability_rules
    ADD CONSTRAINT applicability_rules_control_objective_id_control_objectives_id_ FOREIGN KEY (control_objective_id) REFERENCES public.control_objectives(id);


--
-- Name: assessment_responses assessment_responses_assessment_id_assessments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_responses
    ADD CONSTRAINT assessment_responses_assessment_id_assessments_id_fk FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: assessment_responses assessment_responses_control_objective_id_control_objectives_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_responses
    ADD CONSTRAINT assessment_responses_control_objective_id_control_objectives_id FOREIGN KEY (control_objective_id) REFERENCES public.control_objectives(id);


--
-- Name: assessment_responses assessment_responses_updated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_responses
    ADD CONSTRAINT assessment_responses_updated_by_users_id_fk FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: assessments assessments_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: assessments assessments_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: atomic_assessment_responses atomic_assessment_responses_answered_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atomic_assessment_responses
    ADD CONSTRAINT atomic_assessment_responses_answered_by_users_id_fk FOREIGN KEY (answered_by) REFERENCES public.users(id);


--
-- Name: atomic_assessment_responses atomic_assessment_responses_atomic_assessment_id_atomic_assessm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atomic_assessment_responses
    ADD CONSTRAINT atomic_assessment_responses_atomic_assessment_id_atomic_assessm FOREIGN KEY (atomic_assessment_id) REFERENCES public.atomic_assessments(id);


--
-- Name: atomic_assessment_responses atomic_assessment_responses_atomic_control_id_atomic_controls_i; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atomic_assessment_responses
    ADD CONSTRAINT atomic_assessment_responses_atomic_control_id_atomic_controls_i FOREIGN KEY (atomic_control_id) REFERENCES public.atomic_controls(id);


--
-- Name: atomic_assessments atomic_assessments_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atomic_assessments
    ADD CONSTRAINT atomic_assessments_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: atomic_assessments atomic_assessments_parent_assessment_id_assessments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atomic_assessments
    ADD CONSTRAINT atomic_assessments_parent_assessment_id_assessments_id_fk FOREIGN KEY (parent_assessment_id) REFERENCES public.assessments(id);


--
-- Name: atomic_assessments atomic_assessments_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atomic_assessments
    ADD CONSTRAINT atomic_assessments_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: control_crosswalks control_crosswalks_from_atomic_control_id_atomic_controls_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_crosswalks
    ADD CONSTRAINT control_crosswalks_from_atomic_control_id_atomic_controls_id_fk FOREIGN KEY (from_atomic_control_id) REFERENCES public.atomic_controls(id);


--
-- Name: control_crosswalks control_crosswalks_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_crosswalks
    ADD CONSTRAINT control_crosswalks_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: control_crosswalks control_crosswalks_to_atomic_control_id_atomic_controls_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_crosswalks
    ADD CONSTRAINT control_crosswalks_to_atomic_control_id_atomic_controls_id_fk FOREIGN KEY (to_atomic_control_id) REFERENCES public.atomic_controls(id);


--
-- Name: control_crosswalks control_crosswalks_to_external_control_id_external_framework_co; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_crosswalks
    ADD CONSTRAINT control_crosswalks_to_external_control_id_external_framework_co FOREIGN KEY (to_external_control_id) REFERENCES public.external_framework_controls(id);


--
-- Name: control_objective_atomic_maps control_objective_atomic_maps_atomic_control_id_atomic_controls; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_objective_atomic_maps
    ADD CONSTRAINT control_objective_atomic_maps_atomic_control_id_atomic_controls FOREIGN KEY (atomic_control_id) REFERENCES public.atomic_controls(id);


--
-- Name: control_objective_atomic_maps control_objective_atomic_maps_control_objective_id_control_obje; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_objective_atomic_maps
    ADD CONSTRAINT control_objective_atomic_maps_control_objective_id_control_obje FOREIGN KEY (control_objective_id) REFERENCES public.control_objectives(id);


--
-- Name: control_objectives control_objectives_requirement_id_requirements_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_objectives
    ADD CONSTRAINT control_objectives_requirement_id_requirements_id_fk FOREIGN KEY (requirement_id) REFERENCES public.requirements(id);


--
-- Name: control_objectives control_objectives_sector_pack_id_sector_packs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_objectives
    ADD CONSTRAINT control_objectives_sector_pack_id_sector_packs_id_fk FOREIGN KEY (sector_pack_id) REFERENCES public.sector_packs(id);


--
-- Name: controls controls_control_objective_id_control_objectives_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls
    ADD CONSTRAINT controls_control_objective_id_control_objectives_id_fk FOREIGN KEY (control_objective_id) REFERENCES public.control_objectives(id);


--
-- Name: controls controls_implementation_owner_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls
    ADD CONSTRAINT controls_implementation_owner_user_id_users_id_fk FOREIGN KEY (implementation_owner_user_id) REFERENCES public.users(id);


--
-- Name: controls controls_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controls
    ADD CONSTRAINT controls_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: cross_framework_suggestions cross_framework_suggestions_crosswalk_id_control_crosswalks_id_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_framework_suggestions
    ADD CONSTRAINT cross_framework_suggestions_crosswalk_id_control_crosswalks_id_ FOREIGN KEY (crosswalk_id) REFERENCES public.control_crosswalks(id);


--
-- Name: cross_framework_suggestions cross_framework_suggestions_decided_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_framework_suggestions
    ADD CONSTRAINT cross_framework_suggestions_decided_by_users_id_fk FOREIGN KEY (decided_by) REFERENCES public.users(id);


--
-- Name: cross_framework_suggestions cross_framework_suggestions_drift_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_framework_suggestions
    ADD CONSTRAINT cross_framework_suggestions_drift_resolved_by_fkey FOREIGN KEY (drift_resolved_by) REFERENCES public.users(id);


--
-- Name: cross_framework_suggestions cross_framework_suggestions_source_atomic_control_id_atomic_con; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_framework_suggestions
    ADD CONSTRAINT cross_framework_suggestions_source_atomic_control_id_atomic_con FOREIGN KEY (source_atomic_control_id) REFERENCES public.atomic_controls(id);


--
-- Name: cross_framework_suggestions cross_framework_suggestions_source_response_id_atomic_assessmen; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_framework_suggestions
    ADD CONSTRAINT cross_framework_suggestions_source_response_id_atomic_assessmen FOREIGN KEY (source_response_id) REFERENCES public.atomic_assessment_responses(id);


--
-- Name: cross_framework_suggestions cross_framework_suggestions_target_atomic_assessment_id_atomic_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_framework_suggestions
    ADD CONSTRAINT cross_framework_suggestions_target_atomic_assessment_id_atomic_ FOREIGN KEY (target_atomic_assessment_id) REFERENCES public.atomic_assessments(id);


--
-- Name: cross_framework_suggestions cross_framework_suggestions_target_atomic_control_id_atomic_con; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_framework_suggestions
    ADD CONSTRAINT cross_framework_suggestions_target_atomic_control_id_atomic_con FOREIGN KEY (target_atomic_control_id) REFERENCES public.atomic_controls(id);


--
-- Name: cross_framework_suggestions cross_framework_suggestions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_framework_suggestions
    ADD CONSTRAINT cross_framework_suggestions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: dora_regulatory_profile dora_regulatory_profile_dora_scope_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dora_regulatory_profile
    ADD CONSTRAINT dora_regulatory_profile_dora_scope_reviewed_by_users_id_fk FOREIGN KEY (dora_scope_reviewed_by) REFERENCES public.users(id);


--
-- Name: dora_regulatory_profile dora_regulatory_profile_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dora_regulatory_profile
    ADD CONSTRAINT dora_regulatory_profile_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: evidence_access_logs evidence_access_logs_actor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_access_logs
    ADD CONSTRAINT evidence_access_logs_actor_user_id_users_id_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: evidence_access_logs evidence_access_logs_evidence_id_evidence_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_access_logs
    ADD CONSTRAINT evidence_access_logs_evidence_id_evidence_items_id_fk FOREIGN KEY (evidence_id) REFERENCES public.evidence_items(id);


--
-- Name: evidence_items evidence_items_assessment_id_assessments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_items
    ADD CONSTRAINT evidence_items_assessment_id_assessments_id_fk FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: evidence_items evidence_items_linked_from_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_items
    ADD CONSTRAINT evidence_items_linked_from_evidence_id_fkey FOREIGN KEY (linked_from_evidence_id) REFERENCES public.evidence_items(id);


--
-- Name: evidence_items evidence_items_linked_via_suggestion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_items
    ADD CONSTRAINT evidence_items_linked_via_suggestion_id_fkey FOREIGN KEY (linked_via_suggestion_id) REFERENCES public.cross_framework_suggestions(id);


--
-- Name: evidence_items evidence_items_locked_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_items
    ADD CONSTRAINT evidence_items_locked_by_users_id_fk FOREIGN KEY (locked_by) REFERENCES public.users(id);


--
-- Name: evidence_items evidence_items_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_items
    ADD CONSTRAINT evidence_items_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: evidence_items evidence_items_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_items
    ADD CONSTRAINT evidence_items_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: evidence_unlock_requests evidence_unlock_requests_approved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_unlock_requests
    ADD CONSTRAINT evidence_unlock_requests_approved_by_users_id_fk FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: evidence_unlock_requests evidence_unlock_requests_evidence_id_evidence_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_unlock_requests
    ADD CONSTRAINT evidence_unlock_requests_evidence_id_evidence_items_id_fk FOREIGN KEY (evidence_id) REFERENCES public.evidence_items(id);


--
-- Name: evidence_unlock_requests evidence_unlock_requests_requested_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_unlock_requests
    ADD CONSTRAINT evidence_unlock_requests_requested_by_users_id_fk FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: evidence_unlock_requests evidence_unlock_requests_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_unlock_requests
    ADD CONSTRAINT evidence_unlock_requests_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: feature_flags feature_flags_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: import_runs import_runs_actor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_runs
    ADD CONSTRAINT import_runs_actor_user_id_users_id_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: incident_cases incident_cases_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_cases
    ADD CONSTRAINT incident_cases_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: incident_cases incident_cases_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_cases
    ADD CONSTRAINT incident_cases_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: incident_notifications incident_notifications_incident_id_incident_cases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_notifications
    ADD CONSTRAINT incident_notifications_incident_id_incident_cases_id_fk FOREIGN KEY (incident_id) REFERENCES public.incident_cases(id);


--
-- Name: invite_tokens invite_tokens_accepted_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_tokens
    ADD CONSTRAINT invite_tokens_accepted_by_user_id_users_id_fk FOREIGN KEY (accepted_by_user_id) REFERENCES public.users(id);


--
-- Name: invite_tokens invite_tokens_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_tokens
    ADD CONSTRAINT invite_tokens_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: invite_tokens invite_tokens_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_tokens
    ADD CONSTRAINT invite_tokens_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: nis2_regulatory_profile nis2_regulatory_profile_nis2_scope_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nis2_regulatory_profile
    ADD CONSTRAINT nis2_regulatory_profile_nis2_scope_reviewed_by_users_id_fk FOREIGN KEY (nis2_scope_reviewed_by) REFERENCES public.users(id);


--
-- Name: nis2_regulatory_profile nis2_regulatory_profile_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nis2_regulatory_profile
    ADD CONSTRAINT nis2_regulatory_profile_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: password_history password_history_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: risk_items risk_items_owner_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_items
    ADD CONSTRAINT risk_items_owner_user_id_users_id_fk FOREIGN KEY (owner_user_id) REFERENCES public.users(id);


--
-- Name: risk_items risk_items_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_items
    ADD CONSTRAINT risk_items_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: scope_check_leads scope_check_leads_converted_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_check_leads
    ADD CONSTRAINT scope_check_leads_converted_tenant_id_fkey FOREIGN KEY (converted_tenant_id) REFERENCES public.tenants(id);


--
-- Name: supplier_assessment_responses supplier_assessment_responses_answered_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_assessment_responses
    ADD CONSTRAINT supplier_assessment_responses_answered_by_users_id_fk FOREIGN KEY (answered_by) REFERENCES public.users(id);


--
-- Name: supplier_assessment_responses supplier_assessment_responses_evidence_link_id_evidence_items_i; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_assessment_responses
    ADD CONSTRAINT supplier_assessment_responses_evidence_link_id_evidence_items_i FOREIGN KEY (evidence_link_id) REFERENCES public.evidence_items(id);


--
-- Name: supplier_assessment_responses supplier_assessment_responses_question_id_supplier_questionnair; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_assessment_responses
    ADD CONSTRAINT supplier_assessment_responses_question_id_supplier_questionnair FOREIGN KEY (question_id) REFERENCES public.supplier_questionnaire_questions(id);


--
-- Name: supplier_assessment_responses supplier_assessment_responses_supplier_assessment_id_supplier_a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_assessment_responses
    ADD CONSTRAINT supplier_assessment_responses_supplier_assessment_id_supplier_a FOREIGN KEY (supplier_assessment_id) REFERENCES public.supplier_assessments(id) ON DELETE CASCADE;


--
-- Name: supplier_assessments supplier_assessments_approved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_assessments
    ADD CONSTRAINT supplier_assessments_approved_by_users_id_fk FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: supplier_assessments supplier_assessments_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_assessments
    ADD CONSTRAINT supplier_assessments_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: supplier_assessments supplier_assessments_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_assessments
    ADD CONSTRAINT supplier_assessments_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_assessments supplier_assessments_template_id_supplier_questionnaire_templat; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_assessments
    ADD CONSTRAINT supplier_assessments_template_id_supplier_questionnaire_templat FOREIGN KEY (template_id) REFERENCES public.supplier_questionnaire_templates(id);


--
-- Name: supplier_assessments supplier_assessments_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_assessments
    ADD CONSTRAINT supplier_assessments_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: supplier_contract_clause_instances supplier_contract_clause_instances_clause_library_id_supplier_c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_contract_clause_instances
    ADD CONSTRAINT supplier_contract_clause_instances_clause_library_id_supplier_c FOREIGN KEY (clause_library_id) REFERENCES public.supplier_contract_clause_library(id);


--
-- Name: supplier_contract_clause_instances supplier_contract_clause_instances_contract_id_supplier_contrac; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_contract_clause_instances
    ADD CONSTRAINT supplier_contract_clause_instances_contract_id_supplier_contrac FOREIGN KEY (contract_id) REFERENCES public.supplier_contracts(id) ON DELETE CASCADE;


--
-- Name: supplier_contracts supplier_contracts_file_evidence_id_evidence_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_contracts
    ADD CONSTRAINT supplier_contracts_file_evidence_id_evidence_items_id_fk FOREIGN KEY (file_evidence_id) REFERENCES public.evidence_items(id);


--
-- Name: supplier_contracts supplier_contracts_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_contracts
    ADD CONSTRAINT supplier_contracts_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_contracts supplier_contracts_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_contracts
    ADD CONSTRAINT supplier_contracts_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: supplier_exceptions supplier_exceptions_approved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_exceptions
    ADD CONSTRAINT supplier_exceptions_approved_by_users_id_fk FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: supplier_exceptions supplier_exceptions_evidence_link_id_evidence_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_exceptions
    ADD CONSTRAINT supplier_exceptions_evidence_link_id_evidence_items_id_fk FOREIGN KEY (evidence_link_id) REFERENCES public.evidence_items(id);


--
-- Name: supplier_exceptions supplier_exceptions_requested_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_exceptions
    ADD CONSTRAINT supplier_exceptions_requested_by_users_id_fk FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: supplier_exceptions supplier_exceptions_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_exceptions
    ADD CONSTRAINT supplier_exceptions_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_exceptions supplier_exceptions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_exceptions
    ADD CONSTRAINT supplier_exceptions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: supplier_incidents supplier_incidents_linked_platform_incident_id_incident_cases_i; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_incidents
    ADD CONSTRAINT supplier_incidents_linked_platform_incident_id_incident_cases_i FOREIGN KEY (linked_platform_incident_id) REFERENCES public.incident_cases(id);


--
-- Name: supplier_incidents supplier_incidents_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_incidents
    ADD CONSTRAINT supplier_incidents_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_incidents supplier_incidents_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_incidents
    ADD CONSTRAINT supplier_incidents_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: supplier_questionnaire_questions supplier_questionnaire_questions_template_id_supplier_questionn; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_questionnaire_questions
    ADD CONSTRAINT supplier_questionnaire_questions_template_id_supplier_questionn FOREIGN KEY (template_id) REFERENCES public.supplier_questionnaire_templates(id) ON DELETE CASCADE;


--
-- Name: supplier_security_requirements supplier_security_requirements_evidence_link_id_evidence_items_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_security_requirements
    ADD CONSTRAINT supplier_security_requirements_evidence_link_id_evidence_items_ FOREIGN KEY (evidence_link_id) REFERENCES public.evidence_items(id);


--
-- Name: supplier_security_requirements supplier_security_requirements_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_security_requirements
    ADD CONSTRAINT supplier_security_requirements_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_security_requirements supplier_security_requirements_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_security_requirements
    ADD CONSTRAINT supplier_security_requirements_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: supplier_service_dependencies supplier_service_dependencies_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_service_dependencies
    ADD CONSTRAINT supplier_service_dependencies_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_service_dependencies supplier_service_dependencies_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_service_dependencies
    ADD CONSTRAINT supplier_service_dependencies_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: suppliers suppliers_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: task_atomic_links task_atomic_links_atomic_control_id_atomic_controls_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_atomic_links
    ADD CONSTRAINT task_atomic_links_atomic_control_id_atomic_controls_id_fk FOREIGN KEY (atomic_control_id) REFERENCES public.atomic_controls(id);


--
-- Name: task_atomic_links task_atomic_links_task_id_tasks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_atomic_links
    ADD CONSTRAINT task_atomic_links_task_id_tasks_id_fk FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: task_comments task_comments_task_id_tasks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_task_id_tasks_id_fk FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_comments task_comments_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: tasks tasks_approver_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_approver_user_id_users_id_fk FOREIGN KEY (approver_user_id) REFERENCES public.users(id);


--
-- Name: tasks tasks_assessment_id_assessments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assessment_id_assessments_id_fk FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: tasks tasks_control_objective_id_control_objectives_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_control_objective_id_control_objectives_id_fk FOREIGN KEY (control_objective_id) REFERENCES public.control_objectives(id);


--
-- Name: tasks tasks_owner_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_owner_user_id_users_id_fk FOREIGN KEY (owner_user_id) REFERENCES public.users(id);


--
-- Name: tasks tasks_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_daily_atomic_snapshots tenant_daily_atomic_snapshots_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_daily_atomic_snapshots
    ADD CONSTRAINT tenant_daily_atomic_snapshots_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_daily_snapshots tenant_daily_snapshots_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_daily_snapshots
    ADD CONSTRAINT tenant_daily_snapshots_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_risk_register_items tenant_risk_register_items_acceptance_approved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_risk_register_items
    ADD CONSTRAINT tenant_risk_register_items_acceptance_approved_by_users_id_fk FOREIGN KEY (acceptance_approved_by) REFERENCES public.users(id);


--
-- Name: tenant_risk_register_items tenant_risk_register_items_library_entry_id_risk_library_entrie; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_risk_register_items
    ADD CONSTRAINT tenant_risk_register_items_library_entry_id_risk_library_entrie FOREIGN KEY (library_entry_id) REFERENCES public.risk_library_entries(id);


--
-- Name: tenant_risk_register_items tenant_risk_register_items_owner_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_risk_register_items
    ADD CONSTRAINT tenant_risk_register_items_owner_user_id_users_id_fk FOREIGN KEY (owner_user_id) REFERENCES public.users(id);


--
-- Name: tenant_risk_register_items tenant_risk_register_items_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_risk_register_items
    ADD CONSTRAINT tenant_risk_register_items_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: users users_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- PostgreSQL database dump complete
--

\unrestrict k3oURDYZuAgJ3tBtlMKCd4PsjCohGuY2w9F36R1KdwPO512vykC64AdeVnKzqdr


SET search_path = public;

-- 2) Enum values that may be missing on older databases
ALTER TYPE assessment_status ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE assessment_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE assessment_status ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE assessment_status ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE atomic_confidence ADD VALUE IF NOT EXISTS 'NONE';
ALTER TYPE atomic_confidence ADD VALUE IF NOT EXISTS 'LOW';
ALTER TYPE atomic_confidence ADD VALUE IF NOT EXISTS 'MEDIUM';
ALTER TYPE atomic_confidence ADD VALUE IF NOT EXISTS 'HIGH';
ALTER TYPE atomic_implementation_status ADD VALUE IF NOT EXISTS 'NOT_STARTED';
ALTER TYPE atomic_implementation_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE atomic_implementation_status ADD VALUE IF NOT EXISTS 'IMPLEMENTED';
ALTER TYPE atomic_implementation_status ADD VALUE IF NOT EXISTS 'VERIFIED';
ALTER TYPE control_status ADD VALUE IF NOT EXISTS 'NOT_IMPLEMENTED';
ALTER TYPE control_status ADD VALUE IF NOT EXISTS 'PLANNED';
ALTER TYPE control_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE control_status ADD VALUE IF NOT EXISTS 'IMPLEMENTED';
ALTER TYPE control_status ADD VALUE IF NOT EXISTS 'VERIFIED';
ALTER TYPE cross_suggestion_status ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE cross_suggestion_status ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE cross_suggestion_status ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE cross_suggestion_status ADD VALUE IF NOT EXISTS 'SUPERSEDED';
ALTER TYPE crosswalk_relationship ADD VALUE IF NOT EXISTS 'EQUIVALENT';
ALTER TYPE crosswalk_relationship ADD VALUE IF NOT EXISTS 'SUPERSET';
ALTER TYPE crosswalk_relationship ADD VALUE IF NOT EXISTS 'SUBSET';
ALTER TYPE crosswalk_relationship ADD VALUE IF NOT EXISTS 'PARTIAL';
ALTER TYPE crosswalk_relationship ADD VALUE IF NOT EXISTS 'RELATED';
ALTER TYPE drift_reason ADD VALUE IF NOT EXISTS 'SOURCE_DOWNGRADED';
ALTER TYPE drift_reason ADD VALUE IF NOT EXISTS 'SOURCE_REMOVED';
ALTER TYPE drift_reason ADD VALUE IF NOT EXISTS 'EDGE_CHANGED';
ALTER TYPE edge_review_status ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE edge_review_status ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE evidence_confidence ADD VALUE IF NOT EXISTS 'NONE';
ALTER TYPE evidence_confidence ADD VALUE IF NOT EXISTS 'LOW';
ALTER TYPE evidence_confidence ADD VALUE IF NOT EXISTS 'MEDIUM';
ALTER TYPE evidence_confidence ADD VALUE IF NOT EXISTS 'HIGH';
ALTER TYPE implementation_status ADD VALUE IF NOT EXISTS 'NOT_STARTED';
ALTER TYPE implementation_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE implementation_status ADD VALUE IF NOT EXISTS 'IMPLEMENTED';
ALTER TYPE implementation_status ADD VALUE IF NOT EXISTS 'VERIFIED';
ALTER TYPE incident_severity ADD VALUE IF NOT EXISTS 'LOW';
ALTER TYPE incident_severity ADD VALUE IF NOT EXISTS 'MEDIUM';
ALTER TYPE incident_severity ADD VALUE IF NOT EXISTS 'HIGH';
ALTER TYPE incident_severity ADD VALUE IF NOT EXISTS 'CRITICAL';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'DETECTED';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'TRIAGED';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'CONTAINED';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'ERADICATED';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'RECOVERED';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'CLOSED';
ALTER TYPE nis2_entity_class ADD VALUE IF NOT EXISTS 'ESSENTIAL';
ALTER TYPE nis2_entity_class ADD VALUE IF NOT EXISTS 'IMPORTANT';
ALTER TYPE nis2_size_class ADD VALUE IF NOT EXISTS 'MICRO';
ALTER TYPE nis2_size_class ADD VALUE IF NOT EXISTS 'SMALL';
ALTER TYPE nis2_size_class ADD VALUE IF NOT EXISTS 'MEDIUM';
ALTER TYPE nis2_size_class ADD VALUE IF NOT EXISTS 'LARGE';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'EARLY_WARNING';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'NOTIFICATION';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'FINAL_REPORT';
ALTER TYPE risk_status ADD VALUE IF NOT EXISTS 'IDENTIFIED';
ALTER TYPE risk_status ADD VALUE IF NOT EXISTS 'ANALYZING';
ALTER TYPE risk_status ADD VALUE IF NOT EXISTS 'TREATING';
ALTER TYPE risk_status ADD VALUE IF NOT EXISTS 'MONITORING';
ALTER TYPE risk_status ADD VALUE IF NOT EXISTS 'CLOSED';
ALTER TYPE risk_treatment ADD VALUE IF NOT EXISTS 'ACCEPT';
ALTER TYPE risk_treatment ADD VALUE IF NOT EXISTS 'MITIGATE';
ALTER TYPE risk_treatment ADD VALUE IF NOT EXISTS 'TRANSFER';
ALTER TYPE risk_treatment ADD VALUE IF NOT EXISTS 'AVOID';
ALTER TYPE supplier_access_level ADD VALUE IF NOT EXISTS 'NONE';
ALTER TYPE supplier_access_level ADD VALUE IF NOT EXISTS 'NETWORK';
ALTER TYPE supplier_access_level ADD VALUE IF NOT EXISTS 'VPN';
ALTER TYPE supplier_access_level ADD VALUE IF NOT EXISTS 'PRIVILEGED';
ALTER TYPE supplier_access_level ADD VALUE IF NOT EXISTS 'APPLICATION';
ALTER TYPE supplier_access_level ADD VALUE IF NOT EXISTS 'DATA';
ALTER TYPE supplier_assessment_status ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE supplier_assessment_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE supplier_assessment_status ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE supplier_assessment_status ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE supplier_assurance_level ADD VALUE IF NOT EXISTS 'NONE';
ALTER TYPE supplier_assurance_level ADD VALUE IF NOT EXISTS 'BASIC';
ALTER TYPE supplier_assurance_level ADD VALUE IF NOT EXISTS 'STANDARD';
ALTER TYPE supplier_assurance_level ADD VALUE IF NOT EXISTS 'ADVANCED';
ALTER TYPE supplier_contract_clause_category ADD VALUE IF NOT EXISTS 'INCIDENT';
ALTER TYPE supplier_contract_clause_category ADD VALUE IF NOT EXISTS 'AUDIT';
ALTER TYPE supplier_contract_clause_category ADD VALUE IF NOT EXISTS 'ACCESS';
ALTER TYPE supplier_contract_clause_category ADD VALUE IF NOT EXISTS 'SUBPROCESSOR';
ALTER TYPE supplier_contract_clause_category ADD VALUE IF NOT EXISTS 'VULN';
ALTER TYPE supplier_contract_clause_category ADD VALUE IF NOT EXISTS 'BC_DR';
ALTER TYPE supplier_contract_clause_category ADD VALUE IF NOT EXISTS 'DATA';
ALTER TYPE supplier_contract_clause_category ADD VALUE IF NOT EXISTS 'SDLC';
ALTER TYPE supplier_contract_doc_status ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE supplier_contract_doc_status ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE supplier_contract_doc_status ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE supplier_contract_doc_status ADD VALUE IF NOT EXISTS 'TERMINATED';
ALTER TYPE supplier_contract_status ADD VALUE IF NOT EXISTS 'NONE';
ALTER TYPE supplier_contract_status ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE supplier_contract_status ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE supplier_contract_status ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE supplier_contract_status ADD VALUE IF NOT EXISTS 'TERMINATED';
ALTER TYPE supplier_criticality_impact ADD VALUE IF NOT EXISTS 'LOW';
ALTER TYPE supplier_criticality_impact ADD VALUE IF NOT EXISTS 'MEDIUM';
ALTER TYPE supplier_criticality_impact ADD VALUE IF NOT EXISTS 'HIGH';
ALTER TYPE supplier_criticality_impact ADD VALUE IF NOT EXISTS 'CRITICAL';
ALTER TYPE supplier_data_classification ADD VALUE IF NOT EXISTS 'PUBLIC';
ALTER TYPE supplier_data_classification ADD VALUE IF NOT EXISTS 'INTERNAL';
ALTER TYPE supplier_data_classification ADD VALUE IF NOT EXISTS 'CONFIDENTIAL';
ALTER TYPE supplier_data_classification ADD VALUE IF NOT EXISTS 'RESTRICTED';
ALTER TYPE supplier_dependency_type ADD VALUE IF NOT EXISTS 'SERVICE';
ALTER TYPE supplier_dependency_type ADD VALUE IF NOT EXISTS 'SYSTEM';
ALTER TYPE supplier_dependency_type ADD VALUE IF NOT EXISTS 'APPLICATION';
ALTER TYPE supplier_dependency_type ADD VALUE IF NOT EXISTS 'DATASET';
ALTER TYPE supplier_dependency_type ADD VALUE IF NOT EXISTS 'PROCESS';
ALTER TYPE supplier_dependency_type ADD VALUE IF NOT EXISTS 'LOCATION';
ALTER TYPE supplier_exception_type ADD VALUE IF NOT EXISTS 'REQUIREMENT_WAIVER';
ALTER TYPE supplier_exception_type ADD VALUE IF NOT EXISTS 'RISK_ACCEPTANCE';
ALTER TYPE supplier_exception_type ADD VALUE IF NOT EXISTS 'TEMPORARY_COMPENSATING_CONTROL';
ALTER TYPE supplier_incident_severity ADD VALUE IF NOT EXISTS 'LOW';
ALTER TYPE supplier_incident_severity ADD VALUE IF NOT EXISTS 'MEDIUM';
ALTER TYPE supplier_incident_severity ADD VALUE IF NOT EXISTS 'HIGH';
ALTER TYPE supplier_incident_severity ADD VALUE IF NOT EXISTS 'CRITICAL';
ALTER TYPE supplier_incident_status_enum ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE supplier_incident_status_enum ADD VALUE IF NOT EXISTS 'CONTAINED';
ALTER TYPE supplier_incident_status_enum ADD VALUE IF NOT EXISTS 'RESOLVED';
ALTER TYPE supplier_incident_status_enum ADD VALUE IF NOT EXISTS 'CLOSED';
ALTER TYPE supplier_question_response_type ADD VALUE IF NOT EXISTS 'YES_NO';
ALTER TYPE supplier_question_response_type ADD VALUE IF NOT EXISTS 'SCALE';
ALTER TYPE supplier_question_response_type ADD VALUE IF NOT EXISTS 'TEXT';
ALTER TYPE supplier_question_response_type ADD VALUE IF NOT EXISTS 'MULTI';
ALTER TYPE supplier_requirement_status ADD VALUE IF NOT EXISTS 'NOT_SET';
ALTER TYPE supplier_requirement_status ADD VALUE IF NOT EXISTS 'IN_CONTRACT';
ALTER TYPE supplier_requirement_status ADD VALUE IF NOT EXISTS 'IMPLEMENTED';
ALTER TYPE supplier_requirement_status ADD VALUE IF NOT EXISTS 'VERIFIED';
ALTER TYPE supplier_requirement_status ADD VALUE IF NOT EXISTS 'EXCEPTION';
ALTER TYPE supplier_risk_rating ADD VALUE IF NOT EXISTS 'LOW';
ALTER TYPE supplier_risk_rating ADD VALUE IF NOT EXISTS 'MEDIUM';
ALTER TYPE supplier_risk_rating ADD VALUE IF NOT EXISTS 'HIGH';
ALTER TYPE supplier_risk_rating ADD VALUE IF NOT EXISTS 'CRITICAL';
ALTER TYPE supplier_status ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE supplier_status ADD VALUE IF NOT EXISTS 'INACTIVE';
ALTER TYPE supplier_status ADD VALUE IF NOT EXISTS 'ONBOARDING';
ALTER TYPE supplier_type ADD VALUE IF NOT EXISTS 'ICT';
ALTER TYPE supplier_type ADD VALUE IF NOT EXISTS 'CLOUD';
ALTER TYPE supplier_type ADD VALUE IF NOT EXISTS 'MSP';
ALTER TYPE supplier_type ADD VALUE IF NOT EXISTS 'MSSP';
ALTER TYPE supplier_type ADD VALUE IF NOT EXISTS 'SOFTWARE';
ALTER TYPE supplier_type ADD VALUE IF NOT EXISTS 'HARDWARE';
ALTER TYPE supplier_type ADD VALUE IF NOT EXISTS 'OUTSOURCER';
ALTER TYPE supplier_type ADD VALUE IF NOT EXISTS 'TELCO';
ALTER TYPE supplier_type ADD VALUE IF NOT EXISTS 'CONSULTING';
ALTER TYPE supplier_type ADD VALUE IF NOT EXISTS 'OTHER';
ALTER TYPE task_priority ADD VALUE IF NOT EXISTS 'LOW';
ALTER TYPE task_priority ADD VALUE IF NOT EXISTS 'MEDIUM';
ALTER TYPE task_priority ADD VALUE IF NOT EXISTS 'HIGH';
ALTER TYPE task_priority ADD VALUE IF NOT EXISTS 'CRITICAL';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'TODO';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'IN_REVIEW';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'DONE';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'PLATFORM_ADMIN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'TENANT_ADMIN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'TENANT_MANAGER';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'TENANT_USER';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'READONLY_AUDITOR';

-- 3) Columns added to existing tables
ALTER TABLE applicability_rules ADD COLUMN IF NOT EXISTS control_objective_id integer;
ALTER TABLE applicability_rules ADD COLUMN IF NOT EXISTS rule jsonb;
ALTER TABLE assessment_responses ADD COLUMN IF NOT EXISTS assessment_id integer;
ALTER TABLE assessment_responses ADD COLUMN IF NOT EXISTS control_objective_id integer;
ALTER TABLE assessment_responses ADD COLUMN IF NOT EXISTS implementation_status implementation_status DEFAULT 'NOT_STARTED'::implementation_status NOT NULL;
ALTER TABLE assessment_responses ADD COLUMN IF NOT EXISTS maturity_level integer DEFAULT 0 NOT NULL;
ALTER TABLE assessment_responses ADD COLUMN IF NOT EXISTS evidence_confidence evidence_confidence DEFAULT 'NONE'::evidence_confidence NOT NULL;
ALTER TABLE assessment_responses ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE assessment_responses ADD COLUMN IF NOT EXISTS updated_by integer;
ALTER TABLE assessment_responses ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS scope text;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS created_by integer;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS status assessment_status DEFAULT 'DRAFT'::assessment_status NOT NULL;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE atomic_assessment_responses ADD COLUMN IF NOT EXISTS atomic_assessment_id integer;
ALTER TABLE atomic_assessment_responses ADD COLUMN IF NOT EXISTS atomic_control_id integer;
ALTER TABLE atomic_assessment_responses ADD COLUMN IF NOT EXISTS implementation_status atomic_implementation_status DEFAULT 'NOT_STARTED'::atomic_implementation_status NOT NULL;
ALTER TABLE atomic_assessment_responses ADD COLUMN IF NOT EXISTS maturity_level integer DEFAULT 0 NOT NULL;
ALTER TABLE atomic_assessment_responses ADD COLUMN IF NOT EXISTS confidence atomic_confidence DEFAULT 'NONE'::atomic_confidence NOT NULL;
ALTER TABLE atomic_assessment_responses ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE atomic_assessment_responses ADD COLUMN IF NOT EXISTS answered_by integer;
ALTER TABLE atomic_assessment_responses ADD COLUMN IF NOT EXISTS answered_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE atomic_assessments ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE atomic_assessments ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE atomic_assessments ADD COLUMN IF NOT EXISTS scope text;
ALTER TABLE atomic_assessments ADD COLUMN IF NOT EXISTS created_by integer;
ALTER TABLE atomic_assessments ADD COLUMN IF NOT EXISTS status assessment_status DEFAULT 'DRAFT'::assessment_status NOT NULL;
ALTER TABLE atomic_assessments ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE atomic_assessments ADD COLUMN IF NOT EXISTS submitted_at timestamp without time zone;
ALTER TABLE atomic_assessments ADD COLUMN IF NOT EXISTS parent_assessment_id integer;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS control_id text;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS source_key text;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS legal_ref text;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS clause_path text;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS short_title text;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS obligation_text text;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS obligation_verb text;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS applicability jsonb DEFAULT '{}'::jsonb;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS evidence_types jsonb DEFAULT '[]'::jsonb;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS test_procedure jsonb DEFAULT '{}'::jsonb;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS domain text DEFAULT 'Governance'::text;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS weight integer DEFAULT 1 NOT NULL;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE atomic_controls ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_id integer;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip text;
ALTER TABLE control_crosswalks ADD COLUMN IF NOT EXISTS from_atomic_control_id integer;
ALTER TABLE control_crosswalks ADD COLUMN IF NOT EXISTS to_atomic_control_id integer;
ALTER TABLE control_crosswalks ADD COLUMN IF NOT EXISTS to_external_control_id integer;
ALTER TABLE control_crosswalks ADD COLUMN IF NOT EXISTS relationship crosswalk_relationship;
ALTER TABLE control_crosswalks ADD COLUMN IF NOT EXISTS confidence integer DEFAULT 50 NOT NULL;
ALTER TABLE control_crosswalks ADD COLUMN IF NOT EXISTS direction text DEFAULT 'BIDIRECTIONAL'::text NOT NULL;
ALTER TABLE control_crosswalks ADD COLUMN IF NOT EXISTS rationale text;
ALTER TABLE control_crosswalks ADD COLUMN IF NOT EXISTS provenance text;
ALTER TABLE control_crosswalks ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE control_crosswalks ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE control_crosswalks ADD COLUMN IF NOT EXISTS review_status edge_review_status DEFAULT 'DRAFT'::edge_review_status NOT NULL;
ALTER TABLE control_crosswalks ADD COLUMN IF NOT EXISTS reviewed_by integer;
ALTER TABLE control_crosswalks ADD COLUMN IF NOT EXISTS reviewed_at timestamp without time zone;
ALTER TABLE control_crosswalks ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE control_objective_atomic_maps ADD COLUMN IF NOT EXISTS control_objective_id integer;
ALTER TABLE control_objective_atomic_maps ADD COLUMN IF NOT EXISTS atomic_control_id integer;
ALTER TABLE control_objective_atomic_maps ADD COLUMN IF NOT EXISTS confidence integer DEFAULT 50 NOT NULL;
ALTER TABLE control_objective_atomic_maps ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE control_objectives ADD COLUMN IF NOT EXISTS requirement_id integer;
ALTER TABLE control_objectives ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE control_objectives ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE control_objectives ADD COLUMN IF NOT EXISTS guidance text;
ALTER TABLE control_objectives ADD COLUMN IF NOT EXISTS evidence_types jsonb DEFAULT '[]'::jsonb;
ALTER TABLE control_objectives ADD COLUMN IF NOT EXISTS sector_pack_id integer;
ALTER TABLE control_objectives ADD COLUMN IF NOT EXISTS domain text DEFAULT 'Governance'::text;
ALTER TABLE control_objectives ADD COLUMN IF NOT EXISTS weight integer DEFAULT 1 NOT NULL;
ALTER TABLE control_objectives ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE control_pack_versions ADD COLUMN IF NOT EXISTS source_key text;
ALTER TABLE control_pack_versions ADD COLUMN IF NOT EXISTS generated_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE control_pack_versions ADD COLUMN IF NOT EXISTS generator text;
ALTER TABLE control_pack_versions ADD COLUMN IF NOT EXISTS hash text;
ALTER TABLE control_pack_versions ADD COLUMN IF NOT EXISTS control_count integer DEFAULT 0 NOT NULL;
ALTER TABLE control_pack_versions ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS control_objective_id integer;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS implementation_owner_user_id integer;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS status control_status DEFAULT 'NOT_IMPLEMENTED'::control_status NOT NULL;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS maturity_level integer DEFAULT 0 NOT NULL;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS crosswalk_id integer;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS source_atomic_control_id integer;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS source_response_id integer;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS target_atomic_assessment_id integer;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS target_atomic_control_id integer;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS suggested_status atomic_implementation_status;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS suggested_maturity integer;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS suggested_confidence atomic_confidence;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS status cross_suggestion_status DEFAULT 'PENDING'::cross_suggestion_status NOT NULL;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS decided_by integer;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS decided_at timestamp without time zone;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS drift_detected_at timestamp without time zone;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS drift_reason drift_reason;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS drift_detail text;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS drift_resolved_at timestamp without time zone;
ALTER TABLE cross_framework_suggestions ADD COLUMN IF NOT EXISTS drift_resolved_by integer;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS dora_enabled boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS dora_scope_confirmed boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS dora_entity_type text;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS dora_article2_in_scope boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS dora_article2_exclusion boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS dora_article16_simplified boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS dora_microenterprise boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS eu_eea_financial_entity boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS competent_authority text;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS uses_ict_third_party_services boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS has_critical_or_important_functions boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS ict_services_support_critical_or_important_functions boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS payment_related_entity boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS tlpt_selected_or_required boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS participates_in_information_sharing boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS ict_third_party_provider_profile boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS critical_ict_third_party_provider_designated boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS dora_applicability_notes text;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS dora_last_scope_review_date timestamp without time zone;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS dora_scope_reviewed_by integer;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS admin_override_enabled boolean DEFAULT false NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS admin_override_reason text;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE dora_regulatory_profile ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE evidence_access_logs ADD COLUMN IF NOT EXISTS evidence_id integer;
ALTER TABLE evidence_access_logs ADD COLUMN IF NOT EXISTS actor_user_id integer;
ALTER TABLE evidence_access_logs ADD COLUMN IF NOT EXISTS action text;
ALTER TABLE evidence_access_logs ADD COLUMN IF NOT EXISTS ip text;
ALTER TABLE evidence_access_logs ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS related_type text;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS related_id integer;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS filename text;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS size integer;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS uploaded_by integer;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS uploaded_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS sha256 text;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS locked_at timestamp without time zone;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS locked_by integer;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS lock_reason text;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS assessment_id integer;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS linked_from_evidence_id integer;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS linked_via_suggestion_id integer;
ALTER TABLE evidence_unlock_requests ADD COLUMN IF NOT EXISTS evidence_id integer;
ALTER TABLE evidence_unlock_requests ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE evidence_unlock_requests ADD COLUMN IF NOT EXISTS requested_by integer;
ALTER TABLE evidence_unlock_requests ADD COLUMN IF NOT EXISTS approved_by integer;
ALTER TABLE evidence_unlock_requests ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE evidence_unlock_requests ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING'::text NOT NULL;
ALTER TABLE evidence_unlock_requests ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE evidence_unlock_requests ADD COLUMN IF NOT EXISTS decided_at timestamp without time zone;
ALTER TABLE external_framework_controls ADD COLUMN IF NOT EXISTS framework_key text;
ALTER TABLE external_framework_controls ADD COLUMN IF NOT EXISTS control_ref text;
ALTER TABLE external_framework_controls ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE external_framework_controls ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE external_framework_controls ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE external_framework_controls ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE external_framework_controls ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT false NOT NULL;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS source_key text;
ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS actor_user_id integer;
ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS mode text;
ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING'::text NOT NULL;
ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS added_count integer DEFAULT 0 NOT NULL;
ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS updated_count integer DEFAULT 0 NOT NULL;
ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS unchanged_count integer DEFAULT 0 NOT NULL;
ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS deactivated_count integer DEFAULT 0 NOT NULL;
ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS total_count integer DEFAULT 0 NOT NULL;
ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS pack_hash text;
ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS error_summary jsonb;
ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS started_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS finished_at timestamp without time zone;
ALTER TABLE incident_cases ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE incident_cases ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE incident_cases ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE incident_cases ADD COLUMN IF NOT EXISTS severity incident_severity DEFAULT 'MEDIUM'::incident_severity NOT NULL;
ALTER TABLE incident_cases ADD COLUMN IF NOT EXISTS is_significant boolean DEFAULT false NOT NULL;
ALTER TABLE incident_cases ADD COLUMN IF NOT EXISTS detected_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE incident_cases ADD COLUMN IF NOT EXISTS status incident_status DEFAULT 'DETECTED'::incident_status NOT NULL;
ALTER TABLE incident_cases ADD COLUMN IF NOT EXISTS early_warning_due_at timestamp without time zone;
ALTER TABLE incident_cases ADD COLUMN IF NOT EXISTS notification_due_at timestamp without time zone;
ALTER TABLE incident_cases ADD COLUMN IF NOT EXISTS final_report_due_at timestamp without time zone;
ALTER TABLE incident_cases ADD COLUMN IF NOT EXISTS created_by integer;
ALTER TABLE incident_cases ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE incident_notifications ADD COLUMN IF NOT EXISTS incident_id integer;
ALTER TABLE incident_notifications ADD COLUMN IF NOT EXISTS type notification_type;
ALTER TABLE incident_notifications ADD COLUMN IF NOT EXISTS prepared_at timestamp without time zone;
ALTER TABLE incident_notifications ADD COLUMN IF NOT EXISTS sent_at timestamp without time zone;
ALTER TABLE incident_notifications ADD COLUMN IF NOT EXISTS channel text;
ALTER TABLE incident_notifications ADD COLUMN IF NOT EXISTS content jsonb;
ALTER TABLE incident_notifications ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'TENANT_USER'::user_role NOT NULL;
ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS token_hash text;
ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS expires_at timestamp without time zone;
ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS used_at timestamp without time zone;
ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS created_by integer;
ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS accepted_by_user_id integer;
ALTER TABLE legal_sources ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE legal_sources ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE legal_sources ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE legal_sources ADD COLUMN IF NOT EXISTS version text;
ALTER TABLE legal_sources ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS nis2_scope_confirmed boolean DEFAULT false NOT NULL;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS established_in_eu_eea boolean DEFAULT true NOT NULL;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS competent_authority text;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS sector_group text;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS sector text;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS subsector text;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS employee_count integer;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS annual_turnover_meur integer;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS balance_sheet_meur integer;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS size_class nis2_size_class;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS size_independent_entity boolean DEFAULT false NOT NULL;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS size_independent_reason text;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS public_administration_entity boolean DEFAULT false NOT NULL;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS sole_provider_in_member_state boolean DEFAULT false NOT NULL;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS member_state_designated_in_scope boolean DEFAULT false NOT NULL;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS explicitly_excluded_by_member_state boolean DEFAULT false NOT NULL;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS operates_in_multiple_member_states boolean DEFAULT false NOT NULL;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS admin_override_enabled boolean DEFAULT false NOT NULL;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS admin_override_entity_class nis2_entity_class;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS admin_override_reason text;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS computed_in_scope boolean DEFAULT false NOT NULL;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS computed_entity_class nis2_entity_class;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS computed_reason text;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS nis2_applicability_notes text;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS nis2_last_scope_review_date timestamp without time zone;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS nis2_scope_reviewed_by integer;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE nis2_regulatory_profile ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE password_history ADD COLUMN IF NOT EXISTS user_id integer;
ALTER TABLE password_history ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE password_history ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS value text;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS nis2_article text;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS nis2_paragraph text;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS greek_ref text;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
ALTER TABLE risk_items ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE risk_items ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE risk_items ADD COLUMN IF NOT EXISTS likelihood integer DEFAULT 3 NOT NULL;
ALTER TABLE risk_items ADD COLUMN IF NOT EXISTS impact integer DEFAULT 3 NOT NULL;
ALTER TABLE risk_items ADD COLUMN IF NOT EXISTS treatment risk_treatment DEFAULT 'MITIGATE'::risk_treatment NOT NULL;
ALTER TABLE risk_items ADD COLUMN IF NOT EXISTS owner_user_id integer;
ALTER TABLE risk_items ADD COLUMN IF NOT EXISTS status risk_status DEFAULT 'IDENTIFIED'::risk_status NOT NULL;
ALTER TABLE risk_items ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE risk_items ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS library_code text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS risk_id text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS framework_context text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS risk_statement text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS typical_impact text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS regulatory_mapping text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS affected_assets_or_services text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS default_likelihood text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS default_impact text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS default_risk_rating text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS default_treatment_option text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS treatment_direction text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS suggested_controls jsonb DEFAULT '[]'::jsonb;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS suggested_evidence jsonb DEFAULT '[]'::jsonb;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS default_owner_role text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS review_frequency text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS default_status text DEFAULT 'Not Assessed'::text NOT NULL;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE risk_library_entries ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE scope_check_leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE scope_check_leads ADD COLUMN IF NOT EXISTS report_token text;
ALTER TABLE scope_check_leads ADD COLUMN IF NOT EXISTS answers jsonb;
ALTER TABLE scope_check_leads ADD COLUMN IF NOT EXISTS verdict jsonb;
ALTER TABLE scope_check_leads ADD COLUMN IF NOT EXISTS control_stats jsonb;
ALTER TABLE scope_check_leads ADD COLUMN IF NOT EXISTS consent_text text;
ALTER TABLE scope_check_leads ADD COLUMN IF NOT EXISTS consent_marketing boolean DEFAULT false NOT NULL;
ALTER TABLE scope_check_leads ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE scope_check_leads ADD COLUMN IF NOT EXISTS converted_tenant_id integer;
ALTER TABLE scope_check_leads ADD COLUMN IF NOT EXISTS converted_at timestamp without time zone;
ALTER TABLE scope_check_leads ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone;
ALTER TABLE sector_packs ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE sector_packs ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE sector_packs ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE sector_packs ADD COLUMN IF NOT EXISTS applies_to jsonb;
ALTER TABLE sector_packs ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
ALTER TABLE supplier_assessment_responses ADD COLUMN IF NOT EXISTS supplier_assessment_id integer;
ALTER TABLE supplier_assessment_responses ADD COLUMN IF NOT EXISTS question_id integer;
ALTER TABLE supplier_assessment_responses ADD COLUMN IF NOT EXISTS answer jsonb;
ALTER TABLE supplier_assessment_responses ADD COLUMN IF NOT EXISTS score real;
ALTER TABLE supplier_assessment_responses ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE supplier_assessment_responses ADD COLUMN IF NOT EXISTS evidence_link_id integer;
ALTER TABLE supplier_assessment_responses ADD COLUMN IF NOT EXISTS answered_by integer;
ALTER TABLE supplier_assessment_responses ADD COLUMN IF NOT EXISTS answered_at timestamp without time zone DEFAULT now();
ALTER TABLE supplier_assessments ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE supplier_assessments ADD COLUMN IF NOT EXISTS supplier_id integer;
ALTER TABLE supplier_assessments ADD COLUMN IF NOT EXISTS template_id integer;
ALTER TABLE supplier_assessments ADD COLUMN IF NOT EXISTS supplier_assessment_status supplier_assessment_status DEFAULT 'DRAFT'::supplier_assessment_status NOT NULL;
ALTER TABLE supplier_assessments ADD COLUMN IF NOT EXISTS created_by integer;
ALTER TABLE supplier_assessments ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE supplier_assessments ADD COLUMN IF NOT EXISTS submitted_at timestamp without time zone;
ALTER TABLE supplier_assessments ADD COLUMN IF NOT EXISTS approved_by integer;
ALTER TABLE supplier_assessments ADD COLUMN IF NOT EXISTS approved_at timestamp without time zone;
ALTER TABLE supplier_assessments ADD COLUMN IF NOT EXISTS score real;
ALTER TABLE supplier_assessments ADD COLUMN IF NOT EXISTS risk_rating supplier_risk_rating;
ALTER TABLE supplier_contract_clause_instances ADD COLUMN IF NOT EXISTS contract_id integer;
ALTER TABLE supplier_contract_clause_instances ADD COLUMN IF NOT EXISTS clause_library_id integer;
ALTER TABLE supplier_contract_clause_instances ADD COLUMN IF NOT EXISTS is_included boolean DEFAULT false NOT NULL;
ALTER TABLE supplier_contract_clause_instances ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE supplier_contract_clause_library ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE supplier_contract_clause_library ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE supplier_contract_clause_library ADD COLUMN IF NOT EXISTS clause_text text;
ALTER TABLE supplier_contract_clause_library ADD COLUMN IF NOT EXISTS category supplier_contract_clause_category;
ALTER TABLE supplier_contract_clause_library ADD COLUMN IF NOT EXISTS mapping jsonb;
ALTER TABLE supplier_contracts ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE supplier_contracts ADD COLUMN IF NOT EXISTS supplier_id integer;
ALTER TABLE supplier_contracts ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE supplier_contracts ADD COLUMN IF NOT EXISTS contract_doc_status supplier_contract_doc_status DEFAULT 'DRAFT'::supplier_contract_doc_status NOT NULL;
ALTER TABLE supplier_contracts ADD COLUMN IF NOT EXISTS signed_at timestamp without time zone;
ALTER TABLE supplier_contracts ADD COLUMN IF NOT EXISTS expires_at timestamp without time zone;
ALTER TABLE supplier_contracts ADD COLUMN IF NOT EXISTS file_evidence_id integer;
ALTER TABLE supplier_exceptions ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE supplier_exceptions ADD COLUMN IF NOT EXISTS supplier_id integer;
ALTER TABLE supplier_exceptions ADD COLUMN IF NOT EXISTS exception_type supplier_exception_type;
ALTER TABLE supplier_exceptions ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE supplier_exceptions ADD COLUMN IF NOT EXISTS compensating_controls text;
ALTER TABLE supplier_exceptions ADD COLUMN IF NOT EXISTS expiry_date timestamp without time zone;
ALTER TABLE supplier_exceptions ADD COLUMN IF NOT EXISTS requested_by integer;
ALTER TABLE supplier_exceptions ADD COLUMN IF NOT EXISTS approved_by integer;
ALTER TABLE supplier_exceptions ADD COLUMN IF NOT EXISTS approved_at timestamp without time zone;
ALTER TABLE supplier_exceptions ADD COLUMN IF NOT EXISTS evidence_link_id integer;
ALTER TABLE supplier_exceptions ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE supplier_incidents ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE supplier_incidents ADD COLUMN IF NOT EXISTS supplier_id integer;
ALTER TABLE supplier_incidents ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE supplier_incidents ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE supplier_incidents ADD COLUMN IF NOT EXISTS detected_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE supplier_incidents ADD COLUMN IF NOT EXISTS notified_at timestamp without time zone;
ALTER TABLE supplier_incidents ADD COLUMN IF NOT EXISTS affects_services jsonb;
ALTER TABLE supplier_incidents ADD COLUMN IF NOT EXISTS severity supplier_incident_severity DEFAULT 'MEDIUM'::supplier_incident_severity NOT NULL;
ALTER TABLE supplier_incidents ADD COLUMN IF NOT EXISTS supplier_incident_status supplier_incident_status_enum DEFAULT 'OPEN'::supplier_incident_status_enum NOT NULL;
ALTER TABLE supplier_incidents ADD COLUMN IF NOT EXISTS requires_nis2_reporting boolean DEFAULT false;
ALTER TABLE supplier_incidents ADD COLUMN IF NOT EXISTS linked_platform_incident_id integer;
ALTER TABLE supplier_incidents ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE supplier_questionnaire_questions ADD COLUMN IF NOT EXISTS template_id integer;
ALTER TABLE supplier_questionnaire_questions ADD COLUMN IF NOT EXISTS section text;
ALTER TABLE supplier_questionnaire_questions ADD COLUMN IF NOT EXISTS question_text text;
ALTER TABLE supplier_questionnaire_questions ADD COLUMN IF NOT EXISTS response_type supplier_question_response_type DEFAULT 'YES_NO'::supplier_question_response_type NOT NULL;
ALTER TABLE supplier_questionnaire_questions ADD COLUMN IF NOT EXISTS weight integer DEFAULT 1 NOT NULL;
ALTER TABLE supplier_questionnaire_questions ADD COLUMN IF NOT EXISTS evidence_required boolean DEFAULT false NOT NULL;
ALTER TABLE supplier_questionnaire_questions ADD COLUMN IF NOT EXISTS evidence_types jsonb;
ALTER TABLE supplier_questionnaire_questions ADD COLUMN IF NOT EXISTS nis2_ref jsonb;
ALTER TABLE supplier_questionnaire_questions ADD COLUMN IF NOT EXISTS cir_ref jsonb;
ALTER TABLE supplier_questionnaire_questions ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0 NOT NULL;
ALTER TABLE supplier_questionnaire_templates ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE supplier_questionnaire_templates ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE supplier_questionnaire_templates ADD COLUMN IF NOT EXISTS version text DEFAULT '1.0'::text NOT NULL;
ALTER TABLE supplier_questionnaire_templates ADD COLUMN IF NOT EXISTS applies_to jsonb;
ALTER TABLE supplier_questionnaire_templates ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
ALTER TABLE supplier_security_requirements ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE supplier_security_requirements ADD COLUMN IF NOT EXISTS supplier_id integer;
ALTER TABLE supplier_security_requirements ADD COLUMN IF NOT EXISTS requirement_key text;
ALTER TABLE supplier_security_requirements ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE supplier_security_requirements ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE supplier_security_requirements ADD COLUMN IF NOT EXISTS required_for_tier text DEFAULT 'HIGH'::text NOT NULL;
ALTER TABLE supplier_security_requirements ADD COLUMN IF NOT EXISTS supplier_requirement_status supplier_requirement_status DEFAULT 'NOT_SET'::supplier_requirement_status NOT NULL;
ALTER TABLE supplier_security_requirements ADD COLUMN IF NOT EXISTS evidence_link_id integer;
ALTER TABLE supplier_security_requirements ADD COLUMN IF NOT EXISTS review_due_at timestamp without time zone;
ALTER TABLE supplier_service_dependencies ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE supplier_service_dependencies ADD COLUMN IF NOT EXISTS supplier_id integer;
ALTER TABLE supplier_service_dependencies ADD COLUMN IF NOT EXISTS dependency_type supplier_dependency_type DEFAULT 'SERVICE'::supplier_dependency_type NOT NULL;
ALTER TABLE supplier_service_dependencies ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE supplier_service_dependencies ADD COLUMN IF NOT EXISTS criticality_impact supplier_criticality_impact DEFAULT 'LOW'::supplier_criticality_impact NOT NULL;
ALTER TABLE supplier_service_dependencies ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS criticality text DEFAULT 'low'::text NOT NULL;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS services text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS last_assessment_at timestamp without time zone;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_type supplier_type;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_id_or_reg_no text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS primary_contact_name text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS primary_contact_email text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS security_contact_email text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS incident_hotline text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contract_status supplier_contract_status DEFAULT 'NONE'::supplier_contract_status;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contract_start_date timestamp without time zone;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contract_end_date timestamp without time zone;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS renewal_date timestamp without time zone;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS access_level supplier_access_level DEFAULT 'NONE'::supplier_access_level;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS data_types jsonb;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS data_classification supplier_data_classification DEFAULT 'PUBLIC'::supplier_data_classification;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS subprocessors_allowed boolean DEFAULT false;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS last_review_at timestamp without time zone;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS next_review_due_at timestamp without time zone;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS inherent_risk_score integer DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS residual_risk_score integer DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS assurance_level supplier_assurance_level DEFAULT 'NONE'::supplier_assurance_level;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_status supplier_status DEFAULT 'ACTIVE'::supplier_status;
ALTER TABLE task_atomic_links ADD COLUMN IF NOT EXISTS task_id integer;
ALTER TABLE task_atomic_links ADD COLUMN IF NOT EXISTS atomic_control_id integer;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS task_id integer;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS user_id integer;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS control_objective_id integer;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_user_id integer;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date timestamp without time zone;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status task_status DEFAULT 'TODO'::task_status NOT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority task_priority DEFAULT 'MEDIUM'::task_priority NOT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approver_user_id integer;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assessment_id integer;
ALTER TABLE tenant_daily_atomic_snapshots ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE tenant_daily_atomic_snapshots ADD COLUMN IF NOT EXISTS snapshot_date text;
ALTER TABLE tenant_daily_atomic_snapshots ADD COLUMN IF NOT EXISTS atomic_compliance_pct real DEFAULT 0 NOT NULL;
ALTER TABLE tenant_daily_atomic_snapshots ADD COLUMN IF NOT EXISTS atomic_verified_pct real DEFAULT 0 NOT NULL;
ALTER TABLE tenant_daily_atomic_snapshots ADD COLUMN IF NOT EXISTS atomic_maturity_avg real DEFAULT 0 NOT NULL;
ALTER TABLE tenant_daily_atomic_snapshots ADD COLUMN IF NOT EXISTS atomic_overdue_tasks integer DEFAULT 0 NOT NULL;
ALTER TABLE tenant_daily_atomic_snapshots ADD COLUMN IF NOT EXISTS atomic_evidence_coverage_pct real DEFAULT 0 NOT NULL;
ALTER TABLE tenant_daily_atomic_snapshots ADD COLUMN IF NOT EXISTS last_computed_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE tenant_daily_snapshots ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE tenant_daily_snapshots ADD COLUMN IF NOT EXISTS snapshot_date text;
ALTER TABLE tenant_daily_snapshots ADD COLUMN IF NOT EXISTS compliance_pct real DEFAULT 0 NOT NULL;
ALTER TABLE tenant_daily_snapshots ADD COLUMN IF NOT EXISTS verified_pct real DEFAULT 0 NOT NULL;
ALTER TABLE tenant_daily_snapshots ADD COLUMN IF NOT EXISTS maturity_avg real DEFAULT 0 NOT NULL;
ALTER TABLE tenant_daily_snapshots ADD COLUMN IF NOT EXISTS overdue_tasks integer DEFAULT 0 NOT NULL;
ALTER TABLE tenant_daily_snapshots ADD COLUMN IF NOT EXISTS evidence_coverage real DEFAULT 0 NOT NULL;
ALTER TABLE tenant_daily_snapshots ADD COLUMN IF NOT EXISTS incidents_open integer DEFAULT 0 NOT NULL;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS library_code text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS risk_id text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS library_entry_id integer;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS risk_statement text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS typical_impact text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS regulatory_mapping text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS affected_assets_or_services text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS inherent_likelihood text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS inherent_impact text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS inherent_risk_rating text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS treatment_option text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS treatment_direction text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS suggested_controls jsonb DEFAULT '[]'::jsonb;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS suggested_evidence jsonb DEFAULT '[]'::jsonb;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS owner_user_id integer;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS status text DEFAULT 'Not Assessed'::text NOT NULL;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS treatment_status text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS residual_likelihood text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS residual_impact text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS residual_risk_rating text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS treatment_plan text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS due_date timestamp without time zone;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS evidence_links jsonb DEFAULT '[]'::jsonb;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS acceptance_decision text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS acceptance_approved_by integer;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS last_review_date timestamp without time zone;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS next_review_date timestamp without time zone;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE tenant_risk_register_items ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sector text DEFAULT 'general'::text NOT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS entity_type text DEFAULT 'essential'::text NOT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sector_group text DEFAULT 'ANNEX_I'::text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subsector text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS applicability_profile jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'::text NOT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS storage_quota_bytes bigint DEFAULT 1073741824 NOT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS storage_used_bytes bigint DEFAULT 0 NOT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_users integer DEFAULT 10 NOT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_file_size_bytes integer DEFAULT 26214400 NOT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_tier text DEFAULT 'PROFESSIONAL'::text NOT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at timestamp without time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'TENANT_USER'::user_role NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp without time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now() NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires timestamp without time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_access_enabled boolean DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires timestamp without time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamp without time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled boolean DEFAULT false NOT NULL;
