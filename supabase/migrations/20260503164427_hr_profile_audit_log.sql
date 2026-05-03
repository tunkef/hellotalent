-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: hr_profile_audit_log                                       ║
-- ║  Tarih: 2026-05-03  REV-3  (Codex T3 C1+C1'+C2+C3+C3' fix)          ║
-- ║  Tier: T3 — auditor + code-reviewer + Codex zorunlu                   ║
-- ║  Yazar: supabase-agent                                                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Amaç: Auditor N1 MEDIUM bulgusu (ISO27001 A.9.4 + KVKK izlenebilirlik)║
-- ║  Admin'in non-admin employer_role / feature_flags / company_id         ║
-- ║  değişikliklerini audit trail'siz yapabilmesi → izlenebilirlik sıfır.  ║
-- ║                                                                        ║
-- ║  Bu migration:                                                         ║
-- ║    - hr_profile_audit_log tablosu (append-only audit trail)            ║
-- ║    - AFTER UPDATE trigger: sensitive field başına 1 row INSERT          ║
-- ║    - RLS: admin kendi company loglarını okur, direct INSERT yasak      ║
-- ║    - KVKK md.7 retention: 2 yıl (cron scheduler P3'te eklenecek)      ║
-- ║                                                                        ║
-- ║  Bağımlı migration: 20260503120000_hr_profile_role_flags_admin_guard   ║
-- ║  (is_admin_employer() + hr_profiles_freeze_sensitive_fields trigger     ║
-- ║   bu migration'dan önce mevcut olmalı)                                 ║
-- ║                                                                        ║
-- ║  ip_address / user_agent: PostgreSQL HTTP context'ten alınamaz →       ║
-- ║  NULL bırakıldı. Gelecekte Edge Function enrichment ile doldurulabilir.║
-- ║                                                                        ║
-- ║  APPLY YOK — dry-run. Tuna onayı sonrası: npm run db:push --linked    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════
-- 0. HELPER FUNCTION — C2 TOCTOU fix
--    SECURITY DEFINER + STABLE → policy subquery race window kapatılır.
--    search_path lock: pg_temp injection riski giderilir (C3).
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.current_employer_company_id()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.hr_profiles WHERE id = auth.uid()
$$;

COMMENT ON FUNCTION public.current_employer_company_id() IS
  'C2 TOCTOU fix — STABLE SECURITY DEFINER. '
  'Admin employer company_id lookup RLS policy''ları için merkezi nokta. '
  'İleride JWT custom claim ile değiştirilebilir.';

-- ═══════════════════════════════════════════════════════════
-- 1. TABLO
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.hr_profile_audit_log (
  id                bigserial PRIMARY KEY,
  target_user_id    uuid        NOT NULL,
  target_company_id bigint,
  changed_by        uuid        NOT NULL,
  changed_by_email  text,
  field_name        text        NOT NULL,
  old_value         jsonb,
  new_value         jsonb,
  changed_at        timestamptz NOT NULL DEFAULT now(),
  ip_address        text,
  user_agent        text
);

COMMENT ON TABLE public.hr_profile_audit_log IS
  'ISO27001 A.9.4 + KVKK md.7 — admin değişiklik audit trail. '
  'KVKK retention: 2 yıl. Cron job P3 scheduler aktif olunca eklenir. '
  'Append-only: kullanıcılar INSERT/UPDATE/DELETE yapamaz.';

COMMENT ON COLUMN public.hr_profile_audit_log.target_user_id    IS 'Değişen hr_profile.id (uuid = auth.users FK)';
COMMENT ON COLUMN public.hr_profile_audit_log.target_company_id IS 'Denormalized — cross-company audit sorgusu için';
COMMENT ON COLUMN public.hr_profile_audit_log.changed_by        IS 'İşlemi yapan admin auth.uid()';
COMMENT ON COLUMN public.hr_profile_audit_log.changed_by_email  IS 'Denormalized — audit report okunabilirliği';
COMMENT ON COLUMN public.hr_profile_audit_log.field_name        IS 'employer_role | feature_flags | company_id';
COMMENT ON COLUMN public.hr_profile_audit_log.old_value         IS 'JSONB — her tür değeri temsil eder';
COMMENT ON COLUMN public.hr_profile_audit_log.new_value         IS 'JSONB — her tür değeri temsil eder';
COMMENT ON COLUMN public.hr_profile_audit_log.ip_address        IS 'NULL — PostgreSQL HTTP context yok; Edge Function enrichment P3';
COMMENT ON COLUMN public.hr_profile_audit_log.user_agent        IS 'NULL — aynı sebep';

-- ═══════════════════════════════════════════════════════════
-- 2. INDEX'LER
--    (a) Hedef kullanıcı bazlı kronolojik okuma
--    (b) Kimin yaptı sorusu (admin audit)
--    (c) Company bazlı toplu audit raporu
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS hr_profile_audit_log_target_user_idx
  ON public.hr_profile_audit_log (target_user_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS hr_profile_audit_log_changed_by_idx
  ON public.hr_profile_audit_log (changed_by, changed_at DESC);

CREATE INDEX IF NOT EXISTS hr_profile_audit_log_company_idx
  ON public.hr_profile_audit_log (target_company_id, changed_at DESC);

-- ═══════════════════════════════════════════════════════════
-- 3. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.hr_profile_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admin kendi şirketinin audit loglarını okur.
-- C2 fix: inline subquery → current_employer_company_id() STABLE SECURITY DEFINER.
-- TOCTOU race window kapatıldı. company_id NULL satırlar kapsam dışı.
-- C3' fix: is_admin_employer() → public.is_admin_employer() (schema qualify).
CREATE POLICY hr_profile_audit_log_admin_read
  ON public.hr_profile_audit_log
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_employer()
    AND target_company_id = public.current_employer_company_id()
  );

-- Policy 2: service_role SELECT + INSERT + DELETE (UPDATE YOK — immutable audit principle).
-- Auditor M1 fix (2026-05-03): FOR ALL → FOR SELECT, INSERT, DELETE.
-- UPDATE engellendi: service_role tamper vektörü kapatıldı.
-- Cron job yalnızca DELETE kullanır (retention purge); INSERT trigger'dan gelir.
-- KVKK md.28/d kapsamında audit log retention bireysel silme talebine
-- tabi değil. legal-reviewer onay: 2026-05-03 (sprint kapsamında).
-- changed_by_email PII içerir ama "verinin işlenmesinin amacının ortadan
-- kalkmasından itibaren" değil, "denetim hukuken zorunlu" muafiyeti geçerli.
CREATE POLICY hr_profile_audit_log_service_role_select
  ON public.hr_profile_audit_log
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY hr_profile_audit_log_service_role_insert
  ON public.hr_profile_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY hr_profile_audit_log_service_role_delete
  ON public.hr_profile_audit_log
  FOR DELETE
  TO service_role
  USING (true);

-- ═══════════════════════════════════════════════════════════
-- 4. GRANT — SELECT only authenticated; INSERT/UPDATE/DELETE yasak.
--    Trigger SECURITY DEFINER ile INSERT yapar → authenticated GRANT gereksiz.
--    Sadece SELECT ver, diğerleri varsayılan DENY kalır.
-- ═══════════════════════════════════════════════════════════
GRANT SELECT ON public.hr_profile_audit_log TO authenticated;

-- INSERT/UPDATE/DELETE authenticated'a açık değil — explicit REVOKE (idempotent).
REVOKE INSERT, UPDATE, DELETE ON public.hr_profile_audit_log FROM authenticated;

-- ═══════════════════════════════════════════════════════════
-- 5. TRIGGER FUNCTION — AFTER UPDATE
--
--    Sensitive field'lar: employer_role, feature_flags, company_id
--    Her field için ayrı row INSERT (batch değil).
--
--    C1+C1' SERVICE_ROLE BYPASS: auth.role() = 'service_role' → NO LOG
--      C1': current_user/session_user KALDIRILDI (SECURITY DEFINER'da yanıltıcı).
--      auth.role() JWT caller-aware — definer role'den bağımsız, Supabase native.
--      service_role (seed, rotation, Iyzico setup) sistem aksiyonu sayılır.
--      C1 STRICT: auth.uid() NULL + service_role değil → RAISE EXCEPTION (abort).
--      Fail-open (RAISE WARNING + RETURN NEW) kapatıldı.
--
--    SELF-UPDATE GUARD: kendi telefon/ad vb. güncellemesi → sensitive field
--      değişmediğinde aşağıdaki IS DISTINCT FROM kontrolleri false döner → hiç
--      INSERT olmaz. Ek guard gereksiz.
--
--    RECURSIVE RİSK: bu function INSERT yapıyor hr_profile_audit_log'a.
--      hr_profile_audit_log'da AFTER UPDATE trigger YOK → loop imkansız. ✓
--
--    PERFORMANS: her hr_profiles UPDATE'inde 3 IS DISTINCT FROM (scalar, ~0.1ms)
--      + yalnızca değişen field başına 1 INSERT. 200 aday = ihmal edilebilir.
--
--    SECURITY DEFINER + SET search_path: fonksiyon yetkisi elevated → public
--      schema dışına çıkma engeli. auth.jwt() güvenli, auth.users SELECT yok.
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.hr_profiles_audit_changes()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed_by       uuid;
  v_changed_by_email text;
BEGIN
  -- ── 0. C1 + C1': service_role detection (Codex REV-3 fix) ──
  -- C1': current_user/session_user KALDIRILDI.
  --   SECURITY DEFINER trigger'da current_user = definer role (yanıltıcı).
  --   session_user = deploy owner (service_role ise her zaman bypass olur).
  --   auth.role() JWT'den çekilir, caller-aware, definer role'den bağımsız.
  --   Supabase native idiom — impersonation/JWT corruption yanıltamaz.
  --
  -- C1 STRICT (A opsiyonu): suspicious context → UPDATE ABORT.
  --   RAISE WARNING + RETURN NEW (fail-open) KALDIRILDI.
  --   Authenticated context yoksa (auth.role() = 'service_role' hariç) exception.
  --   Production risk: Edge Functions normalde service_role kullanır → bu path'e düşmez.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;  -- Sistem aksiyonu: seed / rotation / Iyzico setup — log YOK.
  END IF;

  v_changed_by := auth.uid();
  -- auth.uid() NULL + service_role değil → JWT corrupt / truly anonymous context.
  -- C1 STRICT: fail-open kapatıldı. UPDATE abort et — suspicious context geçmez.
  IF v_changed_by IS NULL THEN
    RAISE EXCEPTION 'hr_profiles_audit_changes: authenticated context required — auth.uid() NULL, auth.role(): %. UPDATE aborted.', auth.role();
  END IF;

  -- ── 1. admin email (denormalized, okunabilirlik) ─────────
  -- auth.users SELECT yasak → auth.jwt() ->> 'email' (migration 062 pattern).
  v_changed_by_email := auth.jwt() ->> 'email';

  -- ── 2. employer_role değişti mi? ────────────────────────
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

  -- ── 3. feature_flags değişti mi? ────────────────────────
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

  -- ── 4. company_id değişti mi? ───────────────────────────
  -- 20260503120000 trigger zaten bunu reddeder (authenticated context).
  -- service_role bypass ile geçerse loglanır (rotasyon izlenebilirliği).
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

  RETURN NEW;
END;
$$;

-- Trigger idempotent: önce drop
DROP TRIGGER IF EXISTS hr_profiles_audit_changes_trg ON public.hr_profiles;

CREATE TRIGGER hr_profiles_audit_changes_trg
  AFTER UPDATE ON public.hr_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.hr_profiles_audit_changes();

-- ═══════════════════════════════════════════════════════════
-- KVKK RETENTION NOTU (ISO27001 A.12.4)
-- ═══════════════════════════════════════════════════════════
-- Audit log'lar 2 yıl tutulur. Cron job P3 scheduler ile eklenecek:
--
--   DELETE FROM hr_profile_audit_log
--   WHERE changed_at < now() - INTERVAL '2 years';
--
-- Bu migration'da cron kurulmamıştır — pg_cron extension P3 scope.
-- Elle temizlik: service_role SQL Editor ile yukarıdaki sorgu.
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- ROLLBACK PLANI
-- ═══════════════════════════════════════════════════════════
-- DROP TRIGGER IF EXISTS hr_profiles_audit_changes_trg ON public.hr_profiles;
-- DROP FUNCTION IF EXISTS public.hr_profiles_audit_changes();
-- DROP FUNCTION IF EXISTS public.current_employer_company_id();
-- DROP POLICY IF EXISTS hr_profile_audit_log_admin_read ON public.hr_profile_audit_log;
-- DROP POLICY IF EXISTS hr_profile_audit_log_service_role_select ON public.hr_profile_audit_log;
-- DROP POLICY IF EXISTS hr_profile_audit_log_service_role_insert ON public.hr_profile_audit_log;
-- DROP POLICY IF EXISTS hr_profile_audit_log_service_role_delete ON public.hr_profile_audit_log;
-- REVOKE SELECT ON public.hr_profile_audit_log FROM authenticated;
-- DROP TABLE IF EXISTS public.hr_profile_audit_log;
-- -- INDEX'ler tablo drop ile birlikte düşer.
