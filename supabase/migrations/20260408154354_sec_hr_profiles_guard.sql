-- ═══════════════════════════════════════════════════════════════
-- Migration: Harden hr_profiles INSERT + strengthen is_employer()
-- Date: 2026-04-08
-- Security:
--   1. hr_profiles INSERT must have WITH CHECK (auth.uid() = id)
--      Without this, any authenticated user can create an employer
--      profile for themselves and bypass candidate-only restrictions.
--   2. is_employer() now also checks onboarding_completed = true
--      to prevent half-registered employers from accessing candidate data.
-- ═══════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────┐
-- │ 1. DROP + RECREATE hr_profiles INSERT policy with WITH CHECK│
-- └─────────────────────────────────────────────────────────────┘

-- Drop existing INSERT policy (may be named hr_insert or hr_profiles_insert_own)
DO $$
BEGIN
  -- Try both possible names
  BEGIN
    DROP POLICY IF EXISTS hr_insert ON hr_profiles;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  BEGIN
    DROP POLICY IF EXISTS hr_profiles_insert_own ON hr_profiles;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END;
$$;

-- Recreate with strict WITH CHECK: user can only insert their own row
CREATE POLICY hr_profiles_insert_own ON hr_profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- ┌─────────────────────────────────────────────────────────────┐
-- │ 2. Strengthen is_employer() — require onboarding_completed  │
-- └─────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION is_employer()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM hr_profiles
    WHERE id = auth.uid()
      AND onboarding_completed = true
  );
END;
$$;
