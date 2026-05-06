-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  M4 — Matching Engine: profile_view_events extend (Kim Baktı)       ║
-- ║  Tarih: 2026-05-06                                                  ║
-- ║  Tier: T3 (KVKK PII flow değişiyor — auditor zorunlu)              ║
-- ║  Codex: ZORUNLU                                                      ║
-- ║                                                                      ║
-- ║  KAPSAM:                                                             ║
-- ║   1. profile_view_events.event_type — view/pipeline_added/          ║
-- ║      message_sent                                                    ║
-- ║   2. profile_view_events.event_metadata jsonb                       ║
-- ║   3. Index: idx_pve_event_type (candidate_id, event_type, viewed_at)║
-- ║   4. candidate_view_stats.total_interactions yeni kolon             ║
-- ║   5. update_candidate_view_stats trigger güncelleme                 ║
-- ║   6. Backfill: mevcut satırlar event_type='view' set                ║
-- ║   7. search_path harden                                             ║
-- ║                                                                      ║
-- ║  ADR-7: Kim Baktı entegrasyon — yeni tablo yerine mevcut tablo     ║
-- ║  extend edildi (data fragmentation önleme).                         ║
-- ║                                                                      ║
-- ║  KVKK NOTU:                                                          ║
-- ║  pipeline_added event: aday "X marka seni inceledi" bilgisini       ║
-- ║  alır. Bu md.10 uyumlu açık iletişim kapsamındadır.                 ║
-- ║  Retention: profile_view_events cron purge — U3 review gerekli.     ║
-- ║                                                                      ║
-- ║  ROLLBACK: docs/rollback/matching-engine-rollback.sql               ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- 1. profile_view_events.event_type kolonu ekle
--    DEFAULT 'view' — mevcut kayıtlar otomatik 'view' alır
--    CHECK: sadece 3 geçerli event tipi
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE profile_view_events
  ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'view'
    CHECK (event_type IN ('view', 'pipeline_added', 'message_sent'));

-- A5 audit fix: NOT NULL — KVKK audit trail bütünlük (sessiz NULL trigger no-op önlenir)
ALTER TABLE profile_view_events
  ALTER COLUMN event_type SET NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 2. profile_view_events.event_metadata jsonb
--    Pipeline event için: {"stage": "uzun_liste"}
--    Message event için: {"message_id": 123} (opsiyonel)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE profile_view_events
  ADD COLUMN IF NOT EXISTS event_metadata jsonb DEFAULT '{}'::jsonb;

-- ═══════════════════════════════════════════════════════════════
-- 3. Index — event_type bazlı sorgulama (Kim Baktı filtresi)
--    candidate_id + event_type + viewed_at DESC (en yeni önce)
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_pve_event_type
  ON profile_view_events(candidate_id, event_type, viewed_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 4. candidate_view_stats.total_interactions yeni kolon
--    pipeline_added + message_sent event'larını sayar
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE candidate_view_stats
  ADD COLUMN IF NOT EXISTS total_interactions int DEFAULT 0 NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 5. update_candidate_view_stats trigger fonksiyonu — güncelleme
--    event_type='view' → total_views'ı güncelle
--    event_type IN ('pipeline_added','message_sent') → total_interactions
--    search_path harden (A14 pattern)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_candidate_view_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO candidate_view_stats (
    candidate_id,
    total_views,
    unique_companies,
    unique_positions,
    total_interactions,
    last_viewed_at
  )
  VALUES (
    NEW.candidate_id,
    CASE WHEN NEW.event_type = 'view' THEN 1 ELSE 0 END,
    CASE WHEN NEW.company_id IS NOT NULL AND NEW.event_type = 'view' THEN 1 ELSE 0 END,
    CASE WHEN NEW.position_ad_snapshot IS NOT NULL AND NEW.event_type = 'view' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type IN ('pipeline_added', 'message_sent') THEN 1 ELSE 0 END,
    -- E2 Codex iter-3 fix: ilk INSERT path'te de last_viewed_at sadece view event'leri için set edilir.
    -- Aksi halde aday hiç view almamasına rağmen UI "Son görüntülenme" tarihi gösterir.
    CASE WHEN NEW.event_type = 'view' THEN NEW.viewed_at ELSE NULL END
  )
  ON CONFLICT (candidate_id) DO UPDATE SET
    total_views = (
      SELECT count(*) FROM profile_view_events
      WHERE candidate_id = NEW.candidate_id
        AND event_type = 'view'
    ),
    unique_companies = (
      SELECT count(DISTINCT company_id) FROM profile_view_events
      WHERE candidate_id = NEW.candidate_id
        AND company_id IS NOT NULL
        AND event_type = 'view'
    ),
    unique_positions = (
      SELECT count(DISTINCT position_ad_snapshot) FROM profile_view_events
      WHERE candidate_id = NEW.candidate_id
        AND position_ad_snapshot IS NOT NULL
        AND event_type = 'view'
    ),
    total_interactions = (
      SELECT count(*) FROM profile_view_events
      WHERE candidate_id = NEW.candidate_id
        AND event_type IN ('pipeline_added', 'message_sent')
    ),
    -- D3 Codex iter-2 fix: last_viewed_at sadece event_type='view' için güncellenir.
    -- Aday "Son görüntülenme" UI'da pipeline_added/message_sent ile yanlış advance olmasın.
    -- I1 Codex iter-7 fix: NULL-safe GREATEST. Aday önce pipeline_added alırsa
    -- candidate_view_stats.last_viewed_at = NULL kalır (E2 fix), sonra ilk view'da
    -- GREATEST'in bazı PG versiyonlarında NULL döndürme riski → COALESCE wrap defense.
    last_viewed_at = CASE
      WHEN NEW.event_type = 'view'
        THEN GREATEST(COALESCE(candidate_view_stats.last_viewed_at, NEW.viewed_at), NEW.viewed_at)
      ELSE candidate_view_stats.last_viewed_at
    END;

  RETURN NEW;
END;
$$;

-- Trigger'ı yeniden bağla (fonksiyon CREATE OR REPLACE ile güncellendi)
DROP TRIGGER IF EXISTS trg_update_view_stats ON profile_view_events;
CREATE TRIGGER trg_update_view_stats
  AFTER INSERT ON profile_view_events
  FOR EACH ROW
  EXECUTE FUNCTION update_candidate_view_stats();

-- ═══════════════════════════════════════════════════════════════
-- 6. Backfill: mevcut satırlar event_type NULL kalmasın
--    ADD COLUMN IF NOT EXISTS DEFAULT 'view' zaten default'u set eder,
--    ama NULL gelen eski satırlar için explicit UPDATE (güvenlik)
-- ═══════════════════════════════════════════════════════════════
UPDATE profile_view_events
SET event_type = 'view'
WHERE event_type IS NULL;

-- candidate_view_stats.total_interactions backfill
-- (mevcut satırlarda pipeline_added event yok, 0 doğru)
-- total_views da tekrar hesapla — event_type filter ile tutarlılık sağla
UPDATE candidate_view_stats cvs
SET
  total_views = (
    SELECT count(*) FROM profile_view_events
    WHERE candidate_id = cvs.candidate_id
      AND event_type = 'view'
  ),
  total_interactions = (
    SELECT count(*) FROM profile_view_events
    WHERE candidate_id = cvs.candidate_id
      AND event_type IN ('pipeline_added', 'message_sent')
  );

-- ═══════════════════════════════════════════════════════════════
-- 7. position_gorunum trigger güncelleme
--    Mevcut trg_increment_position_gorunum sadece event_type='view'
--    için saymalı (pipeline_added event position görüntüleme sayılmaz)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_position_gorunum_on_view()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Sadece gerçek view event'ları position sayacını artırır
  IF NEW.position_id IS NOT NULL AND NEW.event_type = 'view' THEN
    UPDATE positions
    SET gorunum = gorunum + 1
    WHERE id = NEW.position_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger zaten var (20260401000000), sadece fonksiyon güncellendi
DROP TRIGGER IF EXISTS trg_increment_position_gorunum ON profile_view_events;
CREATE TRIGGER trg_increment_position_gorunum
  AFTER INSERT ON profile_view_events
  FOR EACH ROW
  EXECUTE FUNCTION increment_position_gorunum_on_view();

-- ═══════════════════════════════════════════════════════════════
-- 8. Column comments
-- ═══════════════════════════════════════════════════════════════
COMMENT ON COLUMN profile_view_events.event_type IS
  'M4 Matching Engine: view=normal görüntüleme, pipeline_added=pipeline ekleme, message_sent=mesaj gönderimi.';
COMMENT ON COLUMN profile_view_events.event_metadata IS
  'M4 Matching Engine: pipeline_added için {"stage":"uzun_liste"}, message_sent için {"message_id":N}.';
COMMENT ON COLUMN candidate_view_stats.total_interactions IS
  'M4 Matching Engine: pipeline_added + message_sent event sayısı (view hariç).';

-- ═══════════════════════════════════════════════════════════════
-- DRY RUN VERIFY BLOCK
-- ═══════════════════════════════════════════════════════════════

-- VERIFY 1: Yeni kolonlar oluştu
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'profile_view_events'
--   AND column_name IN ('event_type', 'event_metadata');
-- Beklenen: 2 satır

-- VERIFY 2: total_interactions kolonu oluştu
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'candidate_view_stats'
--   AND column_name = 'total_interactions';
-- Beklenen: 1 satır

-- VERIFY 3: Backfill — NULL event_type kalmadı
-- SELECT count(*) FROM profile_view_events WHERE event_type IS NULL;
-- Beklenen: 0

-- VERIFY 4: pipeline_added event INSERT → total_interactions artar
-- INSERT INTO profile_view_events
--   (candidate_id, hr_profile_id, company_id, event_type, event_metadata)
--   VALUES (TEST_CAND_ID, auth.uid(), TEST_COMP_ID, 'pipeline_added', '{"stage":"uzun_liste"}');
-- SELECT total_interactions FROM candidate_view_stats WHERE candidate_id = TEST_CAND_ID;
-- Beklenen: önceki + 1

-- VERIFY 5: view event INSERT → total_views artar, total_interactions sabit
-- INSERT INTO profile_view_events
--   (candidate_id, hr_profile_id, company_id, event_type)
--   VALUES (TEST_CAND_ID, auth.uid(), TEST_COMP_ID, 'view');
-- SELECT total_views, total_interactions FROM candidate_view_stats WHERE candidate_id = TEST_CAND_ID;
-- Beklenen: total_views arttı, total_interactions sabit

-- VERIFY 6: position gorunum sadece view event'ında artar
-- (pipeline_added sonrası positions.gorunum değişmez)
