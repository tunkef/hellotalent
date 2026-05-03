-- ╔══════════════════════════════════════════════════════════════╗
-- ║  A8-B Task 1 — hr_profiles Lifecycle Schema                 ║
-- ║  Migration: 20260503180000_hr_profiles_lifecycle.sql        ║
-- ║  Tier: T4 (architect onaylı — tüm A blokları Evet)          ║
-- ║  REV-2: Auditor T4 BLOCK kapatma (A1+A2+A4+A5 fix)         ║
-- ║                                                              ║
-- ║  Kapsam:                                                     ║
-- ║    - account_status_enum REUSE (candidates'tan — zaten var) ║
-- ║    - 6 yeni kolon hr_profiles'a                             ║
-- ║    - BEFORE UPDATE trigger: status → is_active + timestamps  ║
-- ║    - 2 partial index (cron taraması için)                    ║
-- ║    - Backfill: mevcut satırlara account_status = 'active'   ║
-- ║    - A1: hr_profiles_update_own policy revize (account_status guard) ║
-- ║    - A4: hr_profiles_audit_changes() account_status branch  ║
-- ║    - A5: last_active_at backfill created_at'ten alır        ║
-- ║                                                              ║
-- ║  NOTLAR:                                                     ║
-- ║    - account_status_enum: 043_drift_reconciliation'da        ║
-- ║      candidates için tanımlandı, hr_profiles'ta reuse edilir ║
-- ║    - is_active hr_profiles'ta yoktu, bu migration ekler     ║
-- ║    - RLS: yeni tablo yok — mevcut policy revize edildi      ║
-- ║      (hr_profiles_update_own account_status guard eklendi)  ║
-- ║    - GRANT: mevcut GRANT UPDATE ON hr_profiles yeterli      ║
-- ║                                                              ║
-- ║  LIFECYCLE: active → pending_deletion (30g geri alma)       ║
-- ║    → soft_deleted (60g PII grace) → pii_redacted            ║
-- ║  KVKK md.7 retention: 30g + 60g = 90g toplam               ║
-- ║  legal-reviewer onay tarihi: ileriki sprint                  ║
-- ║                                                              ║
-- ║  DRY-RUN — APPLY YAPMA                                       ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════
-- 1. PRE-CHECK: account_status_enum varlığını doğrula
--    043_drift_reconciliation'da CREATE TYPE account_status_enum
--    ENUM ('active', 'frozen', 'pending_deletion') yapıldı.
--    Bu migration reuse eder, yeniden CREATE etmez.
--    Eğer enum yoksa (fresh env) guard ile oluştur.
-- ═══════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'account_status_enum'
  ) THEN
    CREATE TYPE account_status_enum AS ENUM ('active', 'frozen', 'pending_deletion');
  END IF;
END
$$;

-- ═══════════════════════════════════════════════
-- 2. hr_profiles — yeni lifecycle kolonları
--    is_active: candidates tablosundaki gibi havuz visibility
--    account_status: candidates ile paralel lifecycle contract
--    frozen_at / deletion_scheduled_at / soft_deleted_at: timestamp audit
--    last_active_at: son login/action — cron ve analytics için
--    pii_redacted: 90g sonrası irreversible flag
-- ═══════════════════════════════════════════════
ALTER TABLE public.hr_profiles
  ADD COLUMN IF NOT EXISTS is_active                boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS account_status           account_status_enum NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS frozen_at                timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at    timestamptz,
  ADD COLUMN IF NOT EXISTS last_active_at           timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS soft_deleted_at          timestamptz,
  ADD COLUMN IF NOT EXISTS pii_redacted             boolean     NOT NULL DEFAULT false;

-- ═══════════════════════════════════════════════
-- 3. Trigger fonksiyonu: sync_hr_account_status_to_active()
--    BEFORE UPDATE ON account_status
--
--    Tasarım kararları:
--    - frozen/pending_deletion → is_active = false (havuz gizlenir)
--    - active'e dönüş: is_active DOKUNULMAZ (kullanıcı tercihi korunur)
--      Exception: frozen/pending_deletion'dan active'e geçişte
--      is_active'i true'ya çevirme — kullanıcı kendi görünürlüğünü yönetir
--    - frozen_at: sadece frozen geçişinde set edilir, active'e dönüşte NULL
--    - deletion_scheduled_at: now() + 30g (30g soft-delete grace)
--    - soft_deleted_at: Task 2 RPC'leri set eder, trigger değil
--    - pii_redacted: trigger'da dokunulmaz — irreversible, RPC'den
--
--    Architect kararı:
--    - Lone admin BLOCK → Task 2 RPC'de guard (trigger scope dışı)
--    - Frozen İK havuz: HAYIR (sadece settings — is_active=false yeterli)
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.sync_hr_account_status_to_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- frozen geçişi
  IF NEW.account_status = 'frozen' AND OLD.account_status IS DISTINCT FROM 'frozen' THEN
    NEW.is_active          := false;
    NEW.frozen_at          := now();
    NEW.deletion_scheduled_at := NULL; -- frozen ≠ deletion
  END IF;

  -- pending_deletion geçişi
  IF NEW.account_status = 'pending_deletion' AND OLD.account_status IS DISTINCT FROM 'pending_deletion' THEN
    NEW.is_active             := false;
    NEW.deletion_scheduled_at := now() + INTERVAL '30 days';
    -- frozen_at: eğer önceden frozensa koru, değilse NULL bırak
  END IF;

  -- active'e dönüş (reactivate)
  IF NEW.account_status = 'active' AND OLD.account_status IN ('frozen', 'pending_deletion') THEN
    -- is_active DOKUNULMAZ — kullanıcı havuz görünürlüğünü ayrıca yönetir
    NEW.frozen_at             := NULL;
    NEW.deletion_scheduled_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: BEFORE UPDATE OF account_status
-- Sadece account_status kolonu değişince tetiklenir — gereksiz fire önlenir
DROP TRIGGER IF EXISTS hr_sync_account_status ON public.hr_profiles;
CREATE TRIGGER hr_sync_account_status
  BEFORE UPDATE OF account_status ON public.hr_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_hr_account_status_to_active();

-- ═══════════════════════════════════════════════
-- 4. Partial index — cron taraması
--    deletion_scheduled_at: 30g geçenleri bul (PII redact job)
--    soft_deleted_at: redact edilmemiş soft-deleted satırlar
-- ═══════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS hr_pending_deletion_idx
  ON public.hr_profiles(deletion_scheduled_at)
  WHERE account_status = 'pending_deletion';

CREATE INDEX IF NOT EXISTS hr_soft_deleted_idx
  ON public.hr_profiles(soft_deleted_at)
  WHERE soft_deleted_at IS NOT NULL AND pii_redacted = false;

-- ═══════════════════════════════════════════════
-- 5. Backfill — mevcut satırlar
--    Tüm mevcut hr_profiles satırları 'active' olarak işaretlenir.
--    is_active: NULL değil, DEFAULT true zaten atanmış.
--    last_active_at: A5 FIX — DEFAULT now() tüm geçmiş satırlara yanlış
--    "şu an" tarihini yazar. Backfill: created_at varsa onu kullan,
--    yoksa now() fallback. Doğru kronoloji korunur.
-- ═══════════════════════════════════════════════
UPDATE public.hr_profiles
SET account_status = 'active'
WHERE account_status IS NULL;
-- NOT: NOT NULL DEFAULT 'active' olduğu için bu satır sadece
-- edge case'e karşı (fresh env transaction sırası) güvencedir.

-- A5: last_active_at backfill — created_at varsa kullan, yoksa now()
-- NOT: Migration runner postgres rolü ile çalışır, N1 audit trigger
-- service_role detection fail eder. Backfill için trigger DISABLE.
ALTER TABLE public.hr_profiles DISABLE TRIGGER hr_profiles_audit_changes_trg;
ALTER TABLE public.hr_profiles DISABLE TRIGGER hr_profiles_freeze_sensitive_trg;

UPDATE public.hr_profiles
SET last_active_at = COALESCE(created_at, now())
WHERE last_active_at IS NOT NULL;
-- NOT: NOT NULL DEFAULT now() ile eklendi — tüm satırlar now() aldı.
-- Bu UPDATE created_at ile geriye dönük düzeltir (daha doğru kronoloji).

ALTER TABLE public.hr_profiles ENABLE TRIGGER hr_profiles_audit_changes_trg;
ALTER TABLE public.hr_profiles ENABLE TRIGGER hr_profiles_freeze_sensitive_trg;

-- ═══════════════════════════════════════════════
-- 6. Mevcut trigger uyumu: hr_profiles_freeze_sensitive_fields()
--    (20260503120000_hr_profile_role_flags_admin_guard.sql)
--
--    Mevcut trigger employer_role + company_id freeze yapıyor.
--    Yeni kolonlar (account_status, frozen_at, vb.) sensitive
--    field sayılmaz → freeze trigger'a DOKUNULMAZ.
--    account_status değişikliği Task 2 RPC'lerinden gelir (SECURITY DEFINER).
--    BEFORE UPDATE trigger (hr_sync_account_status) account_status
--    geçişini yönetir; RLS policy A1 fix ile account_status direct
--    UPDATE'i RLS katmanında da bloklar.
-- ═══════════════════════════════════════════════

-- ═══════════════════════════════════════════════
-- 7. A1 FIX — hr_profiles_update_own policy revize
--    Auditor A1 HIGH: mevcut policy account_status değişimine
--    izin veriyor → aday kendi status'unu doğrudan değiştirebilir.
--
--    FIX: WITH CHECK'e account_status IS NOT DISTINCT FROM subquery.
--    Subquery: kendi satırının mevcut account_status değerini çeker.
--    Değiştirmeye çalışırsa WITH CHECK false → UPDATE reject.
--
--    TOCTOU notu: Subquery BEFORE UPDATE trigger sonrası çalışır
--    (trigger BEFORE, policy WITH CHECK AFTER trigger ama BEFORE actual write).
--    sync_hr_account_status_to_active() SECURITY DEFINER trigger
--    account_status geçişlerini yönetir → sadece Task 2 RPC context'i
--    bu trigger'ı doğru parametrelerle çağırır.
--    Policy subquery + trigger kombinasyonu güvenli: direct UPDATE
--    account_status değiştirmeye çalışırsa WITH CHECK blokar.
--
--    Bağımlı migration: 20260503120000 (policy orada CREATE edildi).
--    Bu migration DROP + yeniden CREATE ederek revize eder.
-- ═══════════════════════════════════════════════
DROP POLICY IF EXISTS hr_profiles_update_own ON public.hr_profiles;

CREATE POLICY hr_profiles_update_own ON public.hr_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND account_status IS NOT DISTINCT FROM (
      SELECT account_status FROM public.hr_profiles WHERE id = auth.uid()
    )
  );

COMMENT ON POLICY hr_profiles_update_own ON public.hr_profiles IS
  'A1 FIX (2026-05-03 REV-2): account_status direct UPDATE bloklandı. '
  'Kullanıcı kendi profil bilgilerini (isim, email, vb.) güncelleyebilir '
  'ama account_status değiştiremez. Status değişimi sadece Task 2 '
  'RPC (SECURITY DEFINER) üzerinden gerçekleşir.';

-- ═══════════════════════════════════════════════
-- 8. A4 FIX — hr_profiles_audit_changes() account_status branch
--    Migration 20260503164427'deki trigger function CREATE OR REPLACE.
--    Mevcut 3 field (employer_role, feature_flags, company_id) korunur.
--    account_status branch eklendi: status geçişleri audit trail'e düşer.
--
--    Neden burada: lifecycle migration account_status ekliyor →
--    audit trigger aynı migration sequence'ta güncellenmeli.
--    20260503164427 retroaktif edit yapılmaz → bu migration REPLACE eder.
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.hr_profiles_audit_changes()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed_by       uuid;
  v_changed_by_email text;
BEGIN
  -- ── 0. C1 + C1': service_role detection ──
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  v_changed_by := auth.uid();
  IF v_changed_by IS NULL THEN
    RAISE EXCEPTION 'hr_profiles_audit_changes: authenticated context required — auth.uid() NULL, auth.role(): %. UPDATE aborted.', auth.role();
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

  -- ── 5. A4 FIX: account_status değişti mi? ──────────────────
  -- KVKK izlenebilirlik + ISO27001 A.9.4: status geçişleri
  -- (frozen/pending_deletion/reactivation) audit trail'e yazılır.
  -- service_role bypass: yukarıda dönüldü → sadece authenticated geçişler loglanır.
  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    INSERT INTO public.hr_profile_audit_log
      (target_user_id, target_company_id, changed_by, changed_by_email,
       field_name, old_value, new_value)
    VALUES
      (OLD.id, OLD.company_id, v_changed_by, v_changed_by_email,
       'account_status',
       to_jsonb(OLD.account_status::text),
       to_jsonb(NEW.account_status::text));
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger zaten 20260503164427'de CREATE edildi — bu REPLACE sadece function'ı günceller.
-- Trigger'a DOKUNULMAZ (AFTER UPDATE ON hr_profiles FOR EACH ROW — aynı kalır).

-- ═══════════════════════════════════════════════
-- 9. B1 BLOCKER FIX — hr_profiles_freeze_sensitive_fields() REPLACE
--    Codex B1: account_status trigger'ı dondurmuyor → admin direct
--    UPDATE ile hr_profiles_update_admin policy açığından geçebilir.
--
--    FIX: 5. branch eklendi — account_status sadece hr.lifecycle_rpc
--    custom config flag set edilmiş transaction içinde değişebilir.
--
--    Custom config flag güvenlik analizi:
--    - set_config('hr.lifecycle_rpc', 'true', true) → third arg true =
--      transaction-local: COMMIT veya ROLLBACK'te otomatik reset.
--    - current_setting('hr.lifecycle_rpc', true) → second arg true =
--      "missing OK" (key yoksa hata değil, '' döner → 'true' değil → bloklanır).
--    - Browser console saldırısı: PostgreSQL set_config SECURITY INVOKER,
--      PostgREST üzerinden doğrudan çağrılamaz. SAFE.
--    - User custom RPC exploit: SECURITY DEFINER tanımlamak superuser/
--      grant gerektirir, regular user tanımlayamaz. SAFE.
--
--    Branch sıralama (kritik):
--    1. service_role bypass  → en yüksek öncelik, en üstte
--    2. company_id IMMUTABLE → admin dahil herkes
--    3. account_status GUARD → admin dahil, flag olmadan blok (YENİ)
--    4. non-admin freeze     → employer_role + feature_flags
--    5. admin sabotaj guard  → admin satırı koruma
--
--    WARNING (B2 LOW — REPLACE CHAIN):
--    Bu fonksiyon 20260503120000_hr_profile_role_flags_admin_guard.sql
--    dosyasında orijinal olarak tanımlandı, bu migration CREATE OR REPLACE
--    ile güncellendi. İleride başka migration bu fonksiyonu REPLACE ederse
--    account_status branch'i (3. dal) MUTLAKA korunmalı. Audit trail için
--    kritik: bu branch olmadan admin account_status'u doğrudan değiştirebilir.
--
--    Bağımlı trigger: hr_profiles_freeze_sensitive_trg
--    (20260503120000'de CREATE edildi — bu REPLACE sadece function'ı günceller,
--    trigger tanımına DOKUNULMAZ).
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.hr_profiles_freeze_sensitive_fields()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── 1. service_role bypass ──────────────────────────────────
  -- service_role context'te auth.uid() NULL → kısıtlama yok.
  -- Iyzico, seed script, manuel rotation bu path'i kullanır.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- ── 2. company_id IMMUTABLE — admin dahil herkes için ───────
  -- Codex C1 fix: cross-company guard subquery exploit kapatıldı.
  -- Değişim gerekirse: service_role SQL Editor veya yeni migration.
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'company_id değiştirilemez (service_role veya migration gerekli)'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- ── 3. account_status GUARD — admin dahil (B1 BLOCKER FIX) ─
  -- account_status sadece SECURITY DEFINER lifecycle RPC'lerinden
  -- değiştirilebilir (hr_freeze_account, hr_request_deletion, vb.).
  -- RPC içinde: set_config('hr.lifecycle_rpc', 'true', true) → transaction-local flag.
  -- Direct UPDATE (admin dahil) bu flag olmadan bloklanır.
  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    IF current_setting('hr.lifecycle_rpc', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'account_status sadece lifecycle RPC üzerinden değiştirilebilir (hr_freeze_account, hr_request_deletion, ...)'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    -- Flag set edilmiş → lifecycle RPC context, izin ver
  END IF;

  -- ── 4. Non-admin: kendi sensitive field'larını değiştiremez ─
  IF NOT is_admin_employer() THEN
    IF NEW.employer_role IS DISTINCT FROM OLD.employer_role THEN
      RAISE EXCEPTION 'employer_role değiştirilemez (admin yetkisi gerekli)'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.feature_flags IS DISTINCT FROM OLD.feature_flags THEN
      RAISE EXCEPTION 'feature_flags değiştirilemez (admin yetkisi gerekli)'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  -- ── 5. Admin path: hedef satır admin ise → reject ───────────
  -- Hem "kendi satırım" hem "başka admin" bu branch'e girer.
  -- Kural: admin'in role/flags'ı service_role dışı değiştirilemez.
  IF OLD.employer_role = 'admin'
     AND (NEW.employer_role IS DISTINCT FROM OLD.employer_role
          OR NEW.feature_flags IS DISTINCT FROM OLD.feature_flags) THEN
    RAISE EXCEPTION 'Admin role/flags değiştirilemez (service_role rotation gerekli)'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- ── 6. Admin → non-admin hedef: izin ────────────────────────
  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════
-- ROLLBACK PLANI (gerekirse elle çalıştır)
-- ═══════════════════════════════════════════════
-- -- A1 rollback: policy'yi eski hâline döndür (sadece id check)
-- DROP POLICY IF EXISTS hr_profiles_update_own ON public.hr_profiles;
-- CREATE POLICY hr_profiles_update_own ON public.hr_profiles
--   FOR UPDATE TO authenticated
--   USING (id = auth.uid())
--   WITH CHECK (id = auth.uid());
--
-- -- A4 rollback: hr_profiles_audit_changes() account_status branch'siz eski hâl
-- --   20260503164427 dosyasındaki orijinal fonksiyon içeriğini CREATE OR REPLACE ile uygula.
-- --   (trigger'a dokunma)
--
-- -- Trigger DISABLE/ENABLE idempotent — rollback'te ayrıca ENABLE gerekmez.
-- -- (ALTER TABLE hr_profiles ENABLE TRIGGER ... çalıştırmak güvenli)
--
-- -- Lifecycle kolon rollback:
-- DROP TRIGGER IF EXISTS hr_sync_account_status ON public.hr_profiles;
-- DROP FUNCTION IF EXISTS public.sync_hr_account_status_to_active();
-- DROP INDEX IF EXISTS public.hr_pending_deletion_idx;
-- DROP INDEX IF EXISTS public.hr_soft_deleted_idx;
-- ALTER TABLE public.hr_profiles
--   DROP COLUMN IF EXISTS is_active,
--   DROP COLUMN IF EXISTS account_status,
--   DROP COLUMN IF EXISTS frozen_at,
--   DROP COLUMN IF EXISTS deletion_scheduled_at,
--   DROP COLUMN IF EXISTS last_active_at,
--   DROP COLUMN IF EXISTS soft_deleted_at,
--   DROP COLUMN IF EXISTS pii_redacted;
-- NOTE: account_status_enum DROP TYPE sadece başka tablo kullanmıyorsa
-- (candidates kullanıyor → DROP TYPE YAPMA)
--
-- -- B1 rollback: hr_profiles_freeze_sensitive_fields() account_status branch'siz
-- --   eski hâle döndür (20260503120000 orijinal içeriğini CREATE OR REPLACE ile uygula).
-- --   Orijinal fonksiyon 4 branch içerir (service_role bypass, company_id immutable,
-- --   non-admin freeze, admin sabotaj guard) — account_status branch YOK.
-- --   Trigger (hr_profiles_freeze_sensitive_trg) değişmedi → trigger'a DOKUNMA.
