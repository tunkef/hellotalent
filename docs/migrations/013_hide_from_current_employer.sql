-- ═══════════════════════════════════════════════════════════════
-- HELLOTALENT — Migration 013: hide_from_current_employer
-- Date: 2026-03-12
-- Scope: candidates only. No frontend changes.
-- Purpose: Allow candidates to hide profile from current employer
--          (employer-side filter applied when live list exists).
-- ═══════════════════════════════════════════════════════════════

-- ── FORWARD ───────────────────────────────────────────────────
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS hide_from_current_employer boolean NOT NULL DEFAULT false;

-- ── ROLLBACK (run manually if needed) ──────────────────────────
-- ALTER TABLE candidates DROP COLUMN IF EXISTS hide_from_current_employer;

-- ── VERIFICATION ───────────────────────────────────────────────
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'candidates'
--   AND column_name = 'hide_from_current_employer';

-- ── RISK ───────────────────────────────────────────────────────
-- Adding a NOT NULL column with DEFAULT is safe for existing rows
-- (they get false). New column is unused until frontend writes it;
-- employer-side filtering is applied only when employer list is live.
