-- Migration: invite acceptance tracking (Task #24)
-- Adds invite_tokens.accepted_by_user_id so accepted invitations record the
-- resulting user. Idempotent: safe to run multiple times.
--
-- Usage:
--   psql "$PROD_DB_URL" -v ON_ERROR_STOP=1 -f scripts/migration/2026-07-06-invite-accepted-by.sql

BEGIN;

ALTER TABLE invite_tokens
  ADD COLUMN IF NOT EXISTS accepted_by_user_id integer REFERENCES users(id);

COMMIT;

-- Confirmation: prints the column if it exists.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'invite_tokens' AND column_name = 'accepted_by_user_id';
