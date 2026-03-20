-- ════════════════════════════════════════════════════════════════
-- HelloTalent Phase 2 Data Quality Audit — Supabase SQL Editor
-- Tek seferde çalıştır, tüm sonuçlar NOTICE olarak döner.
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r RECORD;
  v_total int;
  v_match int;
  v_unmatch int;
  v_pct numeric;
BEGIN

-- ─── C1: sirket → companies/brands exact match rate ───
RAISE NOTICE '══════ C1: SIRKET EXACT MATCH RATE ══════';
WITH exp_companies AS (
  SELECT DISTINCT lower(trim(sirket)) AS sirket_norm
  FROM candidate_experiences
  WHERE sirket IS NOT NULL AND trim(sirket) <> ''
),
ref_names AS (
  SELECT lower(trim(company_name)) AS ref_norm FROM companies WHERE company_name IS NOT NULL
  UNION
  SELECT lower(trim(name)) FROM brands WHERE name IS NOT NULL
)
SELECT
  count(*) AS total,
  count(*) FILTER (WHERE rc.ref_norm IS NOT NULL) AS matched,
  count(*) FILTER (WHERE rc.ref_norm IS NULL) AS unmatched,
  round(100.0 * count(*) FILTER (WHERE rc.ref_norm IS NOT NULL) / NULLIF(count(*), 0), 1) AS pct
INTO r
FROM exp_companies ec
LEFT JOIN ref_names rc ON ec.sirket_norm = rc.ref_norm;

RAISE NOTICE 'Unique sirket values: %  |  Matched: %  |  Unmatched: %  |  Match rate: %%', r.total, r.matched, r.unmatched, r.pct;

-- ─── C2: Top 20 unmatched company names ───
RAISE NOTICE '';
RAISE NOTICE '══════ C2: TOP 20 UNMATCHED SIRKET ══════';
FOR r IN
  WITH ref_names AS (
    SELECT lower(trim(company_name)) AS ref_norm FROM companies WHERE company_name IS NOT NULL
    UNION
    SELECT lower(trim(name)) FROM brands WHERE name IS NOT NULL
  )
  SELECT
    ce.sirket AS original,
    count(DISTINCT ce.candidate_id) AS cand_count,
    count(*) AS exp_rows
  FROM candidate_experiences ce
  WHERE ce.sirket IS NOT NULL AND trim(ce.sirket) <> ''
    AND lower(trim(ce.sirket)) NOT IN (SELECT ref_norm FROM ref_names)
  GROUP BY ce.sirket
  ORDER BY cand_count DESC
  LIMIT 20
LOOP
  RAISE NOTICE '  % — % adayda, % deneyim satırı', r.original, r.cand_count, r.exp_rows;
END LOOP;

-- ─── C3: marka → brands exact match rate ───
RAISE NOTICE '';
RAISE NOTICE '══════ C3: MARKA EXACT MATCH RATE ══════';
WITH exp_brands AS (
  SELECT DISTINCT lower(trim(marka)) AS marka_norm
  FROM candidate_experiences
  WHERE marka IS NOT NULL AND trim(marka) <> ''
),
ref_brands AS (
  SELECT lower(trim(name)) AS ref_norm FROM brands WHERE name IS NOT NULL
)
SELECT
  count(*) AS total,
  count(*) FILTER (WHERE rb.ref_norm IS NOT NULL) AS matched,
  count(*) FILTER (WHERE rb.ref_norm IS NULL) AS unmatched,
  round(100.0 * count(*) FILTER (WHERE rb.ref_norm IS NOT NULL) / NULLIF(count(*), 0), 1) AS pct
INTO r
FROM exp_brands eb
LEFT JOIN ref_brands rb ON eb.marka_norm = rb.ref_norm;

RAISE NOTICE 'Unique marka values: %  |  Matched: %  |  Unmatched: %  |  Match rate: %%', r.total, r.matched, r.unmatched, r.pct;

-- ─── C4: Position fragmentation (top 25) ───
RAISE NOTICE '';
RAISE NOTICE '══════ C4: POSITION FRAGMENTATION (Top 25) ══════';
FOR r IN
  SELECT
    lower(trim(pozisyon)) AS poz_norm,
    count(DISTINCT candidate_id) AS cand_count,
    count(DISTINCT pozisyon) AS variant_count,
    string_agg(DISTINCT pozisyon, ' | ' ORDER BY pozisyon) AS variants
  FROM candidate_experiences
  WHERE pozisyon IS NOT NULL AND trim(pozisyon) <> ''
  GROUP BY lower(trim(pozisyon))
  ORDER BY cand_count DESC
  LIMIT 25
LOOP
  RAISE NOTICE '  [% aday, % varyant] % → %', r.cand_count, r.variant_count, r.poz_norm, r.variants;
END LOOP;

-- ─── C6: exp[0] (sira=0) vs latest/current experience ───
RAISE NOTICE '';
RAISE NOTICE '══════ C6: EXP[0] vs LATEST vs CURRENT ══════';
WITH first_exp AS (
  SELECT DISTINCT ON (candidate_id)
    candidate_id, pozisyon, sirket, marka
  FROM candidate_experiences
  ORDER BY candidate_id, sira ASC NULLS LAST
),
latest_exp AS (
  SELECT DISTINCT ON (candidate_id)
    candidate_id, pozisyon, sirket, marka
  FROM candidate_experiences
  ORDER BY candidate_id, baslangic_yil DESC NULLS LAST, baslangic_ay DESC NULLS LAST
),
current_exp AS (
  SELECT DISTINCT ON (candidate_id)
    candidate_id, pozisyon, sirket, marka
  FROM candidate_experiences
  WHERE devam_ediyor = true
  ORDER BY candidate_id, baslangic_yil DESC NULLS LAST
)
SELECT
  count(DISTINCT fe.candidate_id) AS total_with_exp,
  count(*) FILTER (WHERE ce.candidate_id IS NOT NULL) AS has_current,
  count(*) FILTER (WHERE fe.pozisyon IS NOT DISTINCT FROM le.pozisyon) AS first_eq_latest,
  count(*) FILTER (WHERE fe.pozisyon IS DISTINCT FROM le.pozisyon) AS first_ne_latest,
  round(100.0 * count(*) FILTER (WHERE fe.pozisyon IS NOT DISTINCT FROM le.pozisyon) / NULLIF(count(DISTINCT fe.candidate_id), 0), 1) AS first_eq_latest_pct
INTO r
FROM first_exp fe
LEFT JOIN latest_exp le ON le.candidate_id = fe.candidate_id
LEFT JOIN current_exp ce ON ce.candidate_id = fe.candidate_id;

RAISE NOTICE 'Candidates with exp: %  |  Has current (devam_ediyor): %', r.total_with_exp, r.has_current;
RAISE NOTICE 'sira=0 == latest: % (%%)  |  sira=0 != latest: %', r.first_eq_latest, r.first_eq_latest_pct, r.first_ne_latest;

-- ─── C6b: Derived columns vs exp[0] ───
RAISE NOTICE '';
RAISE NOTICE '══════ C6b: DERIVED COLUMNS FILL ══════';
SELECT
  count(*) AS total,
  count(*) FILTER (WHERE son_pozisyon IS NOT NULL AND trim(son_pozisyon) <> '') AS has_son_pozisyon,
  count(*) FILTER (WHERE son_sirket IS NOT NULL AND trim(son_sirket) <> '') AS has_son_sirket,
  count(*) FILTER (WHERE son_marka IS NOT NULL AND trim(son_marka) <> '') AS has_son_marka,
  count(*) FILTER (WHERE toplam_deneyim_ay IS NOT NULL AND toplam_deneyim_ay > 0) AS has_toplam_deneyim,
  count(*) FILTER (WHERE halen_calisiyor = true) AS halen_calisiyor_count
INTO r
FROM candidates
WHERE is_active = true;

RAISE NOTICE 'Active candidates: %', r.total;
RAISE NOTICE 'son_pozisyon filled: %  |  son_sirket: %  |  son_marka: %', r.has_son_pozisyon, r.has_son_sirket, r.has_son_marka;
RAISE NOTICE 'toplam_deneyim_ay > 0: %  |  halen_calisiyor: %', r.has_toplam_deneyim, r.halen_calisiyor_count;

-- ─── C7: Phone format + verified rate ───
RAISE NOTICE '';
RAISE NOTICE '══════ C7: PHONE FORMAT + VERIFIED ══════';
SELECT
  count(*) AS total,
  count(*) FILTER (WHERE telefon IS NULL OR trim(telefon) = '') AS no_phone,
  count(*) FILTER (WHERE telefon IS NOT NULL AND trim(telefon) <> '') AS has_phone,
  count(*) FILTER (WHERE telefon ~ '^\+?0?5[0-9]{2}[- ]?[0-9]{3}[- ]?[0-9]{2}[- ]?[0-9]{2}$') AS valid_mobile,
  count(*) FILTER (
    WHERE telefon IS NOT NULL AND trim(telefon) <> ''
    AND telefon !~ '^\+?0?5[0-9]{2}[- ]?[0-9]{3}[- ]?[0-9]{2}[- ]?[0-9]{2}$'
  ) AS invalid_format,
  count(*) FILTER (WHERE phone_verified = true) AS verified
INTO r
FROM candidates WHERE is_active = true;

RAISE NOTICE 'Total active: %  |  No phone: %  |  Has phone: %', r.total, r.no_phone, r.has_phone;
RAISE NOTICE 'Valid TR mobile format: %  |  Invalid format: %  |  Verified: %', r.valid_mobile, r.invalid_format, r.verified;

-- ─── C8: LinkedIn URL format ───
RAISE NOTICE '';
RAISE NOTICE '══════ C8: LINKEDIN URL FORMAT ══════';
SELECT
  count(*) AS total,
  count(*) FILTER (WHERE linkedin IS NULL OR trim(linkedin) = '') AS no_linkedin,
  count(*) FILTER (WHERE linkedin IS NOT NULL AND trim(linkedin) <> '') AS has_linkedin,
  count(*) FILTER (WHERE linkedin ~* '^https?://(www\.)?linkedin\.com/in/[a-z0-9_\-]+/?') AS valid_url,
  count(*) FILTER (
    WHERE linkedin IS NOT NULL AND trim(linkedin) <> ''
    AND linkedin !~* '^https?://(www\.)?linkedin\.com/in/[a-z0-9_\-]+/?'
  ) AS invalid_url
INTO r
FROM candidates WHERE is_active = true;

RAISE NOTICE 'Total: %  |  No LinkedIn: %  |  Has LinkedIn: %', r.total, r.no_linkedin, r.has_linkedin;
RAISE NOTICE 'Valid URL: %  |  Invalid URL: %', r.valid_url, r.invalid_url;

-- Show invalid samples
RAISE NOTICE 'Invalid samples:';
FOR r IN
  SELECT linkedin
  FROM candidates
  WHERE is_active = true AND linkedin IS NOT NULL AND trim(linkedin) <> ''
    AND linkedin !~* '^https?://(www\.)?linkedin\.com/in/[a-z0-9_\-]+/?'
  LIMIT 5
LOOP
  RAISE NOTICE '  → %', r.linkedin;
END LOOP;

-- ─── C9: Structured preference fill rates ───
RAISE NOTICE '';
RAISE NOTICE '══════ C9: PREFERENCE FILL RATES ══════';
DECLARE
  v_visible int;
BEGIN
  SELECT count(*) INTO v_visible FROM candidates
  WHERE is_active = true AND (profile_completed = true OR profile_completion_pct >= 45);

  RAISE NOTICE 'Visible candidates (active + >=45%%): %', v_visible;

  -- work_preferences
  SELECT
    count(*) FILTER (WHERE wp.musaitlik IS NOT NULL) AS has_musaitlik,
    count(*) FILTER (WHERE wp.calisma_tipleri IS NOT NULL AND array_length(wp.calisma_tipleri, 1) > 0) AS has_calisma,
    count(*) FILTER (WHERE wp.maas_beklenti IS NOT NULL AND wp.maas_beklenti <> '') AS has_maas,
    count(*) FILTER (WHERE wp.career_goal IS NOT NULL AND trim(wp.career_goal) <> '') AS has_career_goal,
    count(*) FILTER (WHERE wp.career_type IS NOT NULL AND wp.career_type <> '') AS has_career_type,
    count(*) FILTER (WHERE wp.segmentler IS NOT NULL AND array_length(wp.segmentler, 1) > 0) AS has_segmentler
  INTO r
  FROM candidates c
  LEFT JOIN candidate_work_preferences wp ON wp.candidate_id = c.id
  WHERE c.is_active = true AND (c.profile_completed = true OR c.profile_completion_pct >= 45);

  RAISE NOTICE 'musaitlik: %  |  calisma_tipleri: %  |  maas: %', r.has_musaitlik, r.has_calisma, r.has_maas;
  RAISE NOTICE 'career_goal: %  |  career_type: %  |  segmentler: %', r.has_career_goal, r.has_career_type, r.has_segmentler;

  -- child tables
  FOR r IN
    SELECT 'target_roles' AS tbl, count(DISTINCT candidate_id) AS cnt FROM candidate_target_roles WHERE candidate_id IN (SELECT id FROM candidates WHERE is_active = true AND (profile_completed = true OR profile_completion_pct >= 45))
    UNION ALL
    SELECT 'brand_interests', count(DISTINCT candidate_id) FROM candidate_brand_interests WHERE candidate_id IN (SELECT id FROM candidates WHERE is_active = true AND (profile_completed = true OR profile_completion_pct >= 45))
    UNION ALL
    SELECT 'location_prefs', count(DISTINCT candidate_id) FROM candidate_location_preferences WHERE candidate_id IN (SELECT id FROM candidates WHERE is_active = true AND (profile_completed = true OR profile_completion_pct >= 45))
    UNION ALL
    SELECT 'competencies', count(DISTINCT candidate_id) FROM candidate_competencies WHERE candidate_id IN (SELECT id FROM candidates WHERE is_active = true AND (profile_completed = true OR profile_completion_pct >= 45))
    UNION ALL
    SELECT 'experiences', count(DISTINCT candidate_id) FROM candidate_experiences WHERE candidate_id IN (SELECT id FROM candidates WHERE is_active = true AND (profile_completed = true OR profile_completion_pct >= 45))
    UNION ALL
    SELECT 'education', count(DISTINCT candidate_id) FROM candidate_education WHERE candidate_id IN (SELECT id FROM candidates WHERE is_active = true AND (profile_completed = true OR profile_completion_pct >= 45))
    UNION ALL
    SELECT 'languages', count(DISTINCT candidate_id) FROM candidate_languages WHERE candidate_id IN (SELECT id FROM candidates WHERE is_active = true AND (profile_completed = true OR profile_completion_pct >= 45))
    ORDER BY tbl
  LOOP
    RAISE NOTICE '  %: % / %  (%% )', r.tbl, r.cnt, v_visible, round(100.0 * r.cnt / NULLIF(v_visible, 0), 1);
  END LOOP;
END;

-- ─── C10: Target role taxonomy coverage ───
RAISE NOTICE '';
RAISE NOTICE '══════ C10: TARGET ROLE TAXONOMY ══════';
RAISE NOTICE 'C10a — rol_ailesi distribution:';
FOR r IN
  SELECT rol_ailesi, count(*) AS rows, count(DISTINCT candidate_id) AS cands
  FROM candidate_target_roles
  GROUP BY rol_ailesi
  ORDER BY cands DESC
LOOP
  RAISE NOTICE '  %: % aday, % satır', r.rol_ailesi, r.cands, r.rows;
END LOOP;

RAISE NOTICE '';
RAISE NOTICE 'C10b — rol_unvani fragmentation (top 15):';
FOR r IN
  SELECT
    lower(trim(rol_unvani)) AS norm,
    count(DISTINCT rol_unvani) AS variants,
    count(DISTINCT candidate_id) AS cands,
    string_agg(DISTINCT rol_unvani, ' | ' ORDER BY rol_unvani) AS variant_list
  FROM candidate_target_roles
  WHERE rol_unvani IS NOT NULL AND trim(rol_unvani) <> ''
  GROUP BY lower(trim(rol_unvani))
  ORDER BY cands DESC
  LIMIT 15
LOOP
  RAISE NOTICE '  [% aday, % varyant] % → %', r.cands, r.variants, r.norm, r.variant_list;
END LOOP;

-- ─── C13: Hide from current employer reliability ───
RAISE NOTICE '';
RAISE NOTICE '══════ C13: HIDE-FROM-EMPLOYER RELIABILITY ══════';
WITH hidden AS (
  SELECT id FROM candidates WHERE hide_from_current_employer = true AND is_active = true
),
current_exps AS (
  SELECT ce.candidate_id, ce.sirket, ce.marka
  FROM candidate_experiences ce
  WHERE ce.devam_ediyor = true AND ce.candidate_id IN (SELECT id FROM hidden)
),
ref_names AS (
  SELECT lower(trim(company_name)) AS ref_norm FROM companies WHERE company_name IS NOT NULL
  UNION
  SELECT lower(trim(name)) FROM brands WHERE name IS NOT NULL
)
SELECT
  (SELECT count(*) FROM hidden) AS hidden_total,
  count(DISTINCT ce.candidate_id) AS hidden_with_current_exp,
  count(*) FILTER (
    WHERE lower(trim(ce.sirket)) IN (SELECT ref_norm FROM ref_names)
       OR (ce.marka IS NOT NULL AND lower(trim(ce.marka)) IN (SELECT ref_norm FROM ref_names))
  ) AS matchable,
  count(*) FILTER (
    WHERE lower(trim(ce.sirket)) NOT IN (SELECT ref_norm FROM ref_names)
      AND (ce.marka IS NULL OR lower(trim(ce.marka)) NOT IN (SELECT ref_norm FROM ref_names))
  ) AS unmatchable
INTO r
FROM current_exps ce;

RAISE NOTICE 'Hidden candidates: %  |  With current exp: %', r.hidden_total, r.hidden_with_current_exp;
RAISE NOTICE 'Matchable (sirket/marka in ref tables): %  |  Unmatchable (text-only): %', r.matchable, r.unmatchable;

IF r.unmatchable > 0 THEN
  RAISE NOTICE 'UNMATCHABLE samples (sirket not in companies/brands):';
  FOR r IN
    SELECT ce.sirket, ce.marka
    FROM candidate_experiences ce
    WHERE ce.devam_ediyor = true
      AND ce.candidate_id IN (SELECT id FROM candidates WHERE hide_from_current_employer = true AND is_active = true)
      AND lower(trim(ce.sirket)) NOT IN (
        SELECT lower(trim(company_name)) FROM companies WHERE company_name IS NOT NULL
        UNION SELECT lower(trim(name)) FROM brands WHERE name IS NOT NULL
      )
      AND (ce.marka IS NULL OR lower(trim(ce.marka)) NOT IN (
        SELECT lower(trim(name)) FROM brands WHERE name IS NOT NULL
      ))
    LIMIT 5
  LOOP
    RAISE NOTICE '  → sirket: %  |  marka: %', r.sirket, r.marka;
  END LOOP;
END IF;

-- ─── C14: Collected but unused fields inventory ───
RAISE NOTICE '';
RAISE NOTICE '══════ C14: COLLECTED-BUT-UNUSED FILL RATES ══════';
FOR r IN
  WITH vis AS (
    SELECT id FROM candidates WHERE is_active = true AND (profile_completed = true OR profile_completion_pct >= 45)
  ),
  total AS (SELECT count(*) AS n FROM vis)
  SELECT 'candidate_target_roles' AS tbl,
    count(DISTINCT tr.candidate_id) AS filled,
    (SELECT n FROM total) AS total,
    round(100.0 * count(DISTINCT tr.candidate_id) / (SELECT n FROM total), 1) AS pct
  FROM candidate_target_roles tr WHERE tr.candidate_id IN (SELECT id FROM vis)
  UNION ALL
  SELECT 'candidate_brand_interests',
    count(DISTINCT bi.candidate_id), (SELECT n FROM total),
    round(100.0 * count(DISTINCT bi.candidate_id) / (SELECT n FROM total), 1)
  FROM candidate_brand_interests bi WHERE bi.candidate_id IN (SELECT id FROM vis)
  UNION ALL
  SELECT 'candidate_location_prefs',
    count(DISTINCT lp.candidate_id), (SELECT n FROM total),
    round(100.0 * count(DISTINCT lp.candidate_id) / (SELECT n FROM total), 1)
  FROM candidate_location_preferences lp WHERE lp.candidate_id IN (SELECT id FROM vis)
  UNION ALL
  SELECT 'candidate_competencies',
    count(DISTINCT cc.candidate_id), (SELECT n FROM total),
    round(100.0 * count(DISTINCT cc.candidate_id) / (SELECT n FROM total), 1)
  FROM candidate_competencies cc WHERE cc.candidate_id IN (SELECT id FROM vis)
  UNION ALL
  SELECT 'work_prefs.career_goal',
    count(DISTINCT wp.candidate_id), (SELECT n FROM total),
    round(100.0 * count(DISTINCT wp.candidate_id) / (SELECT n FROM total), 1)
  FROM candidate_work_preferences wp
  WHERE wp.candidate_id IN (SELECT id FROM vis)
    AND wp.career_goal IS NOT NULL AND trim(wp.career_goal) <> ''
  ORDER BY pct DESC
LOOP
  RAISE NOTICE '  %: % / % (%% fill)', r.tbl, r.filled, r.total, r.pct;
END LOOP;

-- ─── BONUS: candidate_experiences.rol_ailesi column check ───
RAISE NOTICE '';
RAISE NOTICE '══════ BONUS: ROL_AILESI COLUMN CHECK ══════';
-- Check if column exists
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'candidate_experiences' AND column_name = 'rol_ailesi'
) THEN
  RAISE NOTICE 'rol_ailesi column EXISTS in candidate_experiences';
  SELECT
    count(*) AS total_exp,
    count(*) FILTER (WHERE rol_ailesi IS NOT NULL AND trim(rol_ailesi) <> '') AS has_rol_ailesi
  INTO r
  FROM candidate_experiences;
  RAISE NOTICE 'Total experiences: %  |  With rol_ailesi filled: %', r.total_exp, r.has_rol_ailesi;
ELSE
  RAISE NOTICE 'rol_ailesi column DOES NOT EXIST in candidate_experiences';
  RAISE NOTICE 'Frontend collectExperiences() sends rol_ailesi but DB has no column — data silently dropped';
END IF;

-- Also check sektor column
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'candidate_experiences' AND column_name = 'sektor'
) THEN
  SELECT
    count(*) AS total_exp,
    count(*) FILTER (WHERE sektor IS NOT NULL AND trim(sektor) <> '') AS has_sektor
  INTO r
  FROM candidate_experiences;
  RAISE NOTICE 'sektor column EXISTS — Total: %  |  Filled: %', r.total_exp, r.has_sektor;
ELSE
  RAISE NOTICE 'sektor column DOES NOT EXIST in candidate_experiences';
END IF;

RAISE NOTICE '';
RAISE NOTICE '══════ AUDIT COMPLETE ══════';

END $$;
