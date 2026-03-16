-- Migration 023: Admin read policies for hr_profiles and candidates
-- Admin panel (admin.html) queries these tables for analytics dashboards.
-- Without these policies, admin queries return 0 rows due to RLS.
-- Uses existing is_admin() helper from migration 014.

-- ── hr_profiles: admin read ──
DROP POLICY IF EXISTS hr_admin_read ON hr_profiles;
CREATE POLICY hr_admin_read ON hr_profiles
  FOR SELECT USING (is_admin());

-- ── candidates: admin read ──
DROP POLICY IF EXISTS candidates_admin_read ON candidates;
CREATE POLICY candidates_admin_read ON candidates
  FOR SELECT USING (is_admin());

-- ── companies: admin read ──
DROP POLICY IF EXISTS companies_admin_read ON companies;
CREATE POLICY companies_admin_read ON companies
  FOR SELECT USING (is_admin());
