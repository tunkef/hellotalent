-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 062 — Fix coach_invites_own_read RLS policy
-- Date: 2026-03-22
-- Type: RLS (corrective, production fix)
-- Purpose: Original policy from 058 used (SELECT email FROM auth.users WHERE id = auth.uid())
--          which causes "permission denied for table users" when evaluated as the
--          authenticated role. Replace with auth.jwt() ->> 'email' which reads from
--          the JWT claims directly without querying auth.users.
-- Root cause: PostgreSQL evaluates ALL permissive RLS policy conditions, and the
--          auth.users subquery fails before the is_admin() FOR ALL policy can succeed.
-- Also adds: GRANT permissions for coach tables (Supabase default privileges
--          should handle this but explicit GRANTs ensure PostgREST access).
-- Dependencies: 058 (coach_invites table + original policy)
-- ═══════════════════════════════════════════════════════════════════════════

-- Fix the own_read policy
DROP POLICY IF EXISTS coach_invites_own_read ON coach_invites;

CREATE POLICY coach_invites_own_read ON coach_invites
  FOR SELECT USING (
    email = (auth.jwt() ->> 'email')
  );

-- Explicit GRANTs (defensive — should already exist via default privileges)
GRANT SELECT, INSERT, UPDATE, DELETE ON coach_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE ON coach_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON coach_posts TO authenticated;
GRANT SELECT, INSERT, DELETE ON coach_post_likes TO authenticated;

NOTIFY pgrst, 'reload schema';
