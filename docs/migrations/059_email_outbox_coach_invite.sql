-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 059 — Add coach_invite to email_outbox CHECK constraint
-- Date: 2026-03-22
-- Type: SCHEMA (corrective)
-- Purpose: email_outbox.email_type CHECK only allows 3 values from 051.
--          Coach invite trigger (058) inserts 'coach_invite' — must be allowed.
-- Dependencies: 051 (email_outbox), 058 (coach system)
-- Deploy order: 058 first, then 059 (or together in same session)
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop the existing CHECK constraint and recreate with coach_invite added.
-- PostgreSQL does not support ALTER CONSTRAINT to add values, so drop+recreate.

ALTER TABLE email_outbox DROP CONSTRAINT IF EXISTS email_outbox_email_type_check;

ALTER TABLE email_outbox ADD CONSTRAINT email_outbox_email_type_check
  CHECK (email_type IN ('candidate_welcome', 'employer_welcome', 'new_message', 'coach_invite'));
