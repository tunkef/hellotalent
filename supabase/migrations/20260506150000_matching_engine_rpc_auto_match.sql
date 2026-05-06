-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  M-RPC-2 — YENİ RPC: hr_auto_match_position                        ║
-- ║  Tarih: 2026-05-06                                                  ║
-- ║  Tier: T4 (yeni RPC, SECURITY DEFINER, pipeline yazma)             ║
-- ║  Codex: ZORUNLU                                                      ║
-- ║                                                                      ║
-- ║  KAPSAM:                                                             ║
-- ║   Pozisyon kriterleri ile search_employer_candidates çağırır.       ║
-- ║   match_score >= threshold olan adayları uzun_liste'ye ekler.       ║
-- ║   Idempotent: UNIQUE(position_id, candidate_id) ON CONFLICT NOTHING ║
-- ║   Her pipeline ekleme için profile_view_events event insert eder.   ║
-- ║                                                                      ║
-- ║  GÜVENLIK:                                                           ║
-- ║   - Caller hr_profiles.employer_role = admin | recruiter zorunlu    ║
-- ║   - Pozisyon caller'ın company'sine ait olmalı                      ║
-- ║   - Pozisyon durum != closed/archived (kapalı pozisyona ekleme yok) ║
-- ║   - SECURITY DEFINER + search_path harden (A14 pattern)            ║
-- ║   - service_role scope minimum: sadece pipeline INSERT + event log  ║
-- ║                                                                      ║
-- ║  RETURN: {added: int, skipped: int, total_matched: int}             ║
-- ║                                                                      ║
-- ║  NOT: hr_add_to_pipeline mevcut signature:                         ║
-- ║   hr_add_to_pipeline(bigint, bigint, pipeline_stage)               ║
-- ║   Bu RPC stage_v2 değil stage parametresi alır.                    ║
-- ║   M1 dual-write trigger stage → stage_v2 otomatik sync eder.       ║
-- ║   Bu PR'da hr_add_to_pipeline signature DEĞİŞTİRİLMEZ (compat).   ║
-- ║                                                                      ║
-- ║  ROLLBACK: docs/rollback/matching-engine-rollback.sql               ║
-- ╚══════════════════════════════════════════════════════════════════════╝

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
  --    p_limit büyük (1000) — tüm eşleşenleri çek, pagination yok
  --    search_path: SECURITY DEFINER içindeyiz, SET'i devraldık
  SELECT search_employer_candidates(
    '{}'::jsonb,       -- p_filters: pozisyon kriterleri auto-fetch (p_position_id ile)
    v_company_id,      -- p_employer_company_id
    'relevance',       -- p_sort
    10000,             -- p_limit — D6 Codex iter-2 fix: 1000 → 10000 (P3: gerçek pagination)
    0,                 -- p_offset
    p_position_id      -- p_position_id → position-aware scoring + kriter auto-fetch
  ) INTO v_search_result;

  v_candidates    := v_search_result->'candidates';
  v_total_matched := 0;

  -- ─── 4. Threshold filtresi + pipeline INSERT ──────────────────────
  IF v_candidates IS NOT NULL AND jsonb_typeof(v_candidates) = 'array' THEN
    FOR v_cand IN SELECT * FROM jsonb_array_elements(v_candidates)
    LOOP
      v_score := COALESCE((v_cand->>'match_score')::int, 0);

      -- Threshold'u geçen adayları say
      IF v_score >= v_threshold THEN
        v_total_matched := v_total_matched + 1;
        v_cand_id := (v_cand->>'id')::bigint;

        -- Pipeline'a ekle — stage='yeni' → M1 trigger stage_v2='uzun_liste' set eder
        INSERT INTO candidate_pipeline_state (
          position_id,
          candidate_id,
          stage,
          stage_v2,    -- explicit set (trigger'ı beklemeden)
          added_by,
          added_at,
          updated_at
        ) VALUES (
          p_position_id,
          v_cand_id,
          'yeni'::pipeline_stage,
          'uzun_liste'::pipeline_stage_v2,
          v_user_id,
          now(),
          now()
        )
        ON CONFLICT (position_id, candidate_id) DO NOTHING;

        GET DIAGNOSTICS v_inserted = ROW_COUNT;

        IF v_inserted = 1 THEN
          v_added := v_added + 1;

          -- Kim Baktı event — pipeline_added (M4)
          -- ADR-7: aday pipeline'a eklenince event log
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
            -- KVKK md.10: match_score event_metadata'da TUTULMAZ — aday görür, itiraz hakkı (A2 audit fix)
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

-- REVOKE → GRANT pattern (defense in depth)
REVOKE ALL ON FUNCTION hr_auto_match_position(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hr_auto_match_position(bigint) TO authenticated;

COMMENT ON FUNCTION hr_auto_match_position(bigint) IS
  'Matching Engine M-RPC-2 (2026-05-06): Pozisyon kriterleri ile auto-match. '
  'match_score >= threshold adayları uzun_liste''ye ekler. Idempotent. '
  'Kim Baktı event log (pipeline_added). '
  'employer_role IN (admin, recruiter) zorunlu. SECURITY DEFINER + A14 search_path. '
  'Return: {added, skipped, total_matched, threshold}.';

-- ═══════════════════════════════════════════════════════════════
-- DRY RUN VERIFY BLOCK
-- ═══════════════════════════════════════════════════════════════

-- VERIFY 1: RPC var
-- SELECT proname FROM pg_proc WHERE proname = 'hr_auto_match_position';
-- Beklenen: 1 satır

-- VERIFY 2: Geçerli pozisyon ile çağrı
-- SELECT hr_auto_match_position(VALID_ACTIVE_POS_ID);
-- Beklenen: {"added": N, "skipped": M, "total_matched": T, "threshold": 50}

-- VERIFY 3: İdempotent — tekrar çağrı skipped artırır, added=0
-- SELECT hr_auto_match_position(VALID_ACTIVE_POS_ID);
-- Beklenen: {"added": 0, "skipped": M+N, "total_matched": T, "threshold": 50}

-- VERIFY 4: Kapalı pozisyon → exception
-- UPDATE positions SET durum='closed' WHERE id = VALID_ACTIVE_POS_ID;
-- SELECT hr_auto_match_position(VALID_ACTIVE_POS_ID);
-- Beklenen: EXCEPTION "position is closed or archived"

-- VERIFY 5: Return shape doğru jsonb shape
-- SELECT (hr_auto_match_position(VALID_POS_ID))->>'added' IS NOT NULL;
-- Beklenen: true

-- VERIFY 6: profile_view_events event_type='pipeline_added' insert edildi
-- SELECT count(*) FROM profile_view_events WHERE event_type='pipeline_added' AND position_id=VALID_POS_ID;
-- Beklenen: added sayısı ile eşleşmeli
