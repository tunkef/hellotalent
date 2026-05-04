-- ═══════════════════════════════════════════════════════════════════
-- Migration: a23q7_pool_log_cron_purge
-- Date: 2026-05-04
-- Ref: A23 Q7 (Codex T3) — employer_pool_query_log 90-day retention
-- Tier: T3 (KVKK md.11 retention)
-- ─────────────────────────────────────────────────────────────────
-- AMAÇ:
--   employer_pool_query_log tablosunda 90 günden eski kayıtları otomatik
--   sil. KVKK md.11 makul retention süresi.
--
-- TASARIM:
--   pg_cron job — günde bir kez (03:30 UTC, low traffic) eski kayıtları
--   DELETE eder. Service_role context (cron) → RLS bypass.
--
-- BAĞIMLILIK:
--   - 20260504184849 employer_pool_query_log tablosu hazır olmalı.
--   - pg_cron extension aktif (mevcut: 20260503200000_hr_lifecycle_cron_purge'da kullanılıyor).
--
-- ROLLBACK:
--   SELECT cron.unschedule('purge_employer_pool_log_90d');
--   DROP FUNCTION public.purge_employer_pool_log_90d();
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.purge_employer_pool_log_90d()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_deleted bigint;
BEGIN
  WITH del AS (
    DELETE FROM public.employer_pool_query_log
    WHERE accessed_at < now() - interval '90 days'
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM del;

  RAISE NOTICE '[Q7 cron] employer_pool_query_log purge: % rows deleted (>90d)', v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_employer_pool_log_90d() FROM PUBLIC;

-- ─────────────────────────────────────────────────────────────────
-- Schedule: günlük 03:30 UTC
-- ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge_employer_pool_log_90d')
      WHERE EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'purge_employer_pool_log_90d'
      );

    PERFORM cron.schedule(
      'purge_employer_pool_log_90d',
      '30 3 * * *',
      $cron$SELECT public.purge_employer_pool_log_90d();$cron$
    );
  ELSE
    RAISE NOTICE '[Q7 cron] pg_cron extension yok — manuel cron veya skip.';
  END IF;
END $$;

COMMENT ON FUNCTION public.purge_employer_pool_log_90d() IS
  'A23 Q7 retention (2026-05-04) — KVKK md.11 90-day retention purge for '
  'employer_pool_query_log. Daily 03:30 UTC.';
