-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 063 — Fix pg_cron jobs: extensions.http_post -> net.http_post
-- Date: 2026-03-22
-- Type: INFRA (corrective, production fix)
-- Purpose: pg_cron email-send and email-reconcile jobs used extensions.http_post()
--          which requires the 'http' extension. Only pg_net is enabled, which
--          provides net.http_post() with different parameter order.
--          All cron runs were failing silently with "function does not exist".
-- Root cause: Session 12 setup used extensions.http_post syntax but the
--          http extension was never installed — only pg_net was.
-- Fix: Reschedule both jobs using net.http_post(url, body, params, headers)
-- Applied: Directly in production via supabase db query (2026-03-22)
-- ═══════════════════════════════════════════════════════════════════════════

-- NOTE: This migration documents what was applied live.
-- The actual fix was applied via supabase db query using cron.unschedule/cron.schedule.
-- The new job IDs are 6 (email-reconcile) and 7 (email-send).

-- For reference, the corrected cron commands are:

-- email-send (every minute):
-- SELECT net.http_post(
--   'https://cpwibefquojehjehtrog.supabase.co/functions/v1/email-send',
--   '{}'::jsonb,
--   '{}'::jsonb,
--   jsonb_build_object('Content-Type','application/json','Authorization','Bearer <service_role_jwt>')
-- );

-- email-reconcile (every 5 minutes):
-- SELECT net.http_post(
--   'https://cpwibefquojehjehtrog.supabase.co/functions/v1/email-reconcile',
--   '{}'::jsonb,
--   '{}'::jsonb,
--   jsonb_build_object('Content-Type','application/json','Authorization','Bearer <service_role_jwt>')
-- );
