-- ═══════════════════════════════════════════════════════════════
-- HELLOTALENT — Migration 049: Visibility & search — id-first matching
-- Date: 2026-03-20
-- Type: RPC UPDATE + DATA BACKFILL
--
-- Changes:
--   1. search_employer_candidates: not_hidden CTE now checks
--      company_id/brand_id FIRST, falls back to text matching
--      for rows where ids are null (backward compatible).
--      Response keys aligned with ik.html mapper contract:
--        segment (not first_exp_segment)
--        egitim_seviye (not first_edu_level)
--        diller + languages (both present)
--   2. check_candidate_visible_to_employer: id-first matching
--      with text fallback, brands column → brand_name.
--   3. send_employer_message: id-first matching with text
--      fallback, brands column → brand_name.
--   4. Exact-match backfill: UNIQUE-match-only — skips when
--      multiple brands/companies share the same normalized name.
--   5. diller returns string[] (dil names), languages returns object[]
--      ({dil,seviye}) — no [object Object] in ik.html chips.
--
-- Safety:
--   - RPC is CREATE OR REPLACE (overwrites 045)
--   - Backfill only sets null→value, never overwrites existing ids
--   - Backfill skips ambiguous matches (count > 1)
--   - No rows deleted, no text columns modified
--
-- Depends on: 047 (FK columns exist), 048 (RPC writes ids)
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════
-- PART 1: Updated search_employer_candidates RPC
-- ═══════════════════════════════════════════════════

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
  -- ── Auth guard ──
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT hp.company_id INTO v_company_id
  FROM hr_profiles hp
  WHERE hp.id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employer profile not found — candidates cannot call this RPC';
  END IF;

  IF p_employer_company_id IS NOT NULL AND p_employer_company_id <> v_company_id THEN
    RAISE EXCEPTION 'Company ID mismatch — cannot search on behalf of another company';
  END IF;

  -- ── Extract filters from JSONB ──
  f_aktif_arayanlar := COALESCE((p_filters->>'aktifArayanlar')::boolean, false);
  f_sehir           := NULLIF(trim(p_filters->>'sehir'), '');
  f_exp_min         := COALESCE((p_filters->>'expMin')::int, 0);
  f_exp_max         := COALESCE((p_filters->>'expMax')::int, 99);

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

  -- ── Main query ──
  WITH
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

  not_blocked AS (
    SELECT v.*
    FROM visible v
    WHERE NOT EXISTS (
      SELECT 1 FROM candidate_blocked_companies cbc
      WHERE cbc.candidate_id = v.id
        AND cbc.company_id = v_company_id
    )
    OR v_company_id IS NULL
  ),

  -- id-first matching with text fallback for not_hidden
  employer_brand_ids AS (
    SELECT b.id AS brand_id
    FROM brands b WHERE b.company_id = v_company_id
  ),
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
             -- ID-first: check company_id or brand_id (fast, exact)
             ce.company_id = v_company_id
             OR ce.brand_id IN (SELECT brand_id FROM employer_brand_ids)
             -- Text fallback: for rows without ids (legacy data)
             OR (ce.company_id IS NULL AND ce.brand_id IS NULL AND (
               lower(trim(ce.sirket)) IN (SELECT n FROM employer_names)
               OR lower(trim(ce.marka)) IN (SELECT n FROM employer_names)
             ))
           )
       )
  ),

  with_prefs AS (
    SELECT nh.*,
           wp.musaitlik,
           wp.calisma_tipleri,
           wp.maas_beklenti
    FROM not_hidden nh
    LEFT JOIN candidate_work_preferences wp ON wp.candidate_id = nh.id
  ),

  -- Blocker 3 fix: alias as "segment" not "first_exp_segment" to match ik.html contract
  with_segment AS (
    SELECT wp.*,
           (SELECT ce.segment
            FROM candidate_experiences ce
            WHERE ce.candidate_id = wp.id
            ORDER BY ce.devam_ediyor DESC, ce.baslangic_yil DESC NULLS LAST, COALESCE(ce.baslangic_ay, 1) DESC
            LIMIT 1
           ) AS segment
    FROM with_prefs wp
  ),

  -- Blocker 3 fix: alias as "egitim_seviye" not "first_edu_level"
  with_edu AS (
    SELECT ws.*,
           (SELECT ed.egitim_seviye
            FROM candidate_education ed
            WHERE ed.candidate_id = ws.id
            ORDER BY ed.sira ASC
            LIMIT 1
           ) AS egitim_seviye
    FROM with_segment ws
  ),

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

  filtered AS (
    SELECT wl.*
    FROM with_langs wl
    WHERE
      (NOT f_aktif_arayanlar OR wl.is_actively_looking = true)
      AND (array_length(f_pozisyon, 1) IS NULL OR wl.son_pozisyon = ANY(f_pozisyon))
      AND (f_sehir IS NULL OR wl.adres_il = f_sehir)
      AND (COALESCE(wl.toplam_deneyim_ay, 0) / 12 >= f_exp_min)
      AND (COALESCE(wl.toplam_deneyim_ay, 0) / 12 <= f_exp_max)
      AND (array_length(f_segment, 1) IS NULL OR wl.segment = ANY(f_segment))
      AND (array_length(f_musait, 1) IS NULL OR wl.musaitlik = ANY(f_musait))
      AND (array_length(f_calisma, 1) IS NULL OR wl.calisma_tipleri && f_calisma)
      AND (array_length(f_egitim, 1) IS NULL OR wl.egitim_seviye = ANY(f_egitim))
      AND (array_length(f_dil, 1) IS NULL OR wl.dil_array && f_dil)
  ),

  scored AS (
    SELECT f.*,
      (
        (CASE WHEN f.is_actively_looking THEN 20 ELSE 0 END)
        + LEAST(ROUND(f.profile_completion_pct * 0.15)::int, 15)
        + (CASE
            WHEN f.updated_at >= now() - interval '30 days' THEN 20
            WHEN f.updated_at >= now() - interval '90 days' THEN 10
            ELSE 0
          END)
        + LEAST(ROUND(COALESCE(f.toplam_deneyim_ay, 0)::numeric / 12)::int, 10)
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
        + (CASE
            WHEN f.musaitlik = 'Hemen' THEN 10
            WHEN f.musaitlik = '2 Hafta İçinde' THEN 7
            WHEN f.musaitlik = '1 Ay İçinde' THEN 3
            ELSE 0
          END)
        + (CASE
            WHEN array_length(f_dil, 1) IS NOT NULL AND f.dil_array && f_dil THEN 10
            ELSE 0
          END)
      ) AS match_score,

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

  sorted AS (
    SELECT s.*
    FROM scored s
    ORDER BY
      CASE WHEN p_sort = 'relevance'    THEN s.match_score END DESC NULLS LAST,
      CASE WHEN p_sort = 'newest'       THEN s.updated_at END DESC NULLS LAST,
      CASE WHEN p_sort = 'exp_asc'      THEN s.toplam_deneyim_ay END ASC NULLS LAST,
      CASE WHEN p_sort = 'exp_desc'     THEN s.toplam_deneyim_ay END DESC NULLS LAST,
      s.match_score DESC NULLS LAST,
      s.updated_at DESC NULLS LAST
  ),

  total_count AS (
    SELECT count(*) AS cnt FROM scored
  ),

  page AS (
    SELECT * FROM sorted
    LIMIT p_limit OFFSET p_offset
  ),

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
      p.segment,
      p.egitim_seviye,
      p.dil_array,
      p.match_score,
      p.match_reasons,

      COALESCE(
        (SELECT jsonb_agg(
           jsonb_build_object(
             'sirket', ce.sirket, 'marka', ce.marka, 'pozisyon', ce.pozisyon,
             'sektor', ce.sektor, 'segment', ce.segment, 'departman', ce.departman,
             'istihdam_tipi', ce.istihdam_tipi, 'kidem_seviyesi', ce.kidem_seviyesi,
             'baslangic_ay', ce.baslangic_ay, 'baslangic_yil', ce.baslangic_yil,
             'bitis_ay', ce.bitis_ay, 'bitis_yil', ce.bitis_yil,
             'devam_ediyor', ce.devam_ediyor, 'sehir', ce.sehir,
             'rol_ailesi', ce.rol_ailesi, 'rol_unvani', ce.rol_unvani,
             'company_id', ce.company_id, 'brand_id', ce.brand_id
           ) ORDER BY ce.devam_ediyor DESC, ce.baslangic_yil DESC NULLS LAST
         )
         FROM candidate_experiences ce WHERE ce.candidate_id = p.id
        ), '[]'::jsonb
      ) AS experiences,

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

      -- diller_names: string[] for ik.html chip display (via dil_array from CTE)
      -- diller_objects: object[] {dil,seviye} for detailed language view
      COALESCE(
        (SELECT jsonb_agg(
           jsonb_build_object('dil', cl.dil, 'seviye', cl.seviye)
           ORDER BY cl.sira ASC
         )
         FROM candidate_languages cl WHERE cl.candidate_id = p.id
        ), '[]'::jsonb
      ) AS diller_objects

    FROM page p
  )

  SELECT jsonb_build_object(
    'total', (SELECT cnt FROM total_count),
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
          'segment', wc.segment,
          'egitim_seviye', wc.egitim_seviye,
          'match_score', wc.match_score,
          'match_reasons', wc.match_reasons,
          'experiences', wc.experiences,
          'education', wc.education,
          'diller', to_jsonb(wc.dil_array),
          'languages', wc.diller_objects
        )
      ) FROM with_children wc),
      '[]'::jsonb
    )
  ) INTO v_results;

  RETURN v_results;
END;
$$;


-- ═══════════════════════════════════════════════════
-- PART 2: check_candidate_visible_to_employer — id-first
-- (replaces 032 version, fixes b.name → brand_name)
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_candidate_visible_to_employer(p_candidate_id bigint)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id bigint;
  v_candidate record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN false; END IF;

  SELECT company_id INTO v_company_id
  FROM hr_profiles WHERE id = v_user_id;
  IF v_company_id IS NULL THEN RETURN false; END IF;

  SELECT id, is_active, profile_completed, hide_from_current_employer
  INTO v_candidate
  FROM candidates WHERE id = p_candidate_id;

  IF v_candidate IS NULL THEN RETURN false; END IF;
  IF NOT v_candidate.is_active THEN RETURN false; END IF;
  IF NOT v_candidate.profile_completed THEN RETURN false; END IF;

  -- Blocked check
  IF EXISTS (
    SELECT 1 FROM candidate_blocked_companies
    WHERE candidate_id = p_candidate_id AND company_id = v_company_id
  ) THEN
    RETURN false;
  END IF;

  -- Hide from current employer: id-first with text fallback
  IF v_candidate.hide_from_current_employer THEN
    IF EXISTS (
      SELECT 1 FROM candidate_experiences ce
      WHERE ce.candidate_id = p_candidate_id
        AND ce.devam_ediyor = true
        AND (
          -- ID-first
          ce.company_id = v_company_id
          OR ce.brand_id IN (SELECT b.id FROM brands b WHERE b.company_id = v_company_id)
          -- Text fallback for legacy rows
          OR (ce.company_id IS NULL AND ce.brand_id IS NULL AND (
            EXISTS (
              SELECT 1 FROM brands b
              WHERE b.company_id = v_company_id
                AND (lower(trim(ce.marka)) = lower(trim(b.brand_name))
                  OR lower(trim(ce.sirket)) = lower(trim(b.brand_name)))
            )
            OR EXISTS (
              SELECT 1 FROM companies co
              WHERE co.id = v_company_id
                AND (lower(trim(ce.sirket)) = lower(trim(co.company_name))
                  OR lower(trim(ce.marka)) = lower(trim(co.company_name)))
            )
          ))
        )
    ) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;


-- ═══════════════════════════════════════════════════
-- PART 3: send_employer_message — id-first
-- (replaces 032 version, fixes b.name → brand_name)
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION send_employer_message(
  p_candidate_id bigint,
  p_subject text,
  p_body text,
  p_position_id bigint DEFAULT NULL,
  p_template_id bigint DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id bigint;
  v_msg_id bigint;
  v_candidate record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT company_id INTO v_company_id
  FROM hr_profiles WHERE id = v_user_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Employer not linked to a company';
  END IF;

  SELECT id, is_active, profile_completed, hide_from_current_employer
  INTO v_candidate
  FROM candidates WHERE id = p_candidate_id;

  IF v_candidate IS NULL THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  IF NOT v_candidate.is_active THEN
    RAISE EXCEPTION 'Candidate profile is not active';
  END IF;

  IF NOT v_candidate.profile_completed THEN
    RAISE EXCEPTION 'Candidate profile is not complete';
  END IF;

  -- Blocked check
  IF EXISTS (
    SELECT 1 FROM candidate_blocked_companies
    WHERE candidate_id = p_candidate_id
      AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Bu adaya mesaj gönderemezsiniz';
  END IF;

  -- Hide from current employer: id-first with text fallback
  IF v_candidate.hide_from_current_employer THEN
    IF EXISTS (
      SELECT 1 FROM candidate_experiences ce
      WHERE ce.candidate_id = p_candidate_id
        AND ce.devam_ediyor = true
        AND (
          -- ID-first
          ce.company_id = v_company_id
          OR ce.brand_id IN (SELECT b.id FROM brands b WHERE b.company_id = v_company_id)
          -- Text fallback for legacy rows
          OR (ce.company_id IS NULL AND ce.brand_id IS NULL AND (
            EXISTS (
              SELECT 1 FROM brands b
              WHERE b.company_id = v_company_id
                AND (lower(trim(ce.marka)) = lower(trim(b.brand_name))
                  OR lower(trim(ce.sirket)) = lower(trim(b.brand_name)))
            )
            OR EXISTS (
              SELECT 1 FROM companies co
              WHERE co.id = v_company_id
                AND (lower(trim(ce.sirket)) = lower(trim(co.company_name))
                  OR lower(trim(ce.marka)) = lower(trim(co.company_name)))
            )
          ))
        )
    ) THEN
      RAISE EXCEPTION 'Bu adaya mesaj gönderemezsiniz';
    END IF;
  END IF;

  -- Position check
  IF p_position_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM positions
      WHERE id = p_position_id AND company_id = v_company_id
    ) THEN
      RAISE EXCEPTION 'Position does not belong to your company';
    END IF;
  END IF;

  -- Insert message
  INSERT INTO employer_messages (sender_id, company_id, candidate_id, position_id, template_id, subject, body)
  VALUES (v_user_id, v_company_id, p_candidate_id, p_position_id, p_template_id, TRIM(p_subject), TRIM(p_body))
  RETURNING id INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;


-- ═══════════════════════════════════════════════════
-- PART 4: Unique-match-only backfill (safe)
-- ═══════════════════════════════════════════════════

-- Backfill candidate_experiences: brand_id where EXACTLY ONE brand matches
WITH unique_brands AS (
  SELECT lower(trim(brand_name)) AS norm_name, min(id) AS brand_id, min(company_id) AS company_id
  FROM brands
  WHERE brand_name IS NOT NULL
  GROUP BY lower(trim(brand_name))
  HAVING count(*) = 1
)
UPDATE candidate_experiences ce
SET brand_id = ub.brand_id,
    company_id = COALESCE(ce.company_id, ub.company_id)
FROM unique_brands ub
WHERE ce.brand_id IS NULL
  AND ce.marka IS NOT NULL
  AND lower(trim(ce.marka)) = ub.norm_name;

-- Backfill candidate_experiences: company_id where EXACTLY ONE company matches
-- Only for rows still missing company_id after brand backfill
WITH unique_companies AS (
  SELECT lower(trim(company_name)) AS norm_name, min(id) AS company_id
  FROM companies
  WHERE company_name IS NOT NULL
  GROUP BY lower(trim(company_name))
  HAVING count(*) = 1
)
UPDATE candidate_experiences ce
SET company_id = uc.company_id
FROM unique_companies uc
WHERE ce.company_id IS NULL
  AND ce.sirket IS NOT NULL
  AND lower(trim(ce.sirket)) = uc.norm_name;

-- Backfill candidate_brand_interests: brand_id where EXACTLY ONE brand matches
WITH unique_brands AS (
  SELECT lower(trim(brand_name)) AS norm_name, min(id) AS brand_id
  FROM brands
  WHERE brand_name IS NOT NULL
  GROUP BY lower(trim(brand_name))
  HAVING count(*) = 1
)
UPDATE candidate_brand_interests cbi
SET brand_id = ub.brand_id
FROM unique_brands ub
WHERE cbi.brand_id IS NULL
  AND cbi.marka IS NOT NULL
  AND lower(trim(cbi.marka)) = ub.norm_name;
