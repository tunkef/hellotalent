-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 061 — Guard like_count in coach UPDATE WITH CHECK
-- Date: 2026-03-22
-- Type: RLS (corrective, integrity)
-- Purpose: 060 omitted like_count from coach UPDATE WITH CHECK.
--          A coach could set like_count on draft/changes_requested rows
--          via direct API. Draft rows should always have like_count = 0.
-- Dependencies: 060 (coach_posts_coach_update policy)
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS coach_posts_coach_update ON coach_posts;

CREATE POLICY coach_posts_coach_update ON coach_posts
  FOR UPDATE USING (
    coach_id = auth.uid()
    AND status IN ('draft', 'changes_requested')
  ) WITH CHECK (
    coach_id = auth.uid()
    AND status IN ('draft', 'submitted')
    AND published_at IS NULL
    AND admin_note IS NULL
    AND like_count = 0
  );
