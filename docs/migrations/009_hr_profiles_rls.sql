-- ═══════════════════════════════════════════════════════════════
-- HELLOTALENT — Migration 009: RLS Self-Access on hr_profiles
-- Date: 2026-03-11
-- Type: SECURITY — enables RLS, adds self-access policies
--
-- Purpose:
--   Locks down hr_profiles so each employer can only read and
--   write their own row. This is the foundational security layer
--   for the employer side — equivalent to what migration 001
--   established for candidate tables.
--
-- Guarantees:
--   - Idempotent (DROP POLICY IF EXISTS before each CREATE)
--   - No candidate table changes
--   - No cross-user read access
--   - No DELETE policy (employer account deletion is not an
--     app feature; if needed later, handle via admin/service role)
--
-- Identity model:
--   hr_profiles.id = auth.users.id (FK established in 008)
--   "employer" and "recruiter" are the same actor class for now.
--
-- Depends on: 008_hr_profiles_reconcile.sql
-- ═══════════════════════════════════════════════════════════════


-- ── 1. ENABLE RLS ────────────────────────────────────────────
-- Safe to call repeatedly — Postgres no-ops if already enabled.

ALTER TABLE hr_profiles ENABLE ROW LEVEL SECURITY;


-- ── 2. SELF-ACCESS POLICIES ─────────────────────────────────
-- Pattern matches 001 (candidate child tables): DROP IF EXISTS
-- then CREATE, so re-running this migration is safe.

-- SELECT: employer can read their own profile row
DROP POLICY IF EXISTS hr_select ON hr_profiles;
CREATE POLICY hr_select ON hr_profiles FOR SELECT
  USING (auth.uid() = id);

-- INSERT: employer can insert their own profile row
-- WITH CHECK ensures the id they supply matches their auth session.
DROP POLICY IF EXISTS hr_insert ON hr_profiles;
CREATE POLICY hr_insert ON hr_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: employer can update their own profile row
-- USING gates which rows are visible for update;
-- WITH CHECK ensures they cannot change id to another user's.
DROP POLICY IF EXISTS hr_update ON hr_profiles;
CREATE POLICY hr_update ON hr_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ═══════════════════════════════════════════════════════════════
-- WHAT THIS MIGRATION DOES NOT DO (intentionally deferred):
--
--   - No DELETE policy (no app flow deletes employer profiles)
--   - No employer read access to candidate tables
--   - No cross-employer visibility (e.g. company directory)
--   - No role-based differentiation (admin vs viewer)
--   - No service-role bypass policies (Supabase service role
--     already bypasses RLS by default)
--
-- Next: Employer read access to candidate tables requires
--       resolving the visibility scope decision from 006.
-- ═══════════════════════════════════════════════════════════════
