-- ═══════════════════════════════════════════════════════════════
-- HELLOTALENT — Migration 045: Employer Candidate Search RPC
-- Date: 2026-03-20
-- Type: FEATURE — server-side filtering + ranking for ik.html
--
-- Purpose:
--   Replace client-side "load all → Array.filter()" pattern with
--   a single RPC that filters, ranks, and paginates on the server.
--
--   Returns JSONB with each candidate's child data (experiences,
--   education, languages, work_preferences) embedded, eliminating
--   the 4-query waterfall.
--
-- Ranking contract (deterministic, explainable):
--   match_score 0-100, composed of:
--     +20  is_actively_looking
--     +15  profile_completion_pct (scaled: pct * 0.15)
--     +20  recency (updated_at within last 30 days = 20, 90 days = 10)
--     +10  experience depth (capped at 10yr = 10pts)
--     +15  target role match (filter pozisyon ∩ candidate_target_roles)
--     +10  availability urgency ("Hemen" = 10, "2 Hafta İçinde" = 7)
--     +10  language match (filter dil ∩ candidate_languages)
--
--   match_reasons: text[] explaining active score components
--
-- Depends on: 043 (drift columns), 044 (RPC fix)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION search_employer_candidates(
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_employer_company_id bigint DEFAULT NULL,
  p_sort text DEFAULT 'relevance',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id bigint;
  v_results jsonb;

  -- Filter extraction
  f_aktif_arayanlar boolean;
  f_pozisyon text[];
  f_sehir text;
  f_exp_min int;
  f_exp_max int;
  f_segment text[];
  f_musait text[];
  f_calisma text[];
  f_egitim text[];
  f_dil text[];
BEGIN
  -- ── Auth guard: caller must be an authenticated employer ──
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Derive company_id from hr_profiles (source of truth, not caller parameter)
  -- NOT FOUND is set per-statement in PL/pgSQL; check it immediately after SELECT
  SELECT hp.company_id INTO v_company_id
  FROM hr_profiles hp
  WHERE hp.id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employer profile not found — candidates cannot call this RPC';
  END IF;
  -- v_company_id may be NULL if employer hasn't linked a company yet — that's OK,
  -- blocking/hiding simply won't apply

  -- If caller passed p_employer_company_id, verify it matches their hr_profile
  IF p_employer_company_id IS NOT NULL AND p_employer_company_id <> v_company_id THEN
    RAISE EXCEPTION 'Company ID mismatch — cannot search on behalf of another company';
  END IF;

  -- v_company_id is now the trusted, server-derived value used in all downstream queries

  -- ── Extract filters from JSONB ──
  f_aktif_arayanlar := COALESCE((p_filters->>'aktifArayanlar')::boolean, false);
  f_sehir           := NULLIF(trim(p_filters->>'sehir'), '');
  f_exp_min         := COALESCE((p_filters->>'expMin')::int, 0);
  f_exp_max         := COALESCE((p_filters->>'expMax')::int, 99);

  -- Array filters: JSONB arrays → text[]
  SELECT COALESCE(array_agg(x), '{}')
    INTO f_pozisyon
    FROM jsonb_array_elements_text(COALESCE(p_filters->'pozisyon', '[]'::jsonb)) x;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_segment
    FROM jsonb_array_elements_text(COALESCE(p_filters->'segment', '[]'::jsonb)) x;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_musait
    FROM jsonb_array_elements_text(COALESCE(p_filters->'musait', '[]'::jsonb)) x;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_calisma
    FROM jsonb_array_elements_text(COALESCE(p_filters->'calisma', '[]'::jsonb)) x;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_egitim
    FROM jsonb_array_elements_text(COALESCE(p_filters->'egitim', '[]'::jsonb)) x;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_dil
    FROM jsonb_array_elements_text(COALESCE(p_filters->'dil', '[]'::jsonb)) x;

  -- ── Main query: filter → rank → paginate → embed child data ──
  WITH
  -- Step 1: Visible candidates (base visibility rules)
  visible AS (
    SELECT c.id, c.full_name, c.adres_il, c.telefon, c.email,
           c.is_actively_looking, c.updated_at, c.son_pozisyon,
           c.son_sirket, c.son_marka, c.toplam_deneyim_ay,
           c.halen_calisiyor, c.hide_from_current_employer,
           COALESCE(c.profile_completion_pct, 0) AS profile_completion_pct
    FROM candidates c
    WHERE c.is_active = true
      AND (c.profile_completed = true OR COALESCE(c.profile_completion_pct, 0) >= 45)
      AND c.account_status = 'active'
  ),

  -- Step 2: Exclude blocked companies
  not_blocked AS (
    SELECT v.*
    FROM visible v
    WHERE NOT EXISTS (
      SELECT 1 FROM candidate_blocked_companies cbc
      WHERE cbc.candidate_id = v.id
        AND cbc.company_id = v_company_id
    )
    -- If no employer company, skip block check (vacuously true when v_company_id IS NULL)
    OR v_company_id IS NULL
  ),

  -- Step 3: Exclude hide_from_current_employer candidates
  -- Checks if candidate's current employer (devam_ediyor=true) matches the viewing employer's brands/company
  employer_names AS (
    SELECT lower(trim(b.brand_name)) AS n
    FROM brands b WHERE b.company_id = v_company_id
    UNION
    SELECT lower(trim(co.company_name))
    FROM companies co WHERE co.id = v_company_id
  ),
  not_hidden AS (
    SELECT nb.*
    FROM not_blocked nb
    WHERE nb.hide_from_current_employer IS NOT TRUE
       OR v_company_id IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM candidate_experiences ce
         WHERE ce.candidate_id = nb.id
           AND ce.devam_ediyor = true
           AND (
             lower(trim(ce.sirket)) IN (SELECT n FROM employer_names)
             OR lower(trim(ce.marka)) IN (SELECT n FROM employer_names)
           )
       )
  ),

  -- Step 4: Join child tables needed for filtering
  -- Work preferences (musaitlik, calisma_tipleri, maas_beklenti)
  with_prefs AS (
    SELECT nh.*,
           wp.musaitlik,
           wp.calisma_tipleri,
           wp.maas_beklenti
    FROM not_hidden nh
    LEFT JOIN candidate_work_preferences wp ON wp.candidate_id = nh.id
  ),

  -- First experience segment (for segment filter)
  with_segment AS (
    SELECT wp.*,
           (SELECT ce.segment
            FROM candidate_experiences ce
            WHERE ce.candidate_id = wp.id
            ORDER BY ce.devam_ediyor DESC, ce.baslangic_yil DESC NULLS LAST, COALESCE(ce.baslangic_ay, 1) DESC
            LIMIT 1
           ) AS first_exp_segment
    FROM with_prefs wp
  ),

  -- First education level (for egitim filter)
  with_edu AS (
    SELECT ws.*,
           (SELECT ed.egitim_seviye
            FROM candidate_education ed
            WHERE ed.candidate_id = ws.id
            ORDER BY ed.sira ASC
            LIMIT 1
           ) AS first_edu_level
    FROM with_segment ws
  ),

  -- Candidate languages (for dil filter)
  with_langs AS (
    SELECT we.*,
           COALESCE(
             (SELECT array_agg(cl.dil)
              FROM candidate_languages cl
              WHERE cl.candidate_id = we.id AND cl.dil IS NOT NULL),
             '{}'
           ) AS dil_array
    FROM with_edu we
  ),

  -- Step 5: Apply filters
  filtered AS (
    SELECT wl.*
    FROM with_langs wl
    WHERE
      -- aktifArayanlar
      (NOT f_aktif_arayanlar OR wl.is_actively_looking = true)
      -- pozisyon
      AND (array_length(f_pozisyon, 1) IS NULL OR wl.son_pozisyon = ANY(f_pozisyon))
      -- sehir
      AND (f_sehir IS NULL OR wl.adres_il = f_sehir)
      -- experience range (years)
      AND (COALESCE(wl.toplam_deneyim_ay, 0) / 12 >= f_exp_min)
      AND (COALESCE(wl.toplam_deneyim_ay, 0) / 12 <= f_exp_max)
      -- segment
      AND (array_length(f_segment, 1) IS NULL OR wl.first_exp_segment = ANY(f_segment))
      -- musaitlik
      AND (array_length(f_musait, 1) IS NULL OR wl.musaitlik = ANY(f_musait))
      -- calisma tipleri (overlap: any match)
      AND (array_length(f_calisma, 1) IS NULL OR wl.calisma_tipleri && f_calisma)
      -- egitim
      AND (array_length(f_egitim, 1) IS NULL OR wl.first_edu_level = ANY(f_egitim))
      -- dil (any match)
      AND (array_length(f_dil, 1) IS NULL OR wl.dil_array && f_dil)
  ),

  -- Step 6: Compute match_score + match_reasons
  scored AS (
    SELECT f.*,
      -- ── Score components ──
      (
        -- is_actively_looking: +20
        (CASE WHEN f.is_actively_looking THEN 20 ELSE 0 END)
        -- profile_completion_pct: up to +15
        + LEAST(ROUND(f.profile_completion_pct * 0.15)::int, 15)
        -- recency: +20 if updated < 30 days, +10 if < 90 days
        + (CASE
            WHEN f.updated_at >= now() - interval '30 days' THEN 20
            WHEN f.updated_at >= now() - interval '90 days' THEN 10
            ELSE 0
          END)
        -- experience depth: up to +10 (capped at 120 months / 10 years)
        + LEAST(ROUND(COALESCE(f.toplam_deneyim_ay, 0)::numeric / 12)::int, 10)
        -- target role match: +15 if filter pozisyon matches candidate target roles
        + (CASE
            WHEN array_length(f_pozisyon, 1) IS NOT NULL
                 AND EXISTS (
                   SELECT 1 FROM candidate_target_roles ctr
                   WHERE ctr.candidate_id = f.id
                     AND ctr.rol_unvani = ANY(f_pozisyon)
                 )
            THEN 15
            ELSE 0
          END)
        -- availability urgency: +10 for Hemen, +7 for 2 Hafta
        + (CASE
            WHEN f.musaitlik = 'Hemen' THEN 10
            WHEN f.musaitlik = '2 Hafta İçinde' THEN 7
            WHEN f.musaitlik = '1 Ay İçinde' THEN 3
            ELSE 0
          END)
        -- language match: +10 if filter dil overlaps
        + (CASE
            WHEN array_length(f_dil, 1) IS NOT NULL AND f.dil_array && f_dil THEN 10
            ELSE 0
          END)
      ) AS match_score,

      -- ── Reasons array ──
      ARRAY_REMOVE(ARRAY[
        CASE WHEN f.is_actively_looking THEN 'Aktif iş arıyor' END,
        CASE WHEN f.profile_completion_pct >= 80 THEN 'Detaylı profil' END,
        CASE WHEN f.updated_at >= now() - interval '30 days' THEN 'Son 30 günde güncellendi' END,
        CASE WHEN COALESCE(f.toplam_deneyim_ay, 0) >= 60 THEN '5+ yıl deneyim' END,
        CASE WHEN array_length(f_pozisyon, 1) IS NOT NULL
                  AND EXISTS (
                    SELECT 1 FROM candidate_target_roles ctr
                    WHERE ctr.candidate_id = f.id
                      AND ctr.rol_unvani = ANY(f_pozisyon)
                  )
             THEN 'Hedef rol eşleşmesi' END,
        CASE WHEN f.musaitlik IN ('Hemen', '2 Hafta İçinde') THEN 'Kısa sürede başlayabilir' END,
        CASE WHEN array_length(f_dil, 1) IS NOT NULL AND f.dil_array && f_dil THEN 'Dil eşleşmesi' END
      ], NULL) AS match_reasons

    FROM filtered f
  ),

  -- Step 7: Sort
  sorted AS (
    SELECT s.*
    FROM scored s
    ORDER BY
      CASE WHEN p_sort = 'relevance'    THEN s.match_score END DESC NULLS LAST,
      CASE WHEN p_sort = 'newest'       THEN s.updated_at END DESC NULLS LAST,
      CASE WHEN p_sort = 'exp_asc'      THEN s.toplam_deneyim_ay END ASC NULLS LAST,
      CASE WHEN p_sort = 'exp_desc'     THEN s.toplam_deneyim_ay END DESC NULLS LAST,
      -- Secondary sort: match_score DESC for non-relevance sorts
      s.match_score DESC NULLS LAST,
      s.updated_at DESC NULLS LAST
  ),

  -- Count before pagination
  total_count AS (
    SELECT count(*) AS cnt FROM scored
  ),

  -- Step 8: Paginate
  page AS (
    SELECT * FROM sorted
    LIMIT p_limit OFFSET p_offset
  ),

  -- Step 9: Embed child data as JSONB
  with_children AS (
    SELECT
      p.id,
      p.full_name,
      p.adres_il,
      p.telefon,
      p.email,
      p.is_actively_looking,
      p.updated_at,
      p.son_pozisyon,
      p.son_sirket,
      p.son_marka,
      p.toplam_deneyim_ay,
      p.halen_calisiyor,
      p.profile_completion_pct,
      p.musaitlik,
      p.calisma_tipleri,
      p.maas_beklenti,
      p.first_exp_segment,
      p.first_edu_level,
      p.dil_array,
      p.match_score,
      p.match_reasons,

      -- Experiences JSONB array
      COALESCE(
        (SELECT jsonb_agg(
           jsonb_build_object(
             'sirket', ce.sirket, 'marka', ce.marka, 'pozisyon', ce.pozisyon,
             'sektor', ce.sektor, 'segment', ce.segment, 'departman', ce.departman,
             'istihdam_tipi', ce.istihdam_tipi, 'kidem_seviyesi', ce.kidem_seviyesi,
             'baslangic_ay', ce.baslangic_ay, 'baslangic_yil', ce.baslangic_yil,
             'bitis_ay', ce.bitis_ay, 'bitis_yil', ce.bitis_yil,
             'devam_ediyor', ce.devam_ediyor, 'sehir', ce.sehir,
             'rol_ailesi', ce.rol_ailesi, 'rol_unvani', ce.rol_unvani
           ) ORDER BY ce.devam_ediyor DESC, ce.baslangic_yil DESC NULLS LAST
         )
         FROM candidate_experiences ce WHERE ce.candidate_id = p.id
        ), '[]'::jsonb
      ) AS experiences,

      -- Education JSONB array
      COALESCE(
        (SELECT jsonb_agg(
           jsonb_build_object(
             'egitim_seviye', ed.egitim_seviye, 'okul', ed.okul,
             'bolum', ed.bolum, 'mezun_yil', ed.mezun_yil
           ) ORDER BY ed.sira ASC
         )
         FROM candidate_education ed WHERE ed.candidate_id = p.id
        ), '[]'::jsonb
      ) AS education,

      -- Languages JSONB array
      COALESCE(
        (SELECT jsonb_agg(
           jsonb_build_object('dil', cl.dil, 'seviye', cl.seviye)
           ORDER BY cl.sira ASC
         )
         FROM candidate_languages cl WHERE cl.candidate_id = p.id
        ), '[]'::jsonb
      ) AS languages

    FROM page p
  )

  -- ── Build final result (single SELECT referencing all CTEs) ──
  SELECT jsonb_build_object(
    'total', (SELECT cnt FROM total_count),
    'limit', p_limit,
    'offset', p_offset,
    'sort', p_sort,
    'candidates', COALESCE(
      (SELECT jsonb_agg(
         jsonb_build_object(
           'id', wc.id,
           'full_name', wc.full_name,
           'adres_il', wc.adres_il,
           'telefon', wc.telefon,
           'email', wc.email,
           'is_actively_looking', wc.is_actively_looking,
           'updated_at', wc.updated_at,
           'son_pozisyon', wc.son_pozisyon,
           'son_sirket', wc.son_sirket,
           'son_marka', wc.son_marka,
           'toplam_deneyim_ay', wc.toplam_deneyim_ay,
           'halen_calisiyor', wc.halen_calisiyor,
           'profile_completion_pct', wc.profile_completion_pct,
           'musaitlik', wc.musaitlik,
           'calisma_tipleri', wc.calisma_tipleri,
           'maas_beklenti', wc.maas_beklenti,
           'segment', wc.first_exp_segment,
           'egitim_seviye', wc.first_edu_level,
           'diller', wc.dil_array,
           'match_score', wc.match_score,
           'match_reasons', wc.match_reasons,
           'experiences', wc.experiences,
           'education', wc.education,
           'languages', wc.languages
         )
       ) FROM with_children wc),
      '[]'::jsonb
    )
  ) INTO v_results;

  RETURN v_results;
END;
$$;


-- ═══════════════════════════════════════════════════════════════
-- Performance: Index support for hot filter paths
-- ═══════════════════════════════════════════════════════════════

-- Composite index on visibility predicates (base WHERE clause)
CREATE INDEX IF NOT EXISTS idx_candidates_visibility
  ON candidates (is_active, profile_completed, account_status)
  WHERE is_active = true AND account_status = 'active';

-- Partial index on actively looking (hot filter)
CREATE INDEX IF NOT EXISTS idx_candidates_actively_looking
  ON candidates (is_actively_looking)
  WHERE is_actively_looking = true AND is_active = true;

-- Index for blocked companies lookup
CREATE INDEX IF NOT EXISTS idx_blocked_companies_lookup
  ON candidate_blocked_companies (company_id, candidate_id);

-- Index for hide_from_current_employer experience check
CREATE INDEX IF NOT EXISTS idx_experiences_hide_check
  ON candidate_experiences (candidate_id, devam_ediyor)
  WHERE devam_ediyor = true;

-- Index for target role matching
CREATE INDEX IF NOT EXISTS idx_target_roles_matching
  ON candidate_target_roles (candidate_id, rol_unvani);


-- ═══════════════════════════════════════════════════════════════
-- END OF MIGRATION 045
-- Next: ik.html integration — replace loadLiveCandidates() with
-- search_employer_candidates() RPC call.
-- ═══════════════════════════════════════════════════════════════
