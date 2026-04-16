-- =====================================================================
-- FAZ D — 60-day auto-archive for announcements
-- =====================================================================
-- Purpose:
--   Prevent the ht_announcements table / feed from growing unbounded.
--   Set is_active=false on rows whose published_at is older than 60
--   days, unless they are still pinned. Runs daily via pg_cron at
--   04:15 Europe/Istanbul (cron is UTC → 01:15 UTC).
--
-- Why 60 days:
--   Tuna karari 2026-04-17 — feed MVP'de fazla sismesin, 2 aylik
--   scroll yetecek uzunlukta kalsin. Arsivlenen postlar silinmez;
--   is_active=false → feed'den duser ama admin listesinde kalir,
--   manual reactivate mumkun.
--
-- Idempotency:
--   CREATE OR REPLACE FUNCTION + select-then-schedule cron. Existing
--   jobname silinip yeniden eklenir.
--
-- Rollback:
--   SELECT cron.unschedule('ht_ann_auto_archive');
--   DROP FUNCTION archive_stale_announcements();
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.archive_stale_announcements()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_affected int;
BEGIN
  UPDATE public.ht_announcements
    SET is_active = false,
        updated_at = now()
  WHERE is_active = true
    AND published_at IS NOT NULL
    AND published_at < (now() - interval '60 days')
    AND (pinned_until IS NULL OR pinned_until < now());
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_stale_announcements() TO service_role;

-- Remove any previously-scheduled version so re-run is safe.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ht_ann_auto_archive') THEN
    PERFORM cron.unschedule('ht_ann_auto_archive');
  END IF;
END$$;

-- Daily at 01:15 UTC (04:15 Europe/Istanbul summer / 04:15 winter).
SELECT cron.schedule(
  'ht_ann_auto_archive',
  '15 1 * * *',
  $cron$SELECT public.archive_stale_announcements();$cron$
);

COMMIT;
