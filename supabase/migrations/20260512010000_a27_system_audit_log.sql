-- ════════════════════════════════════════════════════════════════════
-- A27: system_audit_log — migration + system event audit trail
-- Reform v3.4 — 12 May 2026
--
-- Tetik: A26 migration apply sırasında hr_profile_audit_log.event_type
-- kolonu olmadığı için audit log entry skip oldu. Bu tablo migration
-- apply ve diğer sistem event'leri için DOĞRU schema.
--
-- hr_profile_audit_log → hr_profile sensitive field changes (employer_role,
--                        feature_flags, company_id) — değişmiyor.
-- system_audit_log     → migration, secret rotate, system event — yeni.
--
-- KVKK md.7 / ISO27001 A.12.4 monitoring. Append-only.
-- Service role only (cron, migration runtime, edge function).
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- 1. Table
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.system_audit_log (
  id              bigserial PRIMARY KEY,
  event_type      text        NOT NULL,
  event_subtype   text,
  attempt_status  text        NOT NULL DEFAULT 'success'
                  CHECK (attempt_status IN ('success', 'rejected', 'error')),
  payload         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  actor           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.system_audit_log IS
  'ISO27001 A.12.4 monitoring + KVKK md.7 trail. Migration apply, secret rotate, '
  'system event log. Append-only. Service role + admin readers only.';

COMMENT ON COLUMN public.system_audit_log.event_type IS
  'Categori: migration | secret_rotation | edge_function_deploy | rls_change | other';
COMMENT ON COLUMN public.system_audit_log.event_subtype IS
  'Spesifik: migration adı, edge function adı, vs.';
COMMENT ON COLUMN public.system_audit_log.attempt_status IS
  'success | rejected | error — rejected RLS bypass denemeleri, error migration fail';
COMMENT ON COLUMN public.system_audit_log.payload IS
  'JSONB — event-specific data (file paths, counts, vs.)';
COMMENT ON COLUMN public.system_audit_log.actor IS
  'Kim yaptı: postgres | service_role | <admin_email> | cron:<job_name>';

-- ────────────────────────────────────────────────────────────────────
-- 2. Indexes (KVKK retention purge + dashboard query)
-- ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_system_audit_log_created_at
  ON public.system_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_audit_log_event_type
  ON public.system_audit_log (event_type, created_at DESC);

-- ────────────────────────────────────────────────────────────────────
-- 3. RLS — service role + admin read only (append yasak)
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.system_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin (is_admin_employer) okuma — kendi company event'leri için filter yok
-- çünkü sistem event'leri company-bound değil. Sadece role-based.
DROP POLICY IF EXISTS system_audit_log_admin_select ON public.system_audit_log;
CREATE POLICY system_audit_log_admin_select ON public.system_audit_log
  FOR SELECT TO authenticated
  USING (
    -- is_admin_employer() var mı kontrol (A23 migration sonrası mevcut)
    EXISTS (
      SELECT 1 FROM public.hr_profiles
      WHERE id = auth.uid()
        AND employer_role = 'admin'
    )
  );

-- INSERT yasak (authenticated). Sadece service_role INSERT yapabilir.
-- Service role RLS bypass eder (Supabase default davranış).

-- UPDATE/DELETE yasak (append-only).

-- ────────────────────────────────────────────────────────────────────
-- 4. Helper function — INSERT entry (security definer for triggers/migrations)
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_system_event(
  p_event_type    text,
  p_event_subtype text DEFAULT NULL,
  p_payload       jsonb DEFAULT '{}'::jsonb,
  p_status        text DEFAULT 'success',
  p_actor         text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id bigint;
  v_actor text;
BEGIN
  v_actor := COALESCE(
    p_actor,
    current_setting('request.jwt.claim.email', true),
    current_user
  );

  INSERT INTO public.system_audit_log (
    event_type, event_subtype, attempt_status, payload, actor
  )
  VALUES (
    p_event_type, p_event_subtype, p_status, p_payload, v_actor
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

COMMENT ON FUNCTION public.log_system_event IS
  'A27 helper — migration, trigger, cron event log INSERT. '
  'Actor default: JWT email > current_user. search_path locked.';

-- ────────────────────────────────────────────────────────────────────
-- 5. Bu migration'ı kendi tablosuna kaydet (örnek kullanım)
-- ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  PERFORM public.log_system_event(
    'migration',
    'a27_system_audit_log',
    jsonb_build_object(
      'migration', '20260512010000_a27_system_audit_log',
      'description', 'system_audit_log tablosu + log_system_event() helper',
      'reform_version', 'v3.4',
      'origin', 'A26 audit log skip — hr_profile_audit_log uyumsuz'
    ),
    'success',
    'postgres'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[A27] Self-log skipped: %', SQLERRM;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 6. Verify
-- ────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.system_audit_log
  WHERE event_subtype = 'a27_system_audit_log';

  IF v_count > 0 THEN
    RAISE NOTICE '[A27] VERIFY OK: tablo + helper + self-log entry mevcut';
  ELSE
    RAISE NOTICE '[A27] WARN: self-log entry yok, tablo yine de oluştu';
  END IF;
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- Sonraki migration'lar için pattern:
--
--   DO $$
--   BEGIN
--     PERFORM public.log_system_event(
--       'migration',
--       '<migration_name>',
--       jsonb_build_object('description', '...', 'changes', '...'),
--       'success',
--       'postgres'
--     );
--   EXCEPTION WHEN OTHERS THEN
--     RAISE NOTICE '[<MIG>] Audit log skipped: %', SQLERRM;
--   END $$;
--
-- TEMPLATE.sql'e bu pattern eklenir.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.log_system_event(text, text, jsonb, text, text);
--   DROP TABLE IF EXISTS public.system_audit_log;
-- ════════════════════════════════════════════════════════════════════
