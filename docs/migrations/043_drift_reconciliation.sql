-- ═══════════════════════════════════════════════════════════════
-- HELLOTALENT — Migration 043: Drift Reconciliation
-- Date: 2026-03-20
-- Type: RECONCILIATION — idempotent, non-destructive
--
-- Purpose:
--   Formalizes 10 live-only columns (added manually in Supabase
--   dashboard) into repo-tracked SQL so fresh deploys match prod.
--
-- Live truth verified: 2026-03-20 via information_schema.columns
--
-- Scope:
--   A. candidates: 8 columns (activity, address, account, notifications)
--   B. candidate_experiences: 2 columns (rol_ailesi, rol_unvani)
--
-- Guarantees:
--   - Every statement uses IF NOT EXISTS / exception guard
--   - No columns dropped, no type conversions, no data modified
--   - Safe to run on fresh, partial, or fully-configured environments
-- ═══════════════════════════════════════════════════════════════


-- ── A1. account_status_enum type ─────────────────────────────
-- PostgreSQL has no CREATE TYPE IF NOT EXISTS, so we guard with
-- a DO block that catches duplicate_object.

DO $$
BEGIN
  CREATE TYPE account_status_enum AS ENUM ('active', 'frozen', 'pending_deletion');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;


-- ── A2. candidates table — activity & address columns ────────

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS is_actively_looking boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ilk_deneyim boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS adres_ilce text;


-- ── A3. candidates table — account lifecycle ─────────────────

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS account_status account_status_enum NOT NULL DEFAULT 'active';


-- ── A4. candidates table — notification preferences ──────────

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS notify_email_messages boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_jobs boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_sms_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_push_enabled boolean NOT NULL DEFAULT false;


-- ── B1. candidate_experiences — role classification columns ──
-- Front-end collects these (profil-ui.js collectExperiences)
-- but they were added to the live DB without a migration.

ALTER TABLE candidate_experiences
  ADD COLUMN IF NOT EXISTS rol_ailesi text,
  ADD COLUMN IF NOT EXISTS rol_unvani text;


-- ═══════════════════════════════════════════════════════════════
-- END OF MIGRATION 043
-- Next: 044 fixes save_candidate_profile() RPC to persist
-- rol_ailesi and rol_unvani on experience INSERT (silent data loss fix).
-- ═══════════════════════════════════════════════════════════════
