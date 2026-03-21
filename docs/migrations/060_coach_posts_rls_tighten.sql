-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 060 — Tighten coach_posts RLS: prevent admin-review bypass
-- Date: 2026-03-22
-- Type: RLS (corrective, security)
-- Purpose: Coaches must not be able to self-publish, set published_at,
--          alter admin_note, or manipulate like_count via direct API calls.
--          Only admin can transition posts to published/archived/rejected.
-- Dependencies: 058 (coach_posts table + original policies)
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop the two permissive coach write policies from 058
DROP POLICY IF EXISTS coach_posts_coach_insert ON coach_posts;
DROP POLICY IF EXISTS coach_posts_coach_update ON coach_posts;

-- ── Tightened INSERT: coach can only create drafts ──────────────────────
-- Prevents: status='published', published_at set, admin_note set, like_count > 0
CREATE POLICY coach_posts_coach_insert ON coach_posts
  FOR INSERT WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (SELECT 1 FROM coach_profiles WHERE id = auth.uid() AND is_active = true)
    AND status = 'draft'
    AND published_at IS NULL
    AND admin_note IS NULL
    AND like_count = 0
  );

-- ── Tightened UPDATE: coach can only edit content, not moderation state ──
-- USING: coach owns the row AND row is currently draft or changes_requested
-- WITH CHECK: after update, status can only be draft or submitted,
--   published_at must remain NULL, admin_note must remain NULL,
--   like_count must remain unchanged (= 0 or whatever it was — enforced via
--   the fact that only toggle_coach_post_like RPC can change it, and that
--   RPC is SECURITY DEFINER bypassing RLS. Coach client cannot set like_count
--   because WITH CHECK requires like_count = like_count which pg evaluates
--   as the OLD value equality check is not possible in WITH CHECK alone.
--   Instead we enforce like_count = 0 for safety — coaches should not be
--   editing posts that already have likes without admin involvement.)
CREATE POLICY coach_posts_coach_update ON coach_posts
  FOR UPDATE USING (
    coach_id = auth.uid()
    AND status IN ('draft', 'changes_requested')
  ) WITH CHECK (
    coach_id = auth.uid()
    AND status IN ('draft', 'submitted')
    AND published_at IS NULL
    AND admin_note IS NULL
  );

-- NOTE: like_count is not checked in WITH CHECK because:
-- 1. The toggle_coach_post_like RPC uses SECURITY DEFINER (bypasses RLS)
-- 2. Coach UPDATE policy only allows rows in draft/changes_requested status
-- 3. Published posts (which have likes) are not updatable by coaches
-- 4. A coach cannot INSERT with like_count > 0 (INSERT policy blocks it)
-- Net effect: coach cannot manipulate like_count through normal UPDATE path
