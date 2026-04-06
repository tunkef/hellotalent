-- ═══════════════════════════════════════════════════════════════
-- Migration: LB6 — Security Monitoring
-- Date: 2026-04-06
--
-- 1. security_audit_log table — tracks security events
-- 2. run_rls_audit() — checks all tables for RLS status
-- 3. pg_cron weekly RLS audit job
-- 4. get_security_dashboard() — admin RPC for ops dashboard
-- ═══════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────┐
-- │ 1. Security audit log table                                 │
-- └─────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS security_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,        -- 'rls_audit', 'auth_anomaly', 'policy_gap'
  severity text NOT NULL DEFAULT 'info',  -- 'info', 'warning', 'critical'
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- No RLS — only service_role/admin writes, never exposed to PostgREST
-- Reason: security log must never be writable by authenticated users
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY security_audit_log_admin_read ON security_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

GRANT SELECT ON security_audit_log TO authenticated;

CREATE INDEX idx_security_audit_log_type ON security_audit_log (event_type, created_at DESC);
CREATE INDEX idx_security_audit_log_severity ON security_audit_log (severity) WHERE severity IN ('warning', 'critical');

-- ┌─────────────────────────────────────────────────────────────┐
-- │ 2. RLS audit function                                       │
-- └─────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION run_rls_audit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tables_no_rls jsonb;
  v_tables_rls_no_policy jsonb;
  v_result jsonb;
BEGIN
  -- Find public tables with RLS disabled
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table', c.relname,
    'issue', 'RLS disabled'
  )), '[]'::jsonb)
  INTO v_tables_no_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity
    AND c.relname NOT IN (
      'schema_migrations', 'spatial_ref_sys',
      'security_audit_log'  -- intentionally no user writes
    );

  -- Find tables with RLS enabled but zero policies
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table', c.relname,
    'issue', 'RLS enabled, no policies'
  )), '[]'::jsonb)
  INTO v_tables_rls_no_policy
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity
    AND NOT EXISTS (
      SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
    )
    AND c.relname NOT IN (
      'email_outbox',           -- service_role only (documented in architecture-decisions.md)
      'candidate_view_stats'    -- internal trigger-managed counter (no user access needed)
    );

  v_result := jsonb_build_object(
    'audit_time', now(),
    'tables_no_rls', v_tables_no_rls,
    'tables_rls_no_policy', v_tables_rls_no_policy,
    'no_rls_count', jsonb_array_length(v_tables_no_rls),
    'no_policy_count', jsonb_array_length(v_tables_rls_no_policy)
  );

  -- Log the audit result
  INSERT INTO security_audit_log (event_type, severity, details)
  VALUES (
    'rls_audit',
    CASE
      WHEN jsonb_array_length(v_tables_no_rls) > 0 THEN 'critical'
      WHEN jsonb_array_length(v_tables_rls_no_policy) > 0 THEN 'warning'
      ELSE 'info'
    END,
    v_result
  );

  RETURN v_result;
END;
$$;

-- ┌─────────────────────────────────────────────────────────────┐
-- │ 3. Weekly RLS audit cron job                                │
-- └─────────────────────────────────────────────────────────────┘

-- Runs every Sunday at 4am UTC
SELECT cron.schedule(
  'weekly-rls-audit',
  '0 4 * * 0',
  'SELECT run_rls_audit()'
);

-- ┌─────────────────────────────────────────────────────────────┐
-- │ 4. Security dashboard RPC (extends ops health)              │
-- └─────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION get_security_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_last_audit jsonb;
  v_recent_events jsonb;
  v_auth_stats jsonb;
BEGIN
  -- Admin guard
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Last RLS audit result
  SELECT details INTO v_last_audit
  FROM security_audit_log
  WHERE event_type = 'rls_audit'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Recent security events (last 30 days)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'event_type', event_type,
    'severity', severity,
    'details', details,
    'created_at', created_at
  ) ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_recent_events
  FROM security_audit_log
  WHERE created_at >= now() - interval '30 days'
  LIMIT 50;

  -- Auth stats: total users, recent signups, MFA adoption
  SELECT jsonb_build_object(
    'total_candidates', (SELECT count(*) FROM candidates),
    'total_employers', (SELECT count(*) FROM hr_profiles),
    'active_candidates', (SELECT count(*) FROM candidates WHERE is_active = true AND account_status = 'active'),
    'frozen_accounts', (SELECT count(*) FROM candidates WHERE account_status = 'frozen'),
    'pending_deletion', (SELECT count(*) FROM candidates WHERE account_status = 'pending_deletion'),
    'signups_last_7d', (
      SELECT count(*) FROM auth.users
      WHERE created_at >= now() - interval '7 days'
    ),
    'signups_last_30d', (
      SELECT count(*) FROM auth.users
      WHERE created_at >= now() - interval '30 days'
    )
  ) INTO v_auth_stats;

  v_result := jsonb_build_object(
    'last_rls_audit', COALESCE(v_last_audit, '{}'::jsonb),
    'recent_events', v_recent_events,
    'auth_stats', v_auth_stats
  );

  RETURN v_result;
END;
$$;
