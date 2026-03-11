-- ═══════════════════════════════════════════════════════════════
-- HELLOTALENT — Migration 008: Reconcile hr_profiles Live State
-- Date: 2026-03-11
-- Type: RECONCILIATION — idempotent, non-destructive
--
-- Purpose:
--   Brings the existing live hr_profiles table under repo-tracked SQL.
--   This table was created outside version control during initial
--   employer signup development.
--
-- Guarantees:
--   - Every statement is idempotent (IF NOT EXISTS guards)
--   - No columns dropped
--   - No type conversions
--   - No RLS policies added (deferred to a later migration)
--   - No data modified
--   - No candidate table changes
--
-- Scope:
--   Reconciles columns actually used by:
--     - index.html (employer signup insert)
--     - ik.html (employer dashboard select/upsert)
-- ═══════════════════════════════════════════════════════════════


-- ── 1. TABLE CREATION (if fresh environment) ─────────────────
-- On production this table already exists. On a fresh setup this
-- ensures it is created with the core columns from signup flow.
-- created_at DEFAULT now() is the fresh-environment baseline;
-- the signup flow (index.html:2438) always provides an explicit
-- value, so the default is only relevant for fresh-env seeding.

CREATE TABLE IF NOT EXISTS hr_profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id),
  ad         text,
  soyad      text,
  sirket     text,
  email      text,
  created_at timestamptz DEFAULT now()
);


-- ── 2. EXTENDED COLUMNS (added by ik.html dashboard) ─────────
-- These columns are written by the employer company-profile save
-- (ik.html:1663–1681) and read back on dashboard load (ik.html:1218–1232).
-- The fallback upsert (ik.html:1687) already handles the case where
-- these columns do not yet exist, so this is safe to apply at any time.

ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS sektor          text;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS buyukluk        text;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS web_sitesi      text;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS segment         text;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS telefon         text;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS merkez_sehir    text;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS magaza_sayisi   text;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS aciklama        text;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS aranan_profil   text;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS calisma_saatleri text;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS linkedin        text;


-- ═══════════════════════════════════════════════════════════════
-- WHAT THIS MIGRATION DOES NOT DO (intentionally deferred):
--
--   - No RLS policies (next migration, after product decisions)
--   - No updated_at column or trigger (not used by app code yet)
--   - No CHECK constraints on sektor/buyukluk/segment
--     (no normalization dictionary agreed yet)
--   - No unique constraint on email (signup uses id as PK,
--     email uniqueness is enforced at auth.users level)
--   - No indexes (no query patterns warrant them yet)
--
-- Next: RLS on hr_profiles (self-access for employers) requires
--       resolving the open product decisions from 006.
-- ═══════════════════════════════════════════════════════════════
