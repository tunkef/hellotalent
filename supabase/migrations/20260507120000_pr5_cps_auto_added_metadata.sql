-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PR-5 — candidate_pipeline_state.metadata + auto_added flag        ║
-- ║  Tarih: 2026-05-07                                                  ║
-- ║  Tier: T2 (kolon ekleme + RPC güncelleme, RLS değişikliği yok)     ║
-- ║                                                                      ║
-- ║  KAPSAM:                                                             ║
-- ║   1. candidate_pipeline_state.metadata jsonb kolonu ekle            ║
-- ║      (idempotent — ADD COLUMN IF NOT EXISTS)                        ║
-- ║   2. hr_auto_match_position — INSERT'e metadata = {auto_added:true} ║
-- ║      yaz (CREATE OR REPLACE — mevcut güvenlik değişmez)            ║
-- ║   3. hr_get_pipeline — RETURNS TABLE'a metadata + stage_v2 ekle    ║
-- ║      (frontend entry.metadata.auto_added badge condition'ı için)    ║
-- ║                                                                      ║
-- ║  RLS: candidate_pipeline_state mevcut RLS policy'leri korunur,     ║
-- ║  yeni kolon policy'lerden etkilenmez (jsonb — row-level guard aynı).║
-- ║                                                                      ║
-- ║  ROLLBACK:                                                           ║
-- ║   ALTER TABLE candidate_pipeline_state DROP COLUMN IF NOT EXISTS   ║
-- ║     metadata;                                                        ║
-- ║   (hr_auto_match_position ve hr_get_pipeline önceki versiyonlarını  ║
-- ║    docs/rollback/'dan CREATE OR REPLACE ile geri yükle)             ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════════
-- 1. candidate_pipeline_state.metadata kolon ekle
--    jsonb DEFAULT '{}' — mevcut satırlar boş obje, NULL değil.
--    NOT NULL constraint yok: eski INSERT'ler kırılmasın.
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE candidate_pipeline_state
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. hr_auto_match_position — INSERT'e metadata ekle
--    Sadece INSERT VALUES bloğu değişti: metadata = {auto_added: true}
--    ON CONFLICT DO UPDATE da metadata set eder (archive'den geri dönen
--    adaylar da auto_added=true olarak işaretlenir).
--    Diğer tüm güvenlik/logic satırları birebir korundu.
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION hr_auto_match_position(
  p_position_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id        uuid;
  v_company_id     bigint;
  v_role           text;
  v_pos_company_id bigint;
  v_pos_durum      text;
  v_threshold      int;

  v_search_result  jsonb;
  v_candidates     jsonb;
  v_cand           jsonb;
  v_cand_id        bigint;
  v_score          int;
  v_added          int := 0;
  v_skipped        int := 0;
  v_total_matched  int := 0;
  v_inserted       int;
BEGIN
  -- ─── 1. Auth + employer verify ────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT hp.company_id, hp.employer_role
    INTO v_company_id, v_role
  FROM hr_profiles hp
  WHERE hp.id = v_user_id;

  IF NOT FOUND OR v_company_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: employer profile not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_role NOT IN ('admin', 'recruiter') THEN
    RAISE EXCEPTION 'forbidden: insufficient role (admin or recruiter required)' USING ERRCODE = 'P0001';
  END IF;

  -- ─── 2. Pozisyon ownership + durum verify ─────────────────────────
  SELECT pos.company_id, pos.durum,
         COALESCE((pos.metadata->>'auto_match_threshold')::int, 50)
    INTO v_pos_company_id, v_pos_durum, v_threshold
  FROM positions pos
  WHERE pos.id = p_position_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: position % does not exist', p_position_id USING ERRCODE = 'P0002';
  END IF;

  IF v_pos_company_id != v_company_id THEN
    RAISE EXCEPTION 'forbidden: position does not belong to your company' USING ERRCODE = 'P0003';
  END IF;

  IF v_pos_durum IN ('closed', 'archived') THEN
    RAISE EXCEPTION 'forbidden: position is closed or archived' USING ERRCODE = 'P0005';
  END IF;

  -- ─── 3. search_employer_candidates — pozisyon kriterli arama ──────
  SELECT search_employer_candidates(
    '{}'::jsonb,
    v_company_id,
    'relevance',
    10000,
    0,
    p_position_id
  ) INTO v_search_result;

  v_candidates    := v_search_result->'candidates';
  v_total_matched := 0;

  -- ─── 4. Threshold filtresi + pipeline INSERT ──────────────────────
  IF v_candidates IS NOT NULL AND jsonb_typeof(v_candidates) = 'array' THEN
    FOR v_cand IN SELECT * FROM jsonb_array_elements(v_candidates)
    LOOP
      v_score := COALESCE((v_cand->>'match_score')::int, 0);

      IF v_score >= v_threshold THEN
        v_total_matched := v_total_matched + 1;
        v_cand_id := (v_cand->>'id')::bigint;

        -- PR-5: metadata = {auto_added: true} — frontend badge için
        INSERT INTO candidate_pipeline_state (
          position_id,
          candidate_id,
          stage,
          stage_v2,
          added_by,
          added_at,
          updated_at,
          metadata
        ) VALUES (
          p_position_id,
          v_cand_id,
          'yeni'::pipeline_stage,
          'uzun_liste'::pipeline_stage_v2,
          v_user_id,
          now(),
          now(),
          jsonb_build_object('auto_added', true)
        )
        -- J2 Codex iter-8 fix: archive recovery
        ON CONFLICT (position_id, candidate_id) DO UPDATE
          SET stage_v2  = 'uzun_liste'::pipeline_stage_v2,
              stage     = 'yeni'::pipeline_stage,
              updated_at = now(),
              metadata  = jsonb_build_object('auto_added', true)
          WHERE candidate_pipeline_state.stage_v2 = 'archive'::pipeline_stage_v2;

        GET DIAGNOSTICS v_inserted = ROW_COUNT;

        IF v_inserted = 1 THEN
          v_added := v_added + 1;

          -- Kim Baktı event — pipeline_added (M4)
          INSERT INTO profile_view_events (
            candidate_id,
            hr_profile_id,
            company_id,
            position_id,
            event_type,
            event_metadata,
            viewed_at
          ) VALUES (
            v_cand_id,
            v_user_id,
            v_company_id,
            p_position_id,
            'pipeline_added',
            -- KVKK md.10: match_score event_metadata'da TUTULMAZ
            jsonb_build_object('stage', 'uzun_liste', 'auto', true),
            now()
          );

        ELSE
          v_skipped := v_skipped + 1;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'added',         v_added,
    'skipped',       v_skipped,
    'total_matched', v_total_matched,
    'threshold',     v_threshold
  );
END;
$$;

REVOKE ALL ON FUNCTION hr_auto_match_position(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hr_auto_match_position(bigint) TO authenticated;

COMMENT ON FUNCTION hr_auto_match_position(bigint) IS
  'Matching Engine M-RPC-2 (PR-5 update 2026-05-07): metadata={auto_added:true} eklendi. '
  'Pozisyon kriterleri ile auto-match. match_score >= threshold adayları uzun_liste''ye ekler. '
  'Idempotent. Kim Baktı event log (pipeline_added). '
  'employer_role IN (admin, recruiter) zorunlu. SECURITY DEFINER + A14 search_path. '
  'Return: {added, skipped, total_matched, threshold}.';

-- ═══════════════════════════════════════════════════════════════════════
-- 3. hr_get_pipeline — RETURNS TABLE'a metadata + stage_v2 ekle
--    Frontend entry.metadata && entry.metadata.auto_added → badge render.
--    stage_v2 frontend resolveStage() için (PR-4'te zaten kullanılıyor
--    ama RPC dönmüyordu — şimdi eklendi).
--    SECURITY INVOKER (değişmedi) — RLS enforcement yeterli.
-- ═══════════════════════════════════════════════════════════════════════
-- Postgres CREATE OR REPLACE RETURNS TABLE değiştiremez — DROP+CREATE zorunlu.
DROP FUNCTION IF EXISTS hr_get_pipeline(bigint);

CREATE FUNCTION hr_get_pipeline(p_position_id bigint)
RETURNS TABLE (
  id              uuid,
  position_id     bigint,
  candidate_id    bigint,
  stage           pipeline_stage,
  stage_v2        pipeline_stage_v2,
  metadata        jsonb,
  added_at        timestamptz,
  updated_at      timestamptz,
  candidate_name  text,
  candidate_pozisyon text,
  candidate_sehir text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    cps.id,
    cps.position_id,
    cps.candidate_id,
    cps.stage,
    cps.stage_v2,
    COALESCE(cps.metadata, '{}'::jsonb) AS metadata,
    cps.added_at,
    cps.updated_at,
    c.full_name,
    c.pozisyon,
    c.sehir
  FROM candidate_pipeline_state cps
  JOIN candidates c ON c.id = cps.candidate_id
  WHERE cps.position_id = p_position_id
  ORDER BY cps.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION hr_get_pipeline(bigint) TO authenticated;

COMMENT ON FUNCTION hr_get_pipeline(bigint) IS
  'PR-5 update (2026-05-07): stage_v2 + metadata eklendi. '
  'metadata.auto_added=true → frontend badge render. '
  'Önceki imza: (id, position_id, candidate_id, stage, added_at, updated_at, name, poz, sehir). '
  'Yeni imza: stage_v2 ve metadata araya eklendi — frontend getPipeline caller uyumlu '
  '(res.data[] obje olarak gelir, field sırası önemsiz).';

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFY BLOCK
-- ═══════════════════════════════════════════════════════════════════════

-- VERIFY 1: metadata kolonu eklendi
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'candidate_pipeline_state' AND column_name = 'metadata';
-- Beklenen: 1 satır, data_type = 'jsonb'

-- VERIFY 2: hr_get_pipeline yeni imza döndürüyor
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'hr_get_pipeline';
-- (RPC için: SELECT * FROM hr_get_pipeline(VALID_POS_ID) LIMIT 1;)
-- Beklenen: stage_v2 ve metadata kolonları var

-- VERIFY 3: hr_auto_match_position metadata set ediyor
-- SELECT hr_auto_match_position(VALID_ACTIVE_POS_ID);
-- Ardından:
-- SELECT metadata FROM candidate_pipeline_state
-- WHERE position_id = VALID_ACTIVE_POS_ID
-- AND metadata->>'auto_added' = 'true'
-- LIMIT 5;
-- Beklenen: auto-match ile eklenen satırlarda metadata = {"auto_added": true}

-- VERIFY 4: Manuel eklenen satırlarda metadata boş kalır
-- SELECT metadata FROM candidate_pipeline_state
-- WHERE position_id = VALID_ACTIVE_POS_ID
-- AND (metadata IS NULL OR metadata = '{}'::jsonb)
-- LIMIT 5;
-- Beklenen: manuel eklenenler boş metadata ile gelir → frontend badge göstermez
