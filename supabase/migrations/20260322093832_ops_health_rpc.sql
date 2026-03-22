-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Ops Health Dashboard RPCs
-- Date: 2026-03-22
-- Purpose: Admin-only RPCs for operational health dashboard in admin.html
-- Provides: email pipeline aggregates, CLI pipeline status, cron job metadata
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. get_ops_health_stats() — Single-call operational summary
--
-- Returns email pipeline aggregates from email_outbox,
-- CLI migration pipeline status from supabase_migrations.schema_migrations,
-- and cron job metadata from cron.job (if accessible).
-- SECURITY DEFINER with admin guard via admin_users table.

CREATE OR REPLACE FUNCTION get_ops_health_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_email jsonb;
  v_cli_pipeline jsonb;
  v_cron_jobs jsonb;
  v_now timestamptz := now();
BEGIN
  -- Admin guard
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Email pipeline stats (single scan with conditional aggregation)
  SELECT jsonb_build_object(
    'sent_24h',         COUNT(*) FILTER (WHERE status = 'sent' AND sent_at >= v_now - interval '24 hours'),
    'pending',          COUNT(*) FILTER (WHERE status = 'pending'),
    'failed_1h',        COUNT(*) FILTER (WHERE status = 'failed' AND created_at >= v_now - interval '1 hour'),
    'failed_total',     COUNT(*) FILTER (WHERE status = 'failed'),
    'processing',       COUNT(*) FILTER (WHERE status = 'processing'),
    'stale_processing', COUNT(*) FILTER (WHERE status = 'processing' AND processing_started_at < v_now - interval '10 minutes'),
    'old_pending',      COUNT(*) FILTER (WHERE status = 'pending' AND created_at < v_now - interval '30 minutes'),
    'skipped',          COUNT(*) FILTER (WHERE status = 'skipped'),
    'total',            COUNT(*)
  ) INTO v_email
  FROM email_outbox;

  -- CLI pipeline status (supabase_migrations schema — not PostgREST accessible)
  -- Only uses the 'version' column which is the documented primary column.
  BEGIN
    SELECT jsonb_build_object(
      'total_count',    COUNT(*),
      'last_migration', MAX(version)
    ) INTO v_cli_pipeline
    FROM supabase_migrations.schema_migrations;
  EXCEPTION WHEN OTHERS THEN
    v_cli_pipeline := NULL;
  END;

  -- Cron job metadata (cron schema — may not be accessible)
  -- Step 1: Try to read basic job info from cron.job
  BEGIN
    SELECT jsonb_agg(jsonb_build_object(
      'jobname',  j.jobname,
      'schedule', j.schedule,
      'active',   j.active
    ) ORDER BY j.jobname)
    INTO v_cron_jobs
    FROM cron.job j;

    -- Step 2: If cron.job_run_details is also accessible, enrich with last-run info
    BEGIN
      v_cron_jobs := (
        SELECT jsonb_agg(
          job_info || COALESCE(
            (SELECT jsonb_build_object(
              'last_run_at', rd.start_time,
              'last_status', rd.status,
              'last_return', LEFT(rd.return_message, 200)
            )
            FROM cron.job_run_details rd
            WHERE rd.jobid = (SELECT jj.jobid FROM cron.job jj WHERE jj.jobname = (job_info->>'jobname') LIMIT 1)
            ORDER BY rd.start_time DESC
            LIMIT 1),
            '{}'::jsonb
          )
        ORDER BY job_info->>'jobname')
        FROM jsonb_array_elements(v_cron_jobs) AS job_info
      );
    EXCEPTION WHEN OTHERS THEN
      -- cron.job_run_details not accessible — keep basic job info without run details
      NULL;
    END;
  EXCEPTION WHEN OTHERS THEN
    -- cron schema not accessible at all
    v_cron_jobs := NULL;
  END;

  v_result := jsonb_build_object(
    'email',        v_email,
    'cli_pipeline', v_cli_pipeline,
    'cron_jobs',    v_cron_jobs,
    'queried_at',   v_now
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_ops_health_stats IS 'Admin-only: returns email pipeline aggregates, CLI migration pipeline status, and cron job metadata for ops health dashboard.';

REVOKE ALL ON FUNCTION get_ops_health_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_ops_health_stats() TO authenticated;


-- 2. get_ops_failed_emails(p_limit) — Recent failed emails for admin review

CREATE OR REPLACE FUNCTION get_ops_failed_emails(p_limit int DEFAULT 20)
RETURNS TABLE(
  id bigint,
  email_type text,
  recipient_email text,
  last_error text,
  attempt_count int,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin guard
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  RETURN QUERY
  SELECT e.id, e.email_type, e.recipient_email, e.last_error, e.attempt_count, e.created_at
  FROM email_outbox e
  WHERE e.status = 'failed'
  ORDER BY e.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_ops_failed_emails IS 'Admin-only: returns recent failed emails from outbox for review.';

REVOKE ALL ON FUNCTION get_ops_failed_emails(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_ops_failed_emails(int) TO authenticated;
