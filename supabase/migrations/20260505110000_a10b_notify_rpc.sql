-- ═══════════════════════════════════════════════════════════════════
-- A10b: update_hr_notify_settings RPC (SECURITY DEFINER)
-- Tarih: 2026-05-05 11:00
-- Tier: T3
--
-- ÖZET:
-- A10 migration (20260505105000) hr_profiles'a 2 notify kolonu ekledi.
-- Live test sonrası tespit: hr_profiles UPDATE privilege authenticated rol
-- için REVOKE edilmiş (mig 20260503190000 H1 — auditor T3 fix). User
-- direct UPDATE 42501 permission denied alıyor.
--
-- ÇÖZÜM: User-side notify tercihi update için SECURITY DEFINER RPC.
-- Whitelist 3 notify kolonu, NULL parametreler korunur (COALESCE).
-- Diğer kolonlara dokunmaz.
--
-- KAYNAK: A10 live test 5 May 2026 — 42501 root cause GRANT eksikliği.
--
-- ROLLBACK:
-- DROP FUNCTION IF EXISTS public.update_hr_notify_settings(BOOLEAN, BOOLEAN, BOOLEAN);
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_hr_notify_settings(
  p_messages BOOLEAN DEFAULT NULL,
  p_pipeline BOOLEAN DEFAULT NULL,
  p_newsletter BOOLEAN DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.hr_profiles
  SET
    notify_email_messages   = COALESCE(p_messages,   notify_email_messages),
    notify_email_pipeline   = COALESCE(p_pipeline,   notify_email_pipeline),
    notify_email_newsletter = COALESCE(p_newsletter, notify_email_newsletter)
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'hr_profile not found for uid %', v_uid;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.update_hr_notify_settings(BOOLEAN, BOOLEAN, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_hr_notify_settings(BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.update_hr_notify_settings IS
  'A10b (5 May 2026): User-side notify tercihi güncelleme. Whitelist 3 notify kolonu. NULL parametreler korunur. SECURITY DEFINER çünkü hr_profiles UPDATE authenticated için revoke edildi (mig 20260503190000 H1).';

-- Test (manuel):
-- SELECT update_hr_notify_settings(p_messages := false);
-- SELECT notify_email_messages FROM hr_profiles WHERE id = auth.uid();
