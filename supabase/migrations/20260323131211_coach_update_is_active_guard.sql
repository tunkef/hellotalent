-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: coach_posts UPDATE policy — add is_active guard
-- Date: 2026-03-23
-- Type: RLS (security hardening)
-- Purpose: Deactivated coaches (is_active=false) must not be able to edit
--          or submit posts via direct API calls, even if UI guard is bypassed.
-- Dependencies: 058 (coach_posts table), 060 (tightened policies)
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop the existing UPDATE policy from migration 060
DROP POLICY IF EXISTS coach_posts_coach_update ON coach_posts;

-- Recreate with is_active guard in both USING and WITH CHECK
-- USING: coach owns the row, row is draft/changes_requested, coach is active
-- WITH CHECK: coach owns the row, status can only be draft/submitted,
--   published_at and admin_note must remain NULL, coach must be active
CREATE POLICY coach_posts_coach_update ON coach_posts
  FOR UPDATE USING (
    coach_id = auth.uid()
    AND status IN ('draft', 'changes_requested')
    AND EXISTS (SELECT 1 FROM coach_profiles WHERE id = auth.uid() AND is_active = true)
  ) WITH CHECK (
    coach_id = auth.uid()
    AND status IN ('draft', 'submitted')
    AND published_at IS NULL
    AND admin_note IS NULL
    AND EXISTS (SELECT 1 FROM coach_profiles WHERE id = auth.uid() AND is_active = true)
  );
