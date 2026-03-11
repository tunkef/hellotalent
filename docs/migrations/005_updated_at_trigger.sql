-- ═══════════════════════════════════════════════════════════════
-- HELLOTALENT — Migration 005: updated_at auto-trigger
-- Date: 2026-03-11
-- Scope: candidates table only
-- Idempotent: CREATE OR REPLACE + DROP TRIGGER IF EXISTS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_candidates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_candidates_updated_at ON candidates;

CREATE TRIGGER trg_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION set_candidates_updated_at();
