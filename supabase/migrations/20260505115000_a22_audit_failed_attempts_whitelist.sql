-- ═══════════════════════════════════════════════════════════════════
-- A22: N1 audit M2 (failed attempt logging) + L1 (feature_flags whitelist)
-- Tarih: 2026-05-05 11:50
-- Tier: T3
--
-- ÖZET:
-- N1 audit log live (mig 20260503164427). 2 sprint backlog finding kapatılır:
--
-- M2 (MED): Failed attempt audit eksik. BEFORE trigger
--   hr_profiles_freeze_sensitive_fields RAISE EXCEPTION öncesi audit log
--   INSERT yapmıyor → exploit girişimleri (admin role/flags/company_id
--   bypass denemesi) audit'e düşmez. ISO27001 A.12.4 monitoring gap.
--   FIX: 4 RAISE point'in her birinde audit log INSERT
--   (attempt_status='rejected').
--
-- L1 (LOW): feature_flags JSONB plain text. Şu an güvenli (sadece
--   paid:bool, is_internal_admin:bool) ama gelecekte secret token eklenirse
--   audit'te + log'larda leak.
--   FIX: CHECK constraint whitelist — sadece 'paid' + 'is_internal_admin'
--   key'leri kabul. Yeni key (örn 'api_token') reject olur.
--
-- KAYNAK: pending-approvals A22 (3 May 2026), Codex T3 N1 audit review.
--
-- ROLLBACK:
-- DROP TRIGGER hr_profiles_freeze_sensitive_trg ON public.hr_profiles;
-- ... (önceki versiyon migration'dan restore)
-- ALTER TABLE public.hr_profile_audit_log DROP COLUMN attempt_status;
-- ALTER TABLE public.hr_profiles DROP CONSTRAINT hr_profiles_feature_flags_whitelist;
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 1. M2: attempt_status kolon (audit log)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.hr_profile_audit_log
  ADD COLUMN IF NOT EXISTS attempt_status text NOT NULL DEFAULT 'success';

-- CHECK constraint ayrı statement çünkü mevcut INSERT'lerle uyumlu olsun
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hr_profile_audit_log_attempt_status_check'
  ) THEN
    ALTER TABLE public.hr_profile_audit_log
      ADD CONSTRAINT hr_profile_audit_log_attempt_status_check
      CHECK (attempt_status IN ('success', 'rejected'));
  END IF;
END $$;

COMMENT ON COLUMN public.hr_profile_audit_log.attempt_status IS
  'success | rejected — A22 (5 May 2026) ISO27001 A.12.4 monitoring. '
  'Mevcut audit AFTER UPDATE trigger success'' loglar (default), '
  'BEFORE trigger RAISE öncesi rejected loglar.';

-- ═══════════════════════════════════════════════════════════════════
-- 2. M2 helper: _log_hr_audit_rejected
-- SECURITY DEFINER — trigger'dan çağrılabilir, RLS bypass postgres role.
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._log_hr_audit_rejected(
  p_target_user_id    uuid,
  p_target_company_id bigint,
  p_field_name        text,
  p_old_value         jsonb,
  p_new_value         jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_changed_by       uuid;
  v_changed_by_email text;
BEGIN
  v_changed_by := auth.uid();
  IF v_changed_by IS NULL THEN
    -- service_role context (auth.uid NULL) — log atılmaz, RAISE da olmazdı
    RETURN;
  END IF;
  v_changed_by_email := auth.jwt() ->> 'email';

  INSERT INTO public.hr_profile_audit_log
    (target_user_id, target_company_id, changed_by, changed_by_email,
     field_name, old_value, new_value, attempt_status)
  VALUES
    (p_target_user_id, p_target_company_id, v_changed_by, v_changed_by_email,
     p_field_name, p_old_value, p_new_value, 'rejected');
END;
$$;

REVOKE ALL ON FUNCTION public._log_hr_audit_rejected(uuid, bigint, text, jsonb, jsonb) FROM PUBLIC;
-- Sadece postgres + trigger içinden çağrılır. authenticated GRANT yok.

COMMENT ON FUNCTION public._log_hr_audit_rejected IS
  'A22 (5 May 2026): BEFORE trigger RAISE öncesi failed attempt audit INSERT helper. '
  'SECURITY DEFINER + postgres owner — RLS bypass.';

-- ═══════════════════════════════════════════════════════════════════
-- 3. M2: hr_profiles_freeze_sensitive_fields() güncelle
-- 4 RAISE point — her birinde _log_hr_audit_rejected çağrısı.
-- Mevcut branch logic korunur, sadece RAISE öncesi audit INSERT eklenir.
--
-- WARNING: Bu fonksiyon mig 20260503180000 line 344'te REPLACE edildi,
-- branch sıralama kritik (1→6). Audit INSERT ekleme branch logic'ini
-- değiştirmez, sadece RAISE öncesi yan etki.
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.hr_profiles_freeze_sensitive_fields()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── 1. service_role bypass ──
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- ── 2. company_id IMMUTABLE ──
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    PERFORM public._log_hr_audit_rejected(
      OLD.id, OLD.company_id, 'company_id',
      to_jsonb(OLD.company_id), to_jsonb(NEW.company_id)
    );
    RAISE EXCEPTION 'company_id değiştirilemez (service_role veya migration gerekli)'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- ── 3. account_status GUARD ──
  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    IF current_setting('hr.lifecycle_rpc', true) IS DISTINCT FROM 'true' THEN
      PERFORM public._log_hr_audit_rejected(
        OLD.id, OLD.company_id, 'account_status',
        to_jsonb(OLD.account_status), to_jsonb(NEW.account_status)
      );
      RAISE EXCEPTION 'account_status sadece lifecycle RPC üzerinden değiştirilebilir (hr_freeze_account, hr_request_deletion, ...)'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  -- ── 4. Non-admin: kendi sensitive field'larını değiştiremez ──
  IF NOT is_admin_employer() THEN
    IF NEW.employer_role IS DISTINCT FROM OLD.employer_role THEN
      PERFORM public._log_hr_audit_rejected(
        OLD.id, OLD.company_id, 'employer_role',
        to_jsonb(OLD.employer_role), to_jsonb(NEW.employer_role)
      );
      RAISE EXCEPTION 'employer_role değiştirilemez (admin yetkisi gerekli)'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.feature_flags IS DISTINCT FROM OLD.feature_flags THEN
      PERFORM public._log_hr_audit_rejected(
        OLD.id, OLD.company_id, 'feature_flags',
        OLD.feature_flags, NEW.feature_flags
      );
      RAISE EXCEPTION 'feature_flags değiştirilemez (admin yetkisi gerekli)'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  -- ── 5. Admin path: hedef satır admin ise → reject ──
  IF OLD.employer_role = 'admin'
     AND (NEW.employer_role IS DISTINCT FROM OLD.employer_role
          OR NEW.feature_flags IS DISTINCT FROM OLD.feature_flags) THEN
    PERFORM public._log_hr_audit_rejected(
      OLD.id, OLD.company_id, 'admin_role_or_flags',
      jsonb_build_object('employer_role', OLD.employer_role, 'feature_flags', OLD.feature_flags),
      jsonb_build_object('employer_role', NEW.employer_role, 'feature_flags', NEW.feature_flags)
    );
    RAISE EXCEPTION 'Admin role/flags değiştirilemez (service_role rotation gerekli)'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- ── 6. Admin → non-admin hedef: izin ──
  RETURN NEW;
END;
$$;

-- Trigger zaten mig 20260503120000'de CREATE edildi.
-- Bu REPLACE sadece function body'sini günceller, trigger tanımı değişmez.

-- ═══════════════════════════════════════════════════════════════════
-- 4. L1: feature_flags JSONB whitelist CHECK
-- Sadece 'paid' + 'is_internal_admin' key'leri kabul. Yeni key reject.
--
-- Mevcut satır validation: tüm hr_profiles satırları feature_flags = '{}'
-- (default) veya {paid:bool} veya {is_internal_admin:bool}. Constraint'e
-- uyumlu — backfill gerekmez.
--
-- Future-proof: yeni feature flag eklenince constraint güncellenmeli (ek
-- key whitelist'e). RPC + audit yine kontrollü.
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hr_profiles_feature_flags_whitelist'
  ) THEN
    ALTER TABLE public.hr_profiles
      ADD CONSTRAINT hr_profiles_feature_flags_whitelist
      CHECK (
        feature_flags IS NULL OR
        (jsonb_typeof(feature_flags) = 'object'
         AND feature_flags - 'paid' - 'is_internal_admin' = '{}'::jsonb)
      );
  END IF;
END $$;

COMMENT ON CONSTRAINT hr_profiles_feature_flags_whitelist ON public.hr_profiles IS
  'A22 L1 (5 May 2026): feature_flags whitelist — sadece paid + is_internal_admin. '
  'Yeni key eklemek için bu constraint DROP + RECREATE gerekir (audit trail).';

-- ═══════════════════════════════════════════════════════════════════
-- VERIFY (manuel)
-- ═══════════════════════════════════════════════════════════════════
-- 1. attempt_status default success: SELECT attempt_status FROM hr_profile_audit_log LIMIT 1;
-- 2. Failed attempt log: bypass attempt → audit log entry attempt_status='rejected'
-- 3. Whitelist: UPDATE hr_profiles SET feature_flags = '{"exploit":true}' WHERE id = auth.uid();
--    → CHECK constraint reject (yeni key)
-- 4. Whitelist OK: UPDATE hr_profiles SET feature_flags = '{"paid":true}' WHERE id = ...;
--    (admin gerekli, yine de constraint pass)
