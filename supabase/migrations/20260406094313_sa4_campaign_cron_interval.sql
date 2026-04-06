-- ═══════════════════════════════════════════════════════════════
-- Migration: SA4 — Reduce campaign pg_cron intervals
-- Date: 2026-04-06
--
-- Campaign system is not actively used yet. Running activate/end
-- checks every 5 minutes wastes resources for no benefit.
-- Change: */5 * * * * (every 5 min) → 0 * * * * (every hour).
-- archive-campaigns already runs daily at 3am — no change needed.
--
-- When campaigns go live, consider reverting to */5 or */15.
-- ═══════════════════════════════════════════════════════════════

-- Reschedule by unschedule + schedule (cron.schedule with same name
-- does NOT update in all pg_cron versions; unschedule + re-add is safe).

SELECT cron.unschedule('activate-campaigns');
SELECT cron.schedule(
  'activate-campaigns',
  '0 * * * *',
  'SELECT activate_due_campaigns()'
);

SELECT cron.unschedule('end-campaigns');
SELECT cron.schedule(
  'end-campaigns',
  '0 * * * *',
  'SELECT end_expired_campaigns()'
);

-- Also fix search_path on the campaign functions (missed in SA1
-- because they were defined in pre-baseline migration 014).
DO $$ BEGIN
  ALTER FUNCTION activate_due_campaigns() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION end_expired_campaigns() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION archive_old_ended_campaigns() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
