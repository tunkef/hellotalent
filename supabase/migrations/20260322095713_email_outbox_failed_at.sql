-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Add failed_at to email_outbox + update ops health RPCs
-- Date: 2026-03-22
-- Purpose: email_outbox has no reliable failure timestamp. created_at is
--          enqueue time, not failure time. This adds failed_at so ops
--          health metrics like "failed in last 1h" are truthful.
-- Depends on: 051 (email_outbox table), ops_health_rpc migration
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add failed_at column (nullable — only set on permanent failure)
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS failed_at timestamptz;

COMMENT ON COLUMN email_outbox.failed_at IS 'Timestamp of permanent failure (attempt_count >= MAX_ATTEMPTS). NULL for non-failed rows. Set by email-send Edge Function.';

-- 2. Update get_ops_health_stats() — failed_1h now uses failed_at
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
    'failed_1h',        COUNT(*) FILTER (WHERE status = 'failed' AND failed_at >= v_now - interval '1 hour'),
    'failed_total',     COUNT(*) FILTER (WHERE status = 'failed'),
    'processing',       COUNT(*) FILTER (WHERE status = 'processing'),
    'stale_processing', COUNT(*) FILTER (WHERE status = 'processing' AND processing_started_at < v_now - interval '10 minutes'),
    'old_pending',      COUNT(*) FILTER (WHERE status = 'pending' AND created_at < v_now - interval '30 minutes'),
    'skipped',          COUNT(*) FILTER (WHERE status = 'skipped'),
    'total',            COUNT(*)
  ) INTO v_email
  FROM email_outbox;

  -- CLI pipeline status (supabase_migrations schema — not PostgREST accessible)
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
  BEGIN
    SELECT jsonb_agg(jsonb_build_object(
      'jobname',  j.jobname,
      'schedule', j.schedule,
      'active',   j.active
    ) ORDER BY j.jobname)
    INTO v_cron_jobs
    FROM cron.job j;

    -- Enrich with last-run info if cron.job_run_details is accessible
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
      NULL;
    END;
  EXCEPTION WHEN OTHERS THEN
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

-- 3. Update get_ops_failed_emails() — return failed_at, order by failed_at
CREATE OR REPLACE FUNCTION get_ops_failed_emails(p_limit int DEFAULT 20)
RETURNS TABLE(
  id bigint,
  email_type text,
  recipient_email text,
  last_error text,
  attempt_count int,
  created_at timestamptz,
  failed_at timestamptz
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
  SELECT e.id, e.email_type, e.recipient_email, e.last_error, e.attempt_count, e.created_at, e.failed_at
  FROM email_outbox e
  WHERE e.status = 'failed'
  ORDER BY e.failed_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;
