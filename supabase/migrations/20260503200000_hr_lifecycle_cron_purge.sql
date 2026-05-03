-- ╔══════════════════════════════════════════════════════════════╗
-- ║  A8-B Task 4 — HR Lifecycle Cron Purge                     ║
-- ║  Migration: 20260503200000_hr_lifecycle_cron_purge.sql     ║
-- ║  Tier: T3 — auditor + code-reviewer + Codex zorunlu        ║
-- ║  Bağımlı: 20260503180000_hr_profiles_lifecycle.sql         ║
-- ║            20260503190000_hr_lifecycle_rpcs.sql             ║
-- ║                                                             ║
-- ║  Kapsam:                                                    ║
-- ║    1. pg_cron extension guard (zaten aktif — idempotent)   ║
-- ║    2. public.hr_purge_lifecycle() SECURITY DEFINER          ║
-- ║       - Step 1: pending_deletion → soft_deleted (30g grace) ║
-- ║       - Step 2: soft_deleted + 60g → PII redact            ║
-- ║    3. cron.schedule: günlük 00:00 UTC (03:00 TRT)          ║
-- ║                                                             ║
-- ║  Güvenlik:                                                  ║
-- ║    - SECURITY DEFINER + SET search_path = public           ║
-- ║    - set_config('hr.lifecycle_rpc','true',true) flag        ║
-- ║      → hr_profiles_freeze_sensitive_fields() trigger bypass ║
-- ║    - auth.uid() burada NULL (service_role context) → OK    ║
-- ║    - Idempotent: aynı gün 2 kez çalışırsa 0 satır etkiler  ║
-- ║                                                             ║
-- ║  RLS İstisnası:                                             ║
-- ║    - Yeni tablo YOK → ALTER/POLICY/GRANT gerekmez          ║
-- ║    - Fonksiyon service_role context ile çalışır (cron)     ║
-- ║                                                             ║
-- ║  KVKK md.7 retention: 30g grace + 60g PII grace = 90g top  ║
-- ║                                                             ║
-- ║  DRY-RUN — APPLY YAPMA                                      ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════
-- 1. pg_cron extension guard
--    Supabase Pro tier'da varsayılan aktif.
--    CREATE EXTENSION IF NOT EXISTS idempotent — aktifse sessiz geçer.
--    Free tier'da yoksa migration bu adımda hata verir → pro'ya geç.
-- ═══════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ═══════════════════════════════════════════════
-- 2. hr_purge_lifecycle() — ana cron fonksiyonu
--
--    Tasarım kararları:
--
--    A. account_status güncelleme (Step 1):
--       pending_deletion → account_status değişmez.
--       Bunun yerine: soft_deleted_at = now(), is_active = false,
--       deletion_scheduled_at = NULL set edilir.
--       "soft_deleted" state enum'da yok (architect kararı).
--       Efektif state = soft_deleted_at IS NOT NULL + is_active = false.
--       account_status 'pending_deletion' kalır — sorgularda
--       "account_status = 'pending_deletion' AND soft_deleted_at IS NOT NULL"
--       → KVKK audit trail için account_status geçmişi korunur.
--
--       NOT: Eğer account_status 'pending_deletion'dan başka bir değere
--       çekilmek istenirse ayrı T4 migration gerekir (enum + freeze trigger
--       uyumluluğu kapsamlı revize ister). Şu an scope dışı.
--
--    B. set_config flag zorunluluğu:
--       hr_profiles_freeze_sensitive_fields() trigger account_status
--       değişikliklerini hr.lifecycle_rpc flag olmadan blokar.
--       Step 1'de account_status'a DOKUNMUYORUZ → flag teknik olarak
--       gerekmez. Ama frozen_at SET edilebilir → NULL'a çekme işlemi
--       trigger scope'unda değil (sadece account_status guard var).
--       Defensive: flag her iki step'te de set edilir — ilerideki
--       trigger genişlemelerine karşı güvenli.
--
--    C. PII redact scope (Step 2):
--       Silinen: serbest metin + iletişim alanları
--       Korunan: id, user_id (auth.users FK), company_id, email
--         → audit + cross-ref + hukuki muhatap tespiti için
--       ad/soyad → 'Eski'/'İK Üyesi' (Task 1 spec ile aynı)
--       pii_redacted = true → irreversible flag (Task 2 RPC'leri
--         bu flag true iken reactivation blokar)
--
--    D. employer_candidate_notes DOKUNULMAZ:
--       Tuna direktifi: notlar İK'nın değerli iş varlığı.
--       hr_profile soft_delete + PII redact → notlar kalır.
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.hr_purge_lifecycle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_soft_count   int := 0;
  v_redact_count int := 0;
BEGIN
  -- Trigger bypass flag: transaction-local, COMMIT/ROLLBACK'te sıfırlanır.
  -- hr_profiles_freeze_sensitive_fields() bu flag olmadan account_status
  -- değişikliğini reddeder. Cron service_role context'te çalışır ama
  -- trigger auth.uid() NULL → zaten bypass ederdi; flag defensive katman.
  PERFORM set_config('hr.lifecycle_rpc', 'true', true);

  -- ───────────────────────────────────────────────
  -- Step 1: pending_deletion + deletion_scheduled_at <= now() → soft_deleted
  --   deletion_scheduled_at = now() + 30g olarak Task 1 trigger SET etti.
  --   Burada: o süre dolmuş → is_active = false, soft_deleted_at = now().
  --   account_status 'pending_deletion' kalır (bkz. tasarım kararı A).
  --   frozen_at NULL'a çekiliyor: soft_deleted aşamasında freeze bilgisi
  --   artık anlamsız; audit_log'da kalıyor.
  -- ───────────────────────────────────────────────
  WITH soft AS (
    UPDATE public.hr_profiles
    SET
      soft_deleted_at      = now(),
      is_active            = false,
      deletion_scheduled_at = NULL,
      frozen_at            = NULL
    WHERE account_status = 'pending_deletion'
      AND deletion_scheduled_at IS NOT NULL
      AND deletion_scheduled_at <= now()
      AND soft_deleted_at IS NULL    -- idempotency: zaten soft_deleted ise dokunma
    RETURNING id
  )
  SELECT count(*) INTO v_soft_count FROM soft;

  -- ───────────────────────────────────────────────
  -- Step 2: soft_deleted + 60g grace doldu → PII redact
  --   Koşul: soft_deleted_at IS NOT NULL (soft_deleted state)
  --          + 60 gün geçti
  --          + henüz redact edilmemiş
  -- ───────────────────────────────────────────────
  WITH redact AS (
    UPDATE public.hr_profiles
    SET
      ad               = 'Eski',
      soyad            = 'İK Üyesi',
      telefon          = NULL,
      sirket           = NULL,
      sektor           = NULL,
      web_sitesi       = NULL,
      merkez_sehir     = NULL,
      magaza_sayisi    = NULL,
      aciklama         = NULL,
      aranan_profil    = NULL,
      calisma_saatleri = NULL,
      linkedin         = NULL,
      career_page_url  = NULL,
      pii_redacted     = true
    WHERE soft_deleted_at IS NOT NULL
      AND soft_deleted_at <= now() - INTERVAL '60 days'
      AND pii_redacted = false
    RETURNING id
  )
  SELECT count(*) INTO v_redact_count FROM redact;

  RETURN jsonb_build_object(
    'soft_deleted',  v_soft_count,
    'pii_redacted',  v_redact_count,
    'run_at',        now()
  );
END;
$$;

-- GRANT: authenticated kullanamaz (cron + admin tetikler).
-- Sadece service_role + admin RPC çağırabilir.
-- Doğrudan PostgREST çağrısı: authenticated için EXECUTE yok → safe.
REVOKE EXECUTE ON FUNCTION public.hr_purge_lifecycle() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hr_purge_lifecycle() FROM authenticated;

-- ═══════════════════════════════════════════════
-- 3. cron.schedule — günlük 00:00 UTC (03:00 TRT)
--    Unschedule-first pattern (SA4 migration'dan alınan convention):
--    cron.schedule aynı isimle çağrılırsa bazı pg_cron versiyonlarında
--    güncellenmez → önce unschedule + sonra yeniden schedule = güvenli.
--    DO bloğu: cron.job yoksa unschedule exception'ı sessiz geçer.
-- ═══════════════════════════════════════════════
DO $$
BEGIN
  PERFORM cron.unschedule('hr-purge-lifecycle');
EXCEPTION WHEN OTHERS THEN
  -- Job yoksa sessiz devam
  NULL;
END
$$;

SELECT cron.schedule(
  'hr-purge-lifecycle',
  '0 0 * * *',
  $$SELECT public.hr_purge_lifecycle();$$
);

-- ═══════════════════════════════════════════════
-- ROLLBACK PLANI (elle çalıştır — production push öncesi)
-- ═══════════════════════════════════════════════
-- DO $$ BEGIN
--   PERFORM cron.unschedule('hr-purge-lifecycle');
-- EXCEPTION WHEN OTHERS THEN NULL;
-- END $$;
--
-- DROP FUNCTION IF EXISTS public.hr_purge_lifecycle();
--
-- NOT: pg_cron extension DROP YAPMA — diğer scheduled job'ları siler
-- (activate-campaigns, end-campaigns, auto-close-resolved-tickets, vb.)
