-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  ROLLBACK PLAYBOOK — Matching Engine PR-1                           ║
-- ║  Tarih: 2026-05-06                                                  ║
-- ║  UYARI: Bu dosya apply EDİLMEZ, sadece referans.                    ║
-- ║  Her adım için Tuna explicit approval ZORUNLUDUR.                   ║
-- ║  Sıra: M-RPC reverse → M4 reverse → M2 reverse → M1 reverse        ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- ROLLBACK KURAL
-- ═══════════════════════════════════════════════════════════════
-- 1. Production'da apply edilmeden önce local test zorunlu
-- 2. Her adım ayrı transaction, hata halinde durdur
-- 3. Tuna'nın her rollback adımında explicit "devam" onayı gerekir
-- 4. M3 (enum swap) bu PR'da olmadığından M3 rollback bu dosyada yok

-- ═══════════════════════════════════════════════════════════════
-- ADIM 1: RPC'leri kaldır (M-RPC-2, M-RPC-3, M-RPC-1)
-- ═══════════════════════════════════════════════════════════════

-- Yeni RPC'leri kaldır
DROP FUNCTION IF EXISTS hr_auto_match_position(bigint);
DROP FUNCTION IF EXISTS hr_refresh_position_pipeline(bigint);

-- search_employer_candidates 6-param overload'u önceki versiyona döndür
-- (20260504181037_search_rpc_w4_columns_restore.sql baz alınarak)
-- Bu büyük fonksiyon olduğu için önceki migration'ın SQL'ini
-- CREATE OR REPLACE ile yeniden uygula:
-- KAYNAK: supabase/migrations/20260504181037_search_rpc_w4_columns_restore.sql

-- Backfill ve helper fonksiyonları kaldır
DROP FUNCTION IF EXISTS _backfill_stage_to_v2(pipeline_stage);
DROP FUNCTION IF EXISTS _map_v2_to_legacy_stage(pipeline_stage_v2);

-- ═══════════════════════════════════════════════════════════════
-- ADIM 2: M4 reverse — profile_view_events extend rollback
-- ═══════════════════════════════════════════════════════════════

-- Trigger'ı eski haline döndür (event_type filter olmadan)
-- KAYNAK: docs/migrations/040_profile_view_tracking.sql (orijinal trigger)
-- A12 FIX (2026-05-06): search_path harden eklendi — A14 pattern
CREATE OR REPLACE FUNCTION update_candidate_view_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.candidate_view_stats (candidate_id, total_views, unique_companies, unique_positions, last_viewed_at)
  VALUES (NEW.candidate_id, 1,
    CASE WHEN NEW.company_id IS NOT NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.position_ad_snapshot IS NOT NULL THEN 1 ELSE 0 END,
    NEW.viewed_at)
  ON CONFLICT (candidate_id) DO UPDATE SET
    total_views = (
      SELECT count(*) FROM public.profile_view_events WHERE candidate_id = NEW.candidate_id
    ),
    unique_companies = (
      SELECT count(DISTINCT company_id) FROM public.profile_view_events WHERE candidate_id = NEW.candidate_id AND company_id IS NOT NULL
    ),
    unique_positions = (
      SELECT count(DISTINCT position_ad_snapshot) FROM public.profile_view_events WHERE candidate_id = NEW.candidate_id AND position_ad_snapshot IS NOT NULL
    ),
    last_viewed_at = GREATEST(public.candidate_view_stats.last_viewed_at, NEW.viewed_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- position_gorunum trigger'ı eski haline döndür (event_type check olmadan)
-- A12 FIX (2026-05-06): search_path harden eklendi — A14 pattern
CREATE OR REPLACE FUNCTION public.increment_position_gorunum_on_view()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.position_id IS NOT NULL THEN
    UPDATE public.positions
    SET gorunum = gorunum + 1
    WHERE id = NEW.position_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- candidate_view_stats.total_interactions kolonu kaldır
ALTER TABLE candidate_view_stats
  DROP COLUMN IF EXISTS total_interactions;

-- Index kaldır
DROP INDEX IF EXISTS idx_pve_event_type;

-- profile_view_events yeni kolonları kaldır
-- DİKKAT: event_type='pipeline_added' veya 'message_sent' olan kayıtlar silinir
-- Bu veri kaybı kabul edilebilir (PR-1 rollback = hiç üretilmemiş varsayımı)
ALTER TABLE profile_view_events
  DROP COLUMN IF EXISTS event_type;

ALTER TABLE profile_view_events
  DROP COLUMN IF EXISTS event_metadata;

-- ═══════════════════════════════════════════════════════════════
-- ADIM 3: M2 reverse — positions kriter kolonları rollback
-- ═══════════════════════════════════════════════════════════════

-- 2A CHECK constraint kaldır
ALTER TABLE positions
  DROP CONSTRAINT IF EXISTS positions_min_one_criteria;

-- musaitlik CHECK constraint kaldır
ALTER TABLE positions
  DROP CONSTRAINT IF EXISTS positions_musaitlik_pozisyon_check;

-- M2 yeni kolonları kaldır (data loss — production'a gitmemişse güvenli)
ALTER TABLE positions DROP COLUMN IF EXISTS calisma_tipi;
ALTER TABLE positions DROP COLUMN IF EXISTS musaitlik_pozisyon;
ALTER TABLE positions DROP COLUMN IF EXISTS egitim_seviye;
ALTER TABLE positions DROP COLUMN IF EXISTS diller;
ALTER TABLE positions DROP COLUMN IF EXISTS tercih_segmentler;
ALTER TABLE positions DROP COLUMN IF EXISTS metadata;

-- maas kolonunu GERİ EKLE
-- DİKKAT: DROP edildiğinde mevcut data kaybedildi (Tuna 1A onayı — data yok)
-- Sadece kolon yapısını restore et, data olmayacak
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS maas text;

-- ═══════════════════════════════════════════════════════════════
-- ADIM 4: M1 reverse — pipeline_stage_v2 rollback
-- ═══════════════════════════════════════════════════════════════

-- Trigger'ları kaldır
DROP TRIGGER IF EXISTS cps_dual_write ON candidate_pipeline_state;
DROP TRIGGER IF EXISTS cps_insert_stage_v2 ON candidate_pipeline_state;

-- Trigger fonksiyonları kaldır
DROP FUNCTION IF EXISTS trg_cps_dual_write();
DROP FUNCTION IF EXISTS trg_cps_insert_stage_v2();

-- Index kaldır
DROP INDEX IF EXISTS idx_cps_stage_v2;

-- stage_v2 kolonunu kaldır
ALTER TABLE candidate_pipeline_state
  DROP COLUMN IF EXISTS stage_v2;

-- Enum'u kaldır
DROP TYPE IF EXISTS pipeline_stage_v2;

-- ═══════════════════════════════════════════════════════════════
-- ROLLBACK VERIFY
-- ═══════════════════════════════════════════════════════════════

-- VERIFY 1: pipeline_stage_v2 enum yok
-- SELECT count(*) FROM pg_type WHERE typname = 'pipeline_stage_v2';
-- Beklenen: 0

-- VERIFY 2: candidate_pipeline_state.stage_v2 yok
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'candidate_pipeline_state' AND column_name = 'stage_v2';
-- Beklenen: 0 satır

-- VERIFY 3: positions.maas var
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'positions' AND column_name = 'maas';
-- Beklenen: 1 satır

-- VERIFY 4: RPC'ler yok
-- SELECT proname FROM pg_proc WHERE proname IN ('hr_auto_match_position', 'hr_refresh_position_pipeline');
-- Beklenen: 0 satır

-- VERIFY 5: profile_view_events.event_type yok
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'profile_view_events' AND column_name = 'event_type';
-- Beklenen: 0 satır
