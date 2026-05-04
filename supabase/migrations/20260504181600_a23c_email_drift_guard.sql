-- ═══════════════════════════════════════════════════════════════════
-- Migration: a23c_email_drift_guard
-- Date: 2026-05-04
-- Ref: A23 WAVE C — Corporate Email Runtime Guard (email drift trigger)
-- Tier: T3 (auth/security)
-- Sıra: 3/3 — is_corporate_email() helper'a bağımlı (mig 1/3 önce apply edilmeli)
-- ─────────────────────────────────────────────────────────────────
-- AMAÇ:
--   Email drift saldırısı: kullanıcı corporate@sirket.com ile kayıt yapar,
--   sonra Supabase Auth üzerinden email'ini kisisel@gmail.com'a değiştirir.
--   WAVE A BEFORE INSERT trigger artık devreye girmez (yeni INSERT yok).
--   is_employer() her zaman auth.jwt()->>'email' kontrol eder — yani bir sonraki
--   RPC call'da otomatik fail-closed olur. Ama hr_profiles row'unu güncel
--   tutmak ve aynı zamanda açık bir kapıyı kapatmak için BEFORE UPDATE
--   trigger eklenir.
--
-- TASARIM KARARI:
--   hr_profiles tablosunda email kolonu YOK — JWT email değişimi doğrudan
--   hr_profiles UPDATE'ini tetiklemez. Supabase Auth email değiştiğinde
--   session JWT refresh olur; bir sonraki is_employer() / search RPC call
--   otomatik fail-closed döner (runtime guard yeterli).
--
--   Buna rağmen ek savunma katmanı olarak: hr_profiles row'u herhangi bir
--   nedenle UPDATE edildiğinde (örn. settings kaydetme, onboarding adımı),
--   auth.jwt()->>'email' o an free-domain ise UPDATE REJECT edilir.
--   Bu sayede "drift sonrası ilk profile update" anında da yakalanar.
--
--   NOT: Bu trigger lifecycle RPC'lerini (freeze/unfreeze/request_deletion)
--   ETKILEMEZ çünkü onlar SECURITY DEFINER + service_role context veya
--   auth.uid() IS NULL path kullanır. Bypass katmanı aynı şekilde çalışır.
--
-- BYPASS KATMANI (WAVE A + is_corporate_email() ile birebir uyumlu):
--   - SADECE service_role bypass (auth.uid() IS NULL → UPDATE geçer)
--   - user_metadata bypass YOK (A23 R4/M1 ile tutarlı)
--
-- TOCTOU NOTU (Codex review için):
--   BEFORE UPDATE trigger senkron çalışır — aynı transaction içinde
--   auth.jwt() okunur. Race condition yok, JWT değeri statement başında
--   sabit. Email değişimi başka bir transaction'da (Supabase Auth) olur,
--   o transaction commit olduğunda JWT session'ı invalidate eder.
--   Sonraki hr_profiles UPDATE → yeni JWT → drift yakalanır.
--
-- AUDIT QUERY (yorum olarak — production'da manuel çalıştır):
--   Mevcut hr_profiles row'larında free-domain email analizi:
--
--   SELECT
--     count(*) FILTER (WHERE
--       split_part(lower(u.email), '@', 2) = ANY(ARRAY[
--         'gmail.com','googlemail.com','hotmail.com','hotmail.co.uk',
--         'hotmail.fr','hotmail.de','outlook.com','outlook.com.tr',
--         'live.com','live.com.tr','msn.com','yahoo.com','yahoo.co.uk',
--         'yahoo.fr','yahoo.de','yahoo.com.tr','ymail.com','rocketmail.com',
--         'yandex.com','yandex.ru','yandex.com.tr','mail.ru',
--         'icloud.com','me.com','mac.com','protonmail.com','proton.me',
--         'pm.me','tutanota.com','tutanota.de','tuta.io','duck.com',
--         'hey.com','mail.com','aol.com','gmx.com','gmx.net','gmx.de',
--         'zoho.com','zohomail.com','fastmail.com','mynet.com',
--         'superonline.com','ttmail.com'
--       ])
--     ) AS personal_email_count,
--     count(*) AS total_hr_profiles
--   FROM hr_profiles hp
--   JOIN auth.users u ON u.id = hp.id;
--
--   BEKLENEN SONUÇ: personal_email_count = 0
--   Eğer > 0 → pending-approvals.md'ye düşür, etkilenen row'lar için
--   Tuna kararı bekle (whitelist veya manual cleanup).
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS hr_profiles_email_drift_guard ON public.hr_profiles;
--   DROP FUNCTION IF EXISTS public.guard_email_drift();
--
-- APPLY: npm run db:push (Tuna onayından sonra)
-- NO NEW TABLES. NO RLS POLICY CHANGES. NO GRANTS (trigger function — service_role only).
-- ═══════════════════════════════════════════════════════════════════

-- R2 fix (code-reviewer 2026-05-04): is_corporate_email() helper'ına
-- delege et. Avantajlar:
--   1. Free-list duplicate kalkar (R4 dual source of truth).
--   2. Bypass mantığı tek noktadan (helper'da service_role bypass mevcut).
--   3. ccSLD subdomain bug fix (WC-H1) helper'da yapıldı, drift trigger
--      otomatik faydalanır.
--   4. Lifecycle RPC çakışma riski (R2): helper service_role bypass
--      kapsadığı için lifecycle RPC'leri authenticated user context'te
--      bile, eğer user corporate email ise UPDATE geçer. Personal email
--      kullanıcısı zaten WAVE A trigger'ından geçemediği için bu trigger
--      no-op olur (mevcut row corporate). Worst case: free-list growth →
--      eski hesap personal-domain olur → UPDATE reject. Bu kasıtlı.
--
-- WC-M3 fix (auditor 2026-05-04): RAISE EXCEPTION mesaj/HINT generic.
-- "Email değişikliği tespit edildi" + "Kurumsal email ile giriş yap"
-- ifşaları kaldırıldı (ISO27001 A.14.2.7).
CREATE OR REPLACE FUNCTION public.guard_email_drift()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  -- is_corporate_email() helper:
  --   - service_role bypass (auth.uid() IS NULL → true)
  --   - Personal domain veya subdomain → false
  --   - Corporate domain → true
  -- Helper false dönerse UPDATE reject (drift veya invalid email).
  IF NOT public.is_corporate_email() THEN
    RAISE EXCEPTION 'Profil güncellenemedi.'
      USING ERRCODE = 'check_violation',
            HINT    = 'Hesap doğrulamasını tamamla.';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function privilege: authenticated çağıramaz (trigger iç mekanizma)
-- REVOKE ALL yeterli — trigger engine superuser context'te çağırır.
REVOKE ALL ON FUNCTION public.guard_email_drift() FROM PUBLIC;

-- ─────────────────────────────────────────────────────────────────
-- Trigger: BEFORE UPDATE ON hr_profiles
-- Devreye girme koşulu: her UPDATE (email kolonu hr_profiles'da yok,
-- bu yüzden WHEN clause yerine body içinde auth.jwt() kontrol edilir).
-- Tüm hr_profiles UPDATE'leri bu guard'dan geçer — overhead minimum
-- çünkü service_role path ilk satırda RETURN NEW ile çıkar.
-- ─────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS hr_profiles_email_drift_guard ON public.hr_profiles;

CREATE TRIGGER hr_profiles_email_drift_guard
  BEFORE UPDATE ON public.hr_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_email_drift();

-- ─────────────────────────────────────────────────────────────────
-- Comment metadata
-- ─────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.guard_email_drift() IS
  'A23 WAVE C (2026-05-04) — Email drift defense for hr_profiles UPDATE. '
  'auth.jwt()->>''->>''email'' runtime kontrol — free-domain ise UPDATE reject. '
  'Bypass: service_role (auth.uid() IS NULL) sadece. '
  'user_metadata bypass YOK (R4/M1 uyumlu). '
  'WAVE A guard_employer_personal_email() INSERT korur; bu fonksiyon UPDATE korur. '
  'Subdomain guard dahil. TOCTOU yok (senkron trigger, aynı tx).';

COMMENT ON TRIGGER hr_profiles_email_drift_guard ON public.hr_profiles IS
  'A23 WAVE C — BEFORE UPDATE email drift guard. Tier T3. '
  'Service_role bypass aktif (lifecycle RPC / cron / Edge Function uyumu).';
