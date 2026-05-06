-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  M1 — Matching Engine: pipeline_stage_v2 enum + dual-write trigger  ║
-- ║  Tarih: 2026-05-06                                                  ║
-- ║  Tier: T4 (architecture decision + enum migration)                  ║
-- ║  Codex: ZORUNLU (T4 auto-trigger)                                   ║
-- ║                                                                      ║
-- ║  KAPSAM:                                                             ║
-- ║   1. pipeline_stage_v2 enum: uzun_liste/kisa_liste/                 ║
-- ║      iletisime_gecildi/archive                                       ║
-- ║   2. candidate_pipeline_state.stage_v2 kolonu (nullable)            ║
-- ║   3. Backfill: mevcut 6-stage → 3-stage map                         ║
-- ║   4. Dual-write trigger (recursion guard ile)                        ║
-- ║   5. search_path harden (A14 pattern, SECURITY DEFINER)             ║
-- ║                                                                      ║
-- ║  ADR-1: 5→3 stage mapping lossless (backward compat)               ║
-- ║  M3 (enum swap) BU PR'da YOK — PR-3'e ait (1 hafta gözlem sonrası) ║
-- ║                                                                      ║
-- ║  BACKFILL MAP:                                                       ║
-- ║   yeni            → uzun_liste                                       ║
-- ║   gorustum        → kisa_liste                                       ║
-- ║   mulakat         → kisa_liste                                       ║
-- ║   teklif          → iletisime_gecildi                                ║
-- ║   kapandi_win     → archive                                          ║
-- ║   kapandi_loss    → archive                                          ║
-- ║                                                                      ║
-- ║  ROLLBACK: docs/rollback/matching-engine-rollback.sql               ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- 1. pipeline_stage_v2 ENUM (idempotent DO block guard)
--    Postgres CREATE TYPE IF NOT EXISTS yok → DO block ile guard
-- ═══════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'pipeline_stage_v2'
  ) THEN
    CREATE TYPE pipeline_stage_v2 AS ENUM (
      'uzun_liste',
      'kisa_liste',
      'iletisime_gecildi',
      'archive'
    );
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════
-- 2. candidate_pipeline_state.stage_v2 kolonu ekle
--    Nullable: backfill tamamlanana kadar NULL mevcut satırlarda
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE candidate_pipeline_state
  ADD COLUMN IF NOT EXISTS stage_v2 pipeline_stage_v2;

-- ═══════════════════════════════════════════════════════════════
-- 3. Backfill fonksiyonu — 6-stage → 3-stage lossless map
--    SECURITY DEFINER + search_path harden (A14 pattern)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION _backfill_stage_to_v2(p_stage pipeline_stage)
RETURNS pipeline_stage_v2
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN CASE p_stage
    WHEN 'yeni'          THEN 'uzun_liste'::pipeline_stage_v2
    WHEN 'gorustum'      THEN 'kisa_liste'::pipeline_stage_v2
    WHEN 'mulakat'       THEN 'kisa_liste'::pipeline_stage_v2
    WHEN 'teklif'        THEN 'iletisime_gecildi'::pipeline_stage_v2
    WHEN 'kapandi_win'   THEN 'archive'::pipeline_stage_v2
    WHEN 'kapandi_loss'  THEN 'archive'::pipeline_stage_v2
    ELSE 'uzun_liste'::pipeline_stage_v2  -- safe fallback
  END;
END;
$$;

REVOKE ALL ON FUNCTION _backfill_stage_to_v2(pipeline_stage) FROM PUBLIC;
-- Sadece service_role (migration context) kullanır, authenticated'a grant yok

-- ═══════════════════════════════════════════════════════════════
-- 4. Backfill: mevcut satırlara stage_v2 yaz
--    stage_v2 IS NULL olan satırları güncelle (idempotent)
-- ═══════════════════════════════════════════════════════════════
UPDATE candidate_pipeline_state
SET    stage_v2 = _backfill_stage_to_v2(stage)
WHERE  stage_v2 IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- 5. Reverse map fonksiyonu — stage_v2 → en yakın stage (legacy)
--    Dual-write trigger için: stage_v2 yazılınca stage sync eder
--    stage_legacy geri-uyum için en makul değere map edilir:
--     uzun_liste       → yeni
--     kisa_liste       → gorustum
--     iletisime_gecildi → teklif
--     archive          → kapandi_win
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION _map_v2_to_legacy_stage(p_stage_v2 pipeline_stage_v2)
RETURNS pipeline_stage
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN CASE p_stage_v2
    WHEN 'uzun_liste'        THEN 'yeni'::pipeline_stage
    WHEN 'kisa_liste'        THEN 'gorustum'::pipeline_stage
    WHEN 'iletisime_gecildi' THEN 'teklif'::pipeline_stage
    WHEN 'archive'           THEN 'kapandi_win'::pipeline_stage
    ELSE 'yeni'::pipeline_stage  -- safe fallback
  END;
END;
$$;

REVOKE ALL ON FUNCTION _map_v2_to_legacy_stage(pipeline_stage_v2) FROM PUBLIC;

-- ═══════════════════════════════════════════════════════════════
-- 6. Dual-write trigger fonksiyonu
--    Recursion guard: session variable app.cps_syncing kullanılır.
--    stage değişirse → stage_v2 güncelle
--    stage_v2 değişirse → stage güncelle (legacy compat)
--    İKİSİ AYNI ANDA değişirse → stage_v2 wins (M3 geçiş hazırlığı)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_cps_dual_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_syncing boolean;
BEGIN
  -- Recursion guard: trigger zaten sync içindeyse çık
  BEGIN
    v_syncing := current_setting('app.cps_syncing', true)::boolean;
  EXCEPTION WHEN OTHERS THEN
    v_syncing := false;
  END;

  IF COALESCE(v_syncing, false) THEN
    RETURN NEW;
  END IF;

  -- Guard'ı aç
  PERFORM set_config('app.cps_syncing', 'true', true);  -- true = transaction-local

  -- stage_v2 değişmişse → stage'i sync et (v2 wins)
  IF NEW.stage_v2 IS DISTINCT FROM OLD.stage_v2
     AND NEW.stage_v2 IS NOT NULL THEN
    NEW.stage := _map_v2_to_legacy_stage(NEW.stage_v2);

  -- stage değişmişse ve stage_v2 hâlâ NULL/değişmemişse → stage_v2'yi sync et
  ELSIF NEW.stage IS DISTINCT FROM OLD.stage
        AND (NEW.stage_v2 IS NULL OR NEW.stage_v2 IS NOT DISTINCT FROM OLD.stage_v2) THEN
    NEW.stage_v2 := _backfill_stage_to_v2(NEW.stage);

  END IF;

  -- I2 Codex iter-7 fix: guard'ı RESET — multi-row UPDATE'te sonraki satır temiz state alsın.
  -- Aksi halde transaction-local 'true' ilk row sonrası kalır, sonraki tüm row'lar sync skip eder
  -- ve stage/stage_v2 desync olur (sessiz veri tutarsızlığı).
  PERFORM set_config('app.cps_syncing', 'false', true);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION trg_cps_dual_write() FROM PUBLIC;

-- Dual-write trigger — BEFORE UPDATE (değerleri commit öncesi düzelt)
DROP TRIGGER IF EXISTS cps_dual_write ON candidate_pipeline_state;
CREATE TRIGGER cps_dual_write
  BEFORE UPDATE ON candidate_pipeline_state
  FOR EACH ROW
  EXECUTE FUNCTION trg_cps_dual_write();

-- INSERT için de stage_v2 dolduran trigger (yeni satırlar NULL geçerse)
CREATE OR REPLACE FUNCTION trg_cps_insert_stage_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- F4 Codex iter-4 fix: candidate_pipeline_state.stage NOT NULL DEFAULT 'yeni' nedeniyle
  -- BEFORE INSERT'te NEW.stage hep 'yeni' gelir (NULL gelmez). Eski "NEW.stage IS NULL"
  -- branch'i dead idi — caller stage_v2='kisa_liste' verirse stage='yeni' kalıyor, legacy
  -- okuyucular yanlış state görüyordu (örn hr_get_pipeline).
  -- Fix: stage_v2 explicit set edildiyse stage'i ondan üret (M3 prensibi: v2 wins).

  -- stage_v2 verilmişse → stage onu yansıtsın (v2 wins, default 'yeni' override edilir)
  IF NEW.stage_v2 IS NOT NULL THEN
    NEW.stage := _map_v2_to_legacy_stage(NEW.stage_v2);
  -- stage_v2 NULL + stage var → stage_v2'yi stage'den üret (legacy compat)
  ELSIF NEW.stage IS NOT NULL THEN
    NEW.stage_v2 := _backfill_stage_to_v2(NEW.stage);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION trg_cps_insert_stage_v2() FROM PUBLIC;

DROP TRIGGER IF EXISTS cps_insert_stage_v2 ON candidate_pipeline_state;
CREATE TRIGGER cps_insert_stage_v2
  BEFORE INSERT ON candidate_pipeline_state
  FOR EACH ROW
  EXECUTE FUNCTION trg_cps_insert_stage_v2();

-- ═══════════════════════════════════════════════════════════════
-- 7. Index: stage_v2 sorgulama için (pipeline query perf)
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_cps_stage_v2
  ON candidate_pipeline_state(position_id, stage_v2);

-- ═══════════════════════════════════════════════════════════════
-- DRY RUN VERIFY BLOCK
-- Bu sorgular lokal apply sonrası manuel çalıştırılır.
-- Production push öncesi her birinin beklenen sonucu vermesi gerekir.
-- ═══════════════════════════════════════════════════════════════

-- VERIFY 1: Enum tipi oluştu
-- SELECT pg_typeof('uzun_liste'::pipeline_stage_v2);
-- Beklenen: pipeline_stage_v2

-- VERIFY 2: Backfill tamamlandı (stage_v2 IS NULL kalmadı)
-- SELECT count(*) FROM candidate_pipeline_state WHERE stage_v2 IS NULL;
-- Beklenen: 0

-- VERIFY 3: Toplam satır count eşleşmesi
-- SELECT count(*) total, count(stage_v2) with_v2 FROM candidate_pipeline_state;
-- Beklenen: total = with_v2

-- VERIFY 4: Dual-write — stage güncelle, stage_v2 sync bak
-- UPDATE candidate_pipeline_state SET stage = 'gorustum' WHERE id = (SELECT id FROM candidate_pipeline_state LIMIT 1);
-- SELECT stage, stage_v2 FROM candidate_pipeline_state LIMIT 1;
-- Beklenen: stage=gorustum, stage_v2=kisa_liste

-- VERIFY 5: Dual-write reverse — stage_v2 güncelle, stage sync bak
-- UPDATE candidate_pipeline_state SET stage_v2 = 'iletisime_gecildi' WHERE id = (SELECT id FROM candidate_pipeline_state LIMIT 1);
-- SELECT stage, stage_v2 FROM candidate_pipeline_state LIMIT 1;
-- Beklenen: stage=teklif, stage_v2=iletisime_gecildi

-- VERIFY 6: INSERT yeni satır — stage_v2 otomatik doldurulur
-- INSERT INTO candidate_pipeline_state (position_id, candidate_id, stage, added_by) VALUES (TEST_POS_ID, TEST_CAND_ID, 'yeni', auth.uid()) ON CONFLICT DO NOTHING;
-- SELECT stage_v2 FROM candidate_pipeline_state WHERE position_id = TEST_POS_ID AND candidate_id = TEST_CAND_ID;
-- Beklenen: uzun_liste
