-- ═══════════════════════════════════════════════════════════════════
-- A21: auth.role() → (auth.jwt() ->> 'role') refactor
-- Tarih: 2026-05-05 12:00
-- Tier: T2 (refactor, breaking değil — pattern modernization)
--
-- ÖZET:
-- Codex T3 review N1 (3 May): Supabase upstream `auth.role()` helper'ı
-- RLS-style usage için deprecated tag almış. Future-proof alternatif:
-- `(auth.jwt() ->> 'role')`. auth.jwt() her zaman güvenlidir, RLS bypass
-- gerektirmez, Supabase Auth v2/platform v3+ migration'da çakışmaz.
--
-- Etkilenen function: public.hr_profiles_audit_changes()
-- (mig 20260503180000 line 228 — REPLACE chain'in son halkası)
--
-- KAYNAK: pending-approvals A21 (3 May), Codex %90 APPROVE — LOW finding.
--
-- ROLLBACK:
-- Eski auth.role() pattern'a geri dön — 20260503180000 dosyasındaki
-- fonksiyon içeriğini CREATE OR REPLACE ile uygula.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.hr_profiles_audit_changes()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed_by       uuid;
  v_changed_by_email text;
  v_caller_role      text;
BEGIN
  -- ── 0. service_role bypass (A21: auth.jwt() ->> 'role' pattern) ──
  -- auth.role() deprecated → (auth.jwt() ->> 'role') future-proof.
  -- service_role context'te JWT 'role' claim 'service_role' olur.
  v_caller_role := auth.jwt() ->> 'role';
  IF v_caller_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  v_changed_by := auth.uid();
  IF v_changed_by IS NULL THEN
    RAISE EXCEPTION 'hr_profiles_audit_changes: authenticated context required — auth.uid() NULL, jwt.role: %. UPDATE aborted.', v_caller_role;
  END IF;

  -- ── 1. admin email (denormalized, okunabilirlik) ──
  v_changed_by_email := auth.jwt() ->> 'email';

  -- ── 2. employer_role değişti mi? ──
  IF NEW.employer_role IS DISTINCT FROM OLD.employer_role THEN
    INSERT INTO public.hr_profile_audit_log
      (target_user_id, target_company_id, changed_by, changed_by_email,
       field_name, old_value, new_value)
    VALUES
      (OLD.id, OLD.company_id, v_changed_by, v_changed_by_email,
       'employer_role',
       to_jsonb(OLD.employer_role),
       to_jsonb(NEW.employer_role));
  END IF;

  -- ── 3. feature_flags değişti mi? ──
  IF NEW.feature_flags IS DISTINCT FROM OLD.feature_flags THEN
    INSERT INTO public.hr_profile_audit_log
      (target_user_id, target_company_id, changed_by, changed_by_email,
       field_name, old_value, new_value)
    VALUES
      (OLD.id, OLD.company_id, v_changed_by, v_changed_by_email,
       'feature_flags',
       OLD.feature_flags,
       NEW.feature_flags);
  END IF;

  -- ── 4. company_id değişti mi? ──
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    INSERT INTO public.hr_profile_audit_log
      (target_user_id, target_company_id, changed_by, changed_by_email,
       field_name, old_value, new_value)
    VALUES
      (OLD.id, OLD.company_id, v_changed_by, v_changed_by_email,
       'company_id',
       to_jsonb(OLD.company_id),
       to_jsonb(NEW.company_id));
  END IF;

  -- ── 5. account_status değişti mi? ──
  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    INSERT INTO public.hr_profile_audit_log
      (target_user_id, target_company_id, changed_by, changed_by_email,
       field_name, old_value, new_value)
    VALUES
      (OLD.id, OLD.company_id, v_changed_by, v_changed_by_email,
       'account_status',
       to_jsonb(OLD.account_status),
       to_jsonb(NEW.account_status));
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger zaten mig 20260503164427'de CREATE edildi.
-- Bu REPLACE sadece function body'sini günceller.

COMMENT ON FUNCTION public.hr_profiles_audit_changes IS
  'A21 (5 May 2026): auth.role() → (auth.jwt() ->> ''role'') refactor (deprecation prevention). '
  'Ayrıca account_status branch (mig 20260503180000 A4 fix) korundu.';

-- ═══════════════════════════════════════════════════════════════════
-- VERIFY (manuel)
-- ═══════════════════════════════════════════════════════════════════
-- 1. Function source: SELECT prosrc FROM pg_proc WHERE proname = 'hr_profiles_audit_changes';
--    Beklenen: "auth.jwt() ->> 'role'" var, "auth.role()" yok.
--
-- 2. Audit log normal akış: admin → non-admin employer_role UPDATE → log entry
--    (success status — A22 default).
--
-- 3. service_role bypass: service_role context UPDATE → log YOK (return NEW erken).
