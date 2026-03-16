-- Migration 022: Fix positions admin read RLS policy
-- The original policy (020) referenced hr_profiles.employer_role = 'admin'
-- which doesn't exist. Admin users are in admin_users table.
-- Uses existing is_admin() helper from migration 014.

DROP POLICY IF EXISTS positions_admin_read ON positions;

CREATE POLICY positions_admin_read ON positions
  FOR SELECT USING (is_admin());
