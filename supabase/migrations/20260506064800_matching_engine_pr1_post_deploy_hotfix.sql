-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ PR-1 POST-DEPLOY HOTFIX (Codex iter-8 commit-based review)           ║
-- ║                                                                       ║
-- ║ Origin: a7fcda7 commit deploy sonrası Codex `--commit` review         ║
-- ║ Date:   2026-05-06 06:48                                              ║
-- ║                                                                       ║
-- ║ J1 (P1 BLOCKER): pve_employer_insert tighten — hr_profile_id +       ║
-- ║    position_id ownership (cross-tenant spoofing kapatma)              ║
-- ║                                                                       ║
-- ║ J2 (P2): hr_auto_match_position archive recovery (refresh ile         ║
-- ║    uyum — daha önce archive'e taşınan aday auto-match yeniden         ║
-- ║    çalışınca uzun_liste'ye geri döner)                                ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- J1: pve_employer_insert policy tighten
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS pve_employer_insert ON public.profile_view_events;

CREATE POLICY pve_employer_insert ON public.profile_view_events
  FOR INSERT TO authenticated
  WITH CHECK (
    -- J1 fix: hr_profile_id auth.uid() ile binding (teammate spoofing önle)
    hr_profile_id = auth.uid()
    AND EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid())
    -- A1 + D4 prensipleri korunur: company_id NULL sadece view event_type için
    AND (
      (company_id IS NULL AND COALESCE(event_type, 'view') = 'view')
      OR company_id = public.current_employer_company_id()
    )
    -- J1 fix: position_id ownership (cross-tenant gorunum increment + cross-position event önle)
    AND (
      position_id IS NULL
      OR position_id IN (
        SELECT id FROM public.positions
        WHERE company_id = public.current_employer_company_id()
      )
    )
  );

COMMENT ON POLICY pve_employer_insert ON public.profile_view_events IS
  'A1 + D4 + J1 (2026-05-06 hotfix): hr_profile=auth.uid() + company_id own + position_id own. Cross-tenant + teammate spoofing kapatildi.';

-- ═══════════════════════════════════════════════════════════════
-- J2: hr_auto_match_position archive recovery
-- M-RPC-2 (20260506150000_*.sql) function body'si CREATE OR REPLACE ile güncellenir.
-- Tek değişim: ON CONFLICT DO NOTHING → DO UPDATE WHERE stage_v2='archive'.
-- Refresh RPC'sinde C6+J2 ile aynı pattern, simetri korunur.
-- ═══════════════════════════════════════════════════════════════
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
        -- J2 Codex iter-8 fix: archive recovery (refresh ile uyum). Daha önce archive'e
        -- taşınan aday auto-match yeniden çalıştırıldığında uzun_liste'ye geri döner.
        -- kisa_liste/iletisime_gecildi DOKUNMAZ — WHERE clause stage_v2='archive' filter.
        ON CONFLICT (position_id, candidate_id) DO UPDATE
          SET stage_v2 = 'uzun_liste'::pipeline_stage_v2,
              stage = 'yeni'::pipeline_stage,
              updated_at = now()
          WHERE candidate_pipeline_state.stage_v2 = 'archive'::pipeline_stage_v2;

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


-- ═══════════════════════════════════════════════════════════════
-- DRY RUN VERIFY BLOCK
-- ═══════════════════════════════════════════════════════════════
-- J1 verify:
-- SELECT pg_get_expr(polwithcheck, polrelid) FROM pg_policy
--   WHERE polname = 'pve_employer_insert';
-- Beklenen: hr_profile_id = auth.uid() ifadesi içermeli
--
-- J2 verify (production fonksiyon body):
-- SELECT pg_get_functiondef('hr_auto_match_position(bigint)'::regprocedure)
--   ~ 'WHERE candidate_pipeline_state.stage_v2 = ''archive''::pipeline_stage_v2';
-- Beklenen: true
