-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  M-RPC-3 — YENİ RPC: hr_refresh_position_pipeline                  ║
-- ║  Tarih: 2026-05-06                                                  ║
-- ║  Tier: T4 (yeni RPC, SECURITY DEFINER, pipeline mutasyon)          ║
-- ║  Codex: ZORUNLU                                                      ║
-- ║                                                                      ║
-- ║  KAPSAM:                                                             ║
-- ║   Soft refresh (ADR-6): Pozisyon kriter güncellenince çalışır.     ║
-- ║   SADECE uzun_liste aşamasındaki adayları yeniden evaluate eder.   ║
-- ║   kisa_liste ve iletisime_gecildi DOKUNULMAZ.                       ║
-- ║   Kriterlere uymayan uzun_liste → archive.                          ║
-- ║   Yeni eşleşenler → uzun_liste eklenir (idempotent).               ║
-- ║                                                                      ║
-- ║  GÜVENLIK:                                                           ║
-- ║   - employer_role = admin | recruiter                               ║
-- ║   - Pozisyon caller'ın company'sine ait                             ║
-- ║   - Pozisyon durum = active | draft (closed/archived reddedilir)   ║
-- ║   - SECURITY DEFINER + search_path harden (A14 pattern)            ║
-- ║                                                                      ║
-- ║  RETURN: {added: int, removed: int, kept: int}                     ║
-- ║                                                                      ║
-- ║  ROLLBACK: docs/rollback/matching-engine-rollback.sql               ║
-- ╚══════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION hr_refresh_position_pipeline(
  p_position_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id          uuid;
  v_company_id       bigint;
  v_role             text;
  v_pos_company_id   bigint;
  v_pos_durum        text;
  v_threshold        int;

  v_search_result    jsonb;
  v_candidates       jsonb;
  v_matched_ids      bigint[];
  v_cand             jsonb;
  v_cand_id          bigint;
  v_score            int;

  v_added            int := 0;
  v_removed          int := 0;
  v_kept             int := 0;
  v_inserted         int;
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

  -- A3 audit fix: viewer role'ü için spesifik mesaj (UX + audit log clarity)
  IF v_role = 'viewer' THEN
    RAISE EXCEPTION 'forbidden: viewer role cannot trigger pipeline refresh' USING ERRCODE = 'P0001';
  ELSIF v_role NOT IN ('admin', 'recruiter') THEN
    RAISE EXCEPTION 'forbidden: insufficient role (admin or recruiter required)' USING ERRCODE = 'P0001';
  END IF;

  -- D5 Codex iter-2 fix: corporate-email + account active guard.
  -- Aksi halde search_employer_candidates empty döner → archive UPDATE tüm uzun_liste'yi siler.
  -- Defense in depth: refresh kendi authorization'ını yapar, search'in rejection path'ine bağımlı kalmaz.
  IF NOT public.is_corporate_email() THEN
    RAISE EXCEPTION 'forbidden: non-corporate email cannot trigger pipeline refresh' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM hr_profiles
    WHERE id = v_user_id AND is_active = true AND account_status = 'active'
  ) THEN
    RAISE EXCEPTION 'forbidden: inactive account cannot trigger pipeline refresh' USING ERRCODE = 'P0001';
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
    RAISE EXCEPTION 'forbidden: cannot refresh a closed or archived position' USING ERRCODE = 'P0005';
  END IF;

  -- ─── 3. Yeni eşleşme listesi hesapla ──────────────────────────────
  SELECT search_employer_candidates(
    '{}'::jsonb,
    v_company_id,
    'relevance',
    10000,  -- D6 Codex iter-2 fix: 1000 → 10000 (P3 backlog: gerçek pagination loop, current_count > 10000 → warning log)
    0,
    p_position_id
  ) INTO v_search_result;

  v_candidates := v_search_result->'candidates';
  v_matched_ids := '{}';

  IF v_candidates IS NOT NULL AND jsonb_typeof(v_candidates) = 'array' THEN
    FOR v_cand IN SELECT * FROM jsonb_array_elements(v_candidates)
    LOOP
      v_score := COALESCE((v_cand->>'match_score')::int, 0);
      IF v_score >= v_threshold THEN
        v_cand_id := (v_cand->>'id')::bigint;
        v_matched_ids := array_append(v_matched_ids, v_cand_id);
      END IF;
    END LOOP;
  END IF;

  -- ─── 4. Uzun listede olup artık eşleşmeyen adaylar → archive ──────
  --    KRITIK: sadece stage_v2 = 'uzun_liste' olanlar etkilenir
  --    kisa_liste ve iletisime_gecildi DOKUNULMAZ
  UPDATE candidate_pipeline_state
  SET
    stage_v2   = 'archive'::pipeline_stage_v2,
    stage      = 'kapandi_win'::pipeline_stage,  -- legacy sync (M3'e kadar)
    updated_at = now()
  WHERE position_id = p_position_id
    AND stage_v2 = 'uzun_liste'::pipeline_stage_v2
    AND (
      cardinality(v_matched_ids) = 0
      OR candidate_id != ALL(v_matched_ids)
    );

  GET DIAGNOSTICS v_removed = ROW_COUNT;

  -- ─── 5. Yeni eşleşenler → uzun_liste (idempotent) ──────────────────
  FOR v_cand IN SELECT * FROM jsonb_array_elements(v_candidates)
  LOOP
    v_score := COALESCE((v_cand->>'match_score')::int, 0);
    IF v_score >= v_threshold THEN
      v_cand_id := (v_cand->>'id')::bigint;

      INSERT INTO candidate_pipeline_state (
        position_id,
        candidate_id,
        stage,
        stage_v2,
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
      -- C6 Codex fix: archived row'u uzun_liste'ye geri al (kriter değişimi sonrası eşleşen aday yeniden gelir).
      -- kisa_liste/iletisime_gecildi DOKUNMA — WHERE clause stage_v2='archive' filter ile koruma.
      ON CONFLICT (position_id, candidate_id) DO UPDATE
        SET stage_v2 = 'uzun_liste'::pipeline_stage_v2,
            stage = 'yeni'::pipeline_stage,
            updated_at = now()
        WHERE candidate_pipeline_state.stage_v2 = 'archive'::pipeline_stage_v2;

      GET DIAGNOSTICS v_inserted = ROW_COUNT;

      IF v_inserted = 1 THEN
        v_added := v_added + 1;

        -- Kim Baktı event — refresh ile eklenen
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
          jsonb_build_object('stage', 'uzun_liste', 'auto', true, 'source', 'refresh'),
          now()
        );
      END IF;
    END IF;
  END LOOP;

  -- ─── 6. Uzun listede kalan adaylar sayısı ─────────────────────────
  SELECT count(*) INTO v_kept
  FROM candidate_pipeline_state
  WHERE position_id = p_position_id
    AND stage_v2 = 'uzun_liste'::pipeline_stage_v2;

  RETURN jsonb_build_object(
    'added',     v_added,
    'removed',   v_removed,
    'kept',      v_kept,
    'threshold', v_threshold
  );
END;
$$;

-- REVOKE → GRANT pattern (defense in depth)
REVOKE ALL ON FUNCTION hr_refresh_position_pipeline(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hr_refresh_position_pipeline(bigint) TO authenticated;

COMMENT ON FUNCTION hr_refresh_position_pipeline(bigint) IS
  'Matching Engine M-RPC-3 (2026-05-06): Soft refresh. '
  'Sadece uzun_liste aşamasını yeniden değerlendirir. '
  'Kriterlere uymayanlar → archive. Yeni eşleşenler → uzun_liste. '
  'kisa_liste ve iletisime_gecildi DOKUNULMAZ. ADR-6 soft refresh. '
  'Return: {added, removed, kept, threshold}. SECURITY DEFINER + A14 search_path.';

-- ═══════════════════════════════════════════════════════════════
-- DRY RUN VERIFY BLOCK
-- ═══════════════════════════════════════════════════════════════

-- VERIFY 1: RPC var
-- SELECT proname FROM pg_proc WHERE proname = 'hr_refresh_position_pipeline';
-- Beklenen: 1 satır

-- VERIFY 2: Temel çağrı
-- SELECT hr_refresh_position_pipeline(VALID_POS_ID);
-- Beklenen: {"added": N, "removed": M, "kept": K, "threshold": 50}

-- VERIFY 3: kisa_liste adayları korundu
-- (Refresh öncesi kisa_liste'de 2 aday var)
-- SELECT hr_refresh_position_pipeline(VALID_POS_ID);
-- SELECT count(*) FROM candidate_pipeline_state
--   WHERE position_id = VALID_POS_ID AND stage_v2 = 'kisa_liste';
-- Beklenen: önceki sayı değişmedi

-- VERIFY 4: iletisime_gecildi adayları korundu
-- SELECT count(*) FROM candidate_pipeline_state
--   WHERE position_id = VALID_POS_ID AND stage_v2 = 'iletisime_gecildi';
-- Beklenen: önceki sayı değişmedi

-- VERIFY 5: Return shape
-- SELECT (hr_refresh_position_pipeline(VALID_POS_ID))->>'kept' IS NOT NULL;
-- Beklenen: true
