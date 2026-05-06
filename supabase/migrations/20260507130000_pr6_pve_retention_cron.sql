-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PR-6 M1 — profile_view_events retention cron                      ║
-- ║  Tarih: 2026-05-07                                                  ║
-- ║  Tier: T3 (KVKK md.7/3 ölçülülük + ISO27001 A.8.3)                ║
-- ║                                                                      ║
-- ║  SORUN:                                                              ║
-- ║  PR-5 auto-match her pozisyon için N×aday pipeline_added event      ║
-- ║  yazıyor. Retention politikası tanımsız → KVKK md.7/3 ölçülülük    ║
-- ║  ihlali, ISO27001 A.8.3 (bilgi imha politikası) uyumsuzluğu,       ║
-- ║  tablo hacim artışı. PR-1 A7 carry-over + auditor/legal-reviewer.   ║
-- ║                                                                      ║
-- ║  ÇÖZÜM:                                                             ║
-- ║  Event-type bazlı farklı retention:                                 ║
-- ║    view            → 90 gün  (KVKK md.7/3: görüntüleme geçici)     ║
-- ║    pipeline_added  → 180 gün (6 ay: işe alım süreci yeterli)       ║
-- ║    message_sent    → 365 gün (1 yıl: iletişim trail audit)         ║
-- ║                                                                      ║
-- ║  AVUKAT ONAYI BEKLENİYOR: Bu süreler legal-reviewer 5. sorusu.     ║
-- ║  Süreler revize edilebilir — sadece cleanup_profile_view_events_    ║
-- ║  retention() fonksiyonu güncellenir (cron schedule değişmez).       ║
-- ║                                                                      ║
-- ║  EMSAL: 20260505125000_a8_notes_retention_purge.sql                 ║
-- ║  Farklar: 3 event_type → farklı süre; retention_until kolonu yok   ║
-- ║  (event_type + viewed_at'den hesaplıyor — schema değişikliği gerekmez)║
-- ║                                                                      ║
-- ║  CRON: 03:45 UTC — boş slot (mevcut cron'lar: 00:00, 01:15, 02:00,  ║
-- ║         03:00, 03:30, 04:00-Pazar). Çakışma yok.                   ║
-- ║                                                                      ║
-- ║  ROLLBACK:                                                           ║
-- ║  DO $$ BEGIN PERFORM cron.unschedule('purge-pve-retention');        ║
-- ║  EXCEPTION WHEN OTHERS THEN NULL; END $$;                           ║
-- ║  DROP FUNCTION IF EXISTS public.cleanup_profile_view_events_retention();║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════════
-- 1. cleanup_profile_view_events_retention()
--    Event-type bazlı retention:
--      view            → 90  gün  [AVUKAT ONAYINDAN ÖNCE DRAFT]
--      pipeline_added  → 180 gün  [AVUKAT ONAYINDAN ÖNCE DRAFT]
--      message_sent    → 365 gün  [AVUKAT ONAYINDAN ÖNCE DRAFT]
--    SECURITY DEFINER + search_path harden (A14 pattern).
--    Sadece service_role + cron tetikler (REVOKE PUBLIC + authenticated).
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cleanup_profile_view_events_retention()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_deleted_view            int := 0;
  v_deleted_pipeline_added  int := 0;
  v_deleted_message_sent    int := 0;
  v_total                   int := 0;
BEGIN
  -- ── view: 90 gün ──────────────────────────────────────────────────
  -- KVKK md.7/3: görüntüleme verisi kısa süreli, amaca uygun.
  -- [AVUKAT ONAYI BEKLENİYOR — süre revize edilebilir]
  DELETE FROM public.profile_view_events
  WHERE event_type = 'view'
    AND viewed_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted_view = ROW_COUNT;

  -- ── pipeline_added: 180 gün ───────────────────────────────────────
  -- KVKK md.7/3: işe alım süreci boyunca yeterli (standart 6 ay).
  -- [AVUKAT ONAYI BEKLENİYOR — süre revize edilebilir]
  DELETE FROM public.profile_view_events
  WHERE event_type = 'pipeline_added'
    AND viewed_at < now() - interval '180 days';
  GET DIAGNOSTICS v_deleted_pipeline_added = ROW_COUNT;

  -- ── message_sent: 365 gün ─────────────────────────────────────────
  -- KVKK md.7/3: iletişim trail, 1 yıl audit yeterli.
  -- [AVUKAT ONAYI BEKLENİYOR — süre revize edilebilir]
  DELETE FROM public.profile_view_events
  WHERE event_type = 'message_sent'
    AND viewed_at < now() - interval '365 days';
  GET DIAGNOSTICS v_deleted_message_sent = ROW_COUNT;

  v_total := v_deleted_view + v_deleted_pipeline_added + v_deleted_message_sent;

  RAISE NOTICE 'cleanup_profile_view_events_retention: view=%, pipeline_added=%, message_sent=%, total=%',
    v_deleted_view, v_deleted_pipeline_added, v_deleted_message_sent, v_total;

  RETURN jsonb_build_object(
    'ok',                    true,
    'deleted_view',          v_deleted_view,
    'deleted_pipeline_added', v_deleted_pipeline_added,
    'deleted_message_sent',  v_deleted_message_sent,
    'total_deleted',         v_total,
    'purged_at',             now(),
    'retention_note',        'view=90d, pipeline_added=180d, message_sent=365d — PENDING_LEGAL_REVIEW'
  );
END;
$$;

-- Sadece service_role + cron tetikler.
REVOKE EXECUTE ON FUNCTION public.cleanup_profile_view_events_retention() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_profile_view_events_retention() FROM authenticated;

COMMENT ON FUNCTION public.cleanup_profile_view_events_retention() IS
  'PR-6 M1 (7 May 2026): KVKK md.7/3 retention purge — profile_view_events. '
  'view=90d, pipeline_added=180d, message_sent=365d. '
  'AVUKAT ONAYI BEKLENİYOR — süreler revize edilebilir. '
  'Günlük 03:45 UTC cron. SECURITY DEFINER + service_role only. '
  'ISO27001 A.8.3 bilgi imha politikası uyumu.';

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Index — purge sorgusunu hızlandır (viewed_at + event_type composite)
--    idx_pve_event_type zaten var (20260506130000 — candidate_id, event_type, viewed_at DESC)
--    Purge için event_type + viewed_at yeterli (candidate_id gerekmez).
--    Mevcut index purge DELETE sorgusunu kapsıyor — yeni index GEREKMEZ.
--    Referans: idx_pve_event_type (candidate_id, event_type, viewed_at DESC)
--    Postgres partial index scan ile event_type + viewed_at < threshold çalışır.
-- ═══════════════════════════════════════════════════════════════════════
-- NOT: idx_pve_event_type var mı kontrol (20260506130000 apply olduysa evet).
-- Yoksa (lokal fresh state):
CREATE INDEX IF NOT EXISTS idx_pve_viewed_at_event_type
  ON public.profile_view_events (event_type, viewed_at);
-- Bu index purge DELETE'i doğrudan destekler (event_type = X AND viewed_at < Y).
-- idx_pve_event_type ile overlap olsa da purge-specific query path için daha verimli.

-- ═══════════════════════════════════════════════════════════════════════
-- 3. cron.schedule — günlük 03:45 UTC (06:45 TRT)
--    Unschedule-first pattern (a8_notes_retention_purge emsal).
--    03:45 UTC: boş slot — mevcut cron saat haritası:
--      00:00 UTC — hr-purge-lifecycle
--      01:15 UTC — ht_ann_auto_archive
--      02:00 UTC — purge-employer-notes
--      03:00 UTC — support-queue (activate/end campaigns her saat * için ayrı)
--      03:30 UTC — purge_employer_pool_log_90d
--      04:00 UTC (Pazar) — security-monitoring-weekly
--    → 03:45 UTC seçildi, çakışma yok.
-- ═══════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  PERFORM cron.unschedule('purge-pve-retention');
EXCEPTION WHEN OTHERS THEN
  NULL;
END
$$;

SELECT cron.schedule(
  'purge-pve-retention',
  '45 3 * * *',
  $$SELECT public.cleanup_profile_view_events_retention();$$
);

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFY BLOCK (manuel — apply sonrası lokal kontrol veya production)
-- ═══════════════════════════════════════════════════════════════════════

-- VERIFY 1: Fonksiyon oluştu
-- SELECT proname, prosecdef, proconfig
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND p.proname = 'cleanup_profile_view_events_retention';
-- Beklenen: prosecdef=true, proconfig içinde 'search_path=pg_catalog,public,pg_temp'

-- VERIFY 2: Cron schedule oluştu
-- SELECT jobname, schedule, command
--   FROM cron.job
--   WHERE jobname = 'purge-pve-retention';
-- Beklenen: 1 satır, schedule='45 3 * * *'

-- VERIFY 3: Manuel test — 95 gün önce view event INSERT et, cleanup çalıştır
-- -- Service_role context:
-- INSERT INTO public.profile_view_events
--   (candidate_id, hr_profile_id, event_type, viewed_at)
--   VALUES (TEST_CAND_ID, TEST_HR_UUID, 'view', now() - interval '95 days');
-- SELECT count(*) FROM public.profile_view_events
--   WHERE event_type = 'view' AND viewed_at < now() - interval '90 days';
-- -- Beklenen: 1+ satır
-- SELECT public.cleanup_profile_view_events_retention();
-- -- Return: {"ok":true, "deleted_view":1, "deleted_pipeline_added":0, ...}
-- SELECT count(*) FROM public.profile_view_events
--   WHERE event_type = 'view' AND viewed_at < now() - interval '90 days';
-- -- Beklenen: 0

-- VERIFY 4: 85 gün önce view event silinmemeli (henüz retention değil)
-- INSERT INTO public.profile_view_events
--   (candidate_id, hr_profile_id, event_type, viewed_at)
--   VALUES (TEST_CAND_ID, TEST_HR_UUID, 'view', now() - interval '85 days');
-- SELECT public.cleanup_profile_view_events_retention();
-- SELECT count(*) FROM public.profile_view_events
--   WHERE event_type = 'view' AND viewed_at > now() - interval '90 days';
-- -- Beklenen: bu satır hala var

-- VERIFY 5: Index oluştu
-- SELECT indexname FROM pg_indexes
--   WHERE tablename = 'profile_view_events'
--     AND indexname IN ('idx_pve_viewed_at_event_type', 'idx_pve_event_type');
-- Beklenen: 1-2 satır (biri veya ikisi)
